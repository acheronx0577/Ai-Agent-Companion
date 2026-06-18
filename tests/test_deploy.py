"""Deploy smoke tests (stdlib unittest)."""

import os
import unittest
from unittest import mock


class DeployHealthTests(unittest.TestCase):
    def setUp(self):
        os.environ.setdefault("GROQ_API_KEY", "test-key-for-health-check")
        from app import app

        self.client = app.test_client()

    def test_health_returns_200(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)

    def test_health_json_shape(self):
        data = self.client.get("/health").get_json()
        self.assertEqual(data.get("status"), "ok")
        self.assertIn("chatConfigured", data)
        self.assertIn("googleOAuthConfigured", data)
        self.assertIn("piper", data)

    def test_index_returns_200(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_guest_index_renders_landing_page(self):
        response = self.client.get("/")
        self.assertIn(b'class="landing-body"', response.data)
        self.assertNotIn(b'class="app-shell', response.data)
        self.assertIn(b'href="/app-preview"', response.data)

    def test_authenticated_index_renders_companion_app(self):
        with self.client.session_transaction() as flask_session:
            flask_session["user"] = {
                "id": "google:test-user",
                "googleSub": "test-user",
                "email": "test@example.com",
                "name": "Test User",
            }
        response = self.client.get("/")
        self.assertIn(b'class="app-shell', response.data)
        self.assertNotIn(b'class="landing-body"', response.data)
        self.assertIn(b'class="app-home-link" href="/home"', response.data)

    def test_authenticated_user_can_open_public_homepage(self):
        with self.client.session_transaction() as flask_session:
            flask_session["user"] = {
                "id": "google:test-user",
                "googleSub": "test-user",
                "email": "test@example.com",
                "name": "Test User",
            }
        response = self.client.get("/home")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'class="landing-body"', response.data)
        self.assertNotIn(b'class="app-shell', response.data)

    def test_app_preview_is_disabled_in_production(self):
        with mock.patch.dict(os.environ, {"PRODUCTION": "1"}, clear=False):
            response = self.client.get("/app-preview")
        self.assertEqual(response.status_code, 404)

    def test_production_landing_hides_app_preview_link(self):
        with mock.patch.dict(os.environ, {"PRODUCTION": "1"}, clear=False):
            response = self.client.get("/")
        self.assertNotIn(b'href="/app-preview"', response.data)


class DeployEnvScriptTests(unittest.TestCase):
    def test_check_deploy_env_script_imports(self):
        import importlib.util
        from pathlib import Path

        script = Path(__file__).resolve().parents[1] / "scripts" / "check_deploy_env.py"
        spec = importlib.util.spec_from_file_location("check_deploy_env", script)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        self.assertTrue(callable(module.main))


if __name__ == "__main__":
    unittest.main()
