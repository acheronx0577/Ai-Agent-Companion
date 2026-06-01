"""Phase 3 Convex user sync checks (stdlib unittest)."""

import json
import shutil
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ConvexPhase3LayoutTests(unittest.TestCase):
    def test_user_sync_files_exist(self):
        for rel in (
            "convex/userSync.ts",
            "convex/usersInfo.ts",
            "static/convex_auth_test.mjs",
            "static/convex_client_api.js",
        ):
            self.assertTrue((ROOT / rel).is_file(), rel)

    def test_users_exports_me_and_upsert(self):
        users = (ROOT / "convex" / "users.ts").read_text(encoding="utf-8")
        self.assertIn("export const me", users)
        self.assertIn("export const upsertFromAuth", users)

    def test_verify_script_exits_zero(self):
        result = subprocess.run(
            ["node", "scripts/verify_convex_phase3.mjs"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

    def test_convex_auth_test_passes_convex_url(self):
        app_py = (ROOT / "app.py").read_text(encoding="utf-8")
        self.assertIn("CONVEX_URL", app_py)
        template = (ROOT / "templates" / "convex_auth_test.html").read_text(
            encoding="utf-8"
        )
        self.assertIn("data-convex-url", template)


class ConvexPhase3RuntimeTests(unittest.TestCase):
    @unittest.skipUnless(
        (ROOT / ".env.local").exists() and shutil.which("npx"),
        "requires .env.local and npx",
    )
    def test_phase3_status_query(self):
        command = "npx convex run usersInfo:phase3Status"
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
        self.assertEqual(data.get("phase"), 3)
        self.assertIn("users.me", data.get("functions", []))

    @unittest.skipUnless(
        (ROOT / ".env.local").exists() and shutil.which("npx"),
        "requires .env.local and npx",
    )
    def test_bootstrap_ping_reports_phase_3(self):
        command = "npx convex run users:bootstrapPing"
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
        self.assertEqual(data.get("phase"), 3)


if __name__ == "__main__":
    unittest.main()
