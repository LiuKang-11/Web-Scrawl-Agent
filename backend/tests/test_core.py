from __future__ import annotations

import os
import tempfile
import unittest

from pipeline import extract_features, generate_test_cases
from security import validate_target_url


class SecurityTests(unittest.TestCase):
    def test_accepts_https_and_localhost(self):
        self.assertEqual(validate_target_url("https://example.com/app"), "https://example.com/app")
        self.assertEqual(validate_target_url("http://localhost:3000"), "http://localhost:3000")

    def test_rejects_unsafe_urls(self):
        for value in ("file:///etc/passwd", "javascript:alert(1)", "http://169.254.169.254/latest"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                validate_target_url(value)


class PipelineTests(unittest.TestCase):
    def test_graph_generates_runnable_test(self):
        graph = {
            "nodes": [{
                "state_id": "state_1",
                "url": "https://example.com/login",
                "title": "Login",
                "page_summary": "Login form",
                "interactive_elements": [
                    {"tag": "input", "type": "email", "name": "email", "selector": "#email", "visible": True},
                    {"tag": "button", "text": "Sign in", "selector": "button", "visible": True},
                ],
                "backend_requests": [],
            }],
            "edges": [],
            "stats": {"total_states": 1, "total_transitions": 0},
        }
        features = extract_features(graph)
        cases = generate_test_cases(features)["test_cases"]
        self.assertTrue(cases)
        self.assertEqual(cases[0]["actions"][0]["type"], "navigate")


class StoreTests(unittest.TestCase):
    def test_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            os.environ["FLOWGUARD_DB_PATH"] = os.path.join(directory, "test.db")
            from store import get_artifact, save_artifact
            save_artifact("run-1", "test", {"passed": True}, "done")
            self.assertTrue(get_artifact("run-1")["payload"]["passed"])
        os.environ.pop("FLOWGUARD_DB_PATH", None)


if __name__ == "__main__":
    unittest.main()
