"""Deploy smoke tests (stdlib unittest)."""

import os
import unittest


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
