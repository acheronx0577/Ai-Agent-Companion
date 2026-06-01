"""Phase 2 Convex Auth checks (stdlib unittest)."""

import json
import shutil
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ConvexPhase2LayoutTests(unittest.TestCase):
    def test_auth_files_exist(self):
        for rel in (
            "convex/auth.ts",
            "convex/auth.config.ts",
            "convex/authInfo.ts",
            "CONVEX_AUTH.md",
            "templates/convex_auth_test.html",
        ):
            self.assertTrue((ROOT / rel).is_file(), rel)

    def test_http_registers_auth_routes(self):
        http = (ROOT / "convex" / "http.ts").read_text(encoding="utf-8")
        self.assertIn("auth.addHttpRoutes", http)

    def test_schema_includes_auth_tables(self):
        schema = (ROOT / "convex" / "schema.ts").read_text(encoding="utf-8")
        self.assertIn("authTables", schema)
        self.assertIn("dailyUsage", schema)

    def test_verify_script_exits_zero(self):
        result = subprocess.run(
            ["node", "scripts/verify_convex_phase2.mjs"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

    def test_convex_auth_test_route(self):
        app_py = (ROOT / "app.py").read_text(encoding="utf-8")
        self.assertIn("/convex-auth-test", app_py)


class ConvexPhase2RuntimeTests(unittest.TestCase):
    @unittest.skipUnless(
        (ROOT / ".env.local").exists() and shutil.which("npx"),
        "requires .env.local and npx",
    )
    def test_phase2_status_query(self):
        command = "npx convex run authInfo:phase2Status"
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
        self.assertEqual(data.get("phase"), 2)
        self.assertEqual(data.get("provider"), "google")
        self.assertIn("authSessions", data.get("authTables", []))


if __name__ == "__main__":
    unittest.main()
