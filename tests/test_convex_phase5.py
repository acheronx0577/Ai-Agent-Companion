"""Phase 5 Convex frontend bridge checks (stdlib unittest)."""

import json
import shutil
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


class ConvexPhase5LayoutTests(unittest.TestCase):
    """Static layout checks for Phase 5 frontend bridge."""

    def test_phase5_files_exist(self):
        for rel in (
            "static/convex_bridge.js",
            "frontend/convex_bridge.jsx",
            "convex/frontendInfo.ts",
            "scripts/verify_convex_phase5.mjs",
        ):
            self.assertTrue((ROOT / rel).is_file(), rel)

    def test_index_injects_convex_bridge_config(self):
        template = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
        self.assertIn("data-convex-url", template)
        self.assertIn("convex_bridge.js", template)

    def test_verify_script_exits_zero(self):
        result = subprocess.run(
            ["node", "scripts/verify_convex_phase5.mjs"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)


class ConvexPhase5FlaskTests(unittest.TestCase):
    """Flask session bridge for Convex Auth until Phase 6."""

    @patch("convex_usage.fetch_verified_profile_via_convex")
    def test_convex_bridge_sets_server_verified_session(self, fetch_profile):
        from app import app

        fetch_profile.return_value = {
            "id": "convex|google-test-sub",
            "email": "test@example.com",
            "name": "Test User",
        }
        client = app.test_client()
        response = client.post(
            "/auth/convex-bridge",
            headers={"Authorization": "Bearer signed-convex-token"},
            json={"name": "Forged Name"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("authenticated"))
        self.assertEqual(data["user"]["id"], "convex|google-test-sub")
        self.assertEqual(data["user"]["name"], "Test User")
        fetch_profile.assert_called_once_with("signed-convex-token")

    def test_convex_bridge_requires_bearer_token(self):
        from app import app

        client = app.test_client()
        response = client.post("/auth/convex-bridge", json={"googleSub": "forged"})
        self.assertEqual(response.status_code, 401)


class ConvexPhase5RuntimeTests(unittest.TestCase):
    """Convex CLI query for Phase 5 status."""

    @unittest.skipUnless(
        (ROOT / ".env.local").exists() and shutil.which("npx"),
        "requires .env.local and npx",
    )
    def test_phase5_status_query(self):
        command = "npx convex run frontendInfo:phase5Status"
        result = subprocess.run(
            command if sys.platform == "win32" else command.split(),
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
            shell=sys.platform == "win32",
        )
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        data = json.loads(result.stdout.strip())
        self.assertEqual(data.get("phase"), 5)
        self.assertIn("usage.status", data.get("functions", []))


if __name__ == "__main__":
    unittest.main()
