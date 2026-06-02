"""Security regression tests for authenticated Flask API boundaries."""

import os
import unittest
from unittest.mock import patch

from wakuwaku.request_security import check_rate_limit, clear_rate_limits


class SecurityRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        previous_disable_piper = os.environ.get("DISABLE_PIPER")
        os.environ["DISABLE_PIPER"] = "1"
        try:
            from app import app
        finally:
            if previous_disable_piper is None:
                os.environ.pop("DISABLE_PIPER", None)
            else:
                os.environ["DISABLE_PIPER"] = previous_disable_piper

        cls.app = app

    def setUp(self):
        clear_rate_limits()
        self.client = self.app.test_client()

    def sign_in(self, user_id="test-user"):
        with self.client.session_transaction() as flask_session:
            flask_session["user"] = {"id": user_id, "name": "Test User"}

    def test_forged_convex_profile_without_token_is_rejected(self):
        response = self.client.post(
            "/auth/convex-bridge",
            json={"googleSub": "attacker", "name": "Forged User"},
        )
        self.assertEqual(response.status_code, 401)

    def test_anonymous_tts_is_rejected_before_synthesis(self):
        with patch("app.get_piper_voice") as get_voice:
            response = self.client.post("/tts", json={"text": "hello"})
        self.assertEqual(response.status_code, 401)
        get_voice.assert_not_called()

    def test_anonymous_voice_warmup_is_rejected(self):
        response = self.client.post("/voices/warmup", json={})
        self.assertEqual(response.status_code, 401)

    @patch("wakuwaku.convex_usage.fetch_verified_profile_via_convex")
    def test_convex_bearer_restores_flask_session_for_protected_route(
        self, fetch_profile
    ):
        fetch_profile.return_value = {"id": "convex|verified-user"}
        response = self.client.post(
            "/tts",
            headers={"Authorization": "Bearer signed-convex-token"},
            json={},
        )
        self.assertEqual(response.status_code, 400)
        fetch_profile.assert_called_once_with("signed-convex-token")
        with self.client.session_transaction() as flask_session:
            self.assertEqual(flask_session["user"]["id"], "convex|verified-user")

    def test_tts_text_has_character_limit(self):
        self.sign_in()
        with patch("app.get_piper_voice") as get_voice:
            response = self.client.post("/tts", json={"text": "x" * 2001})
        self.assertEqual(response.status_code, 400)
        get_voice.assert_not_called()

    def test_cross_origin_logout_is_rejected(self):
        self.sign_in()
        response = self.client.post(
            "/auth/logout", headers={"Origin": "https://attacker.example"}
        )
        self.assertEqual(response.status_code, 403)

    def test_chat_session_id_is_validated(self):
        self.sign_in()
        response = self.client.post(
            "/chat", json={"message": "hello", "session_id": "../shared"}
        )
        self.assertEqual(response.status_code, 400)

    def test_chat_provider_session_is_namespaced_by_verified_user(self):
        self.sign_in("verified-user")
        with (
            patch("app.character_exists", True),
            patch("app.chat_backend_configured", return_value=True),
            patch("app.chat_provider", return_value="groq"),
            patch("app.iter_chat_with_groq", return_value=iter(["hello"])) as stream,
            patch("app.convex_usage.use_convex_usage", return_value=False),
            patch("app.increment_usage_for_current_request", return_value={}),
            patch(
                "app.usage_status_for_current_request",
                return_value={"allowed": True},
            ),
        ):
            response = self.client.post(
                "/chat/stream", json={"message": "hello", "session_id": "shared"}
            )
            response.get_data()
        self.assertEqual(response.status_code, 200)
        provider_session_id = stream.call_args.args[0]
        self.assertNotEqual(provider_session_id, "shared")
        self.assertTrue(provider_session_id.endswith(":shared"))

    def test_production_headers_and_debug_route(self):
        with patch.dict(os.environ, {"PRODUCTION": "1"}, clear=False):
            response = self.client.get("/")
            debug_response = self.client.get("/convex-auth-test")
        self.assertIn("default-src 'self'", response.headers["Content-Security-Policy"])
        self.assertEqual(response.headers["X-Frame-Options"], "DENY")
        self.assertIn("max-age=31536000", response.headers["Strict-Transport-Security"])
        self.assertEqual(debug_response.status_code, 404)

    def test_rate_limit_cleanup_preserves_each_scope_window(self):
        with patch("wakuwaku.request_security.monotonic", side_effect=[0, 61, 62]):
            with self.app.test_request_context(
                environ_base={"REMOTE_ADDR": "127.0.0.9"}
            ):
                first_auth = check_rate_limit(
                    "auth", max_requests=1, window_seconds=300
                )
            with self.app.test_request_context(
                environ_base={"REMOTE_ADDR": "127.0.0.9"}
            ):
                other_scope = check_rate_limit(
                    "chat", max_requests=1, window_seconds=60
                )
            with self.app.test_request_context(
                environ_base={"REMOTE_ADDR": "127.0.0.9"}
            ):
                second_auth = check_rate_limit(
                    "auth", max_requests=1, window_seconds=300
                )
        self.assertTrue(first_auth.allowed)
        self.assertTrue(other_scope.allowed)
        self.assertFalse(second_auth.allowed)


if __name__ == "__main__":
    unittest.main()
