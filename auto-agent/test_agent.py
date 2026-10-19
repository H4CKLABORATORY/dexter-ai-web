import json
import unittest
from unittest.mock import patch
from pathlib import Path
import importlib.util

spec = importlib.util.spec_from_file_location("agent", Path(__file__).with_name("agent.py"))
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)

class InventoryTests(unittest.TestCase):
    def test_filters_other_owners_and_archived(self):
        page = [
            {"name": "one", "owner": {"login": "H4CKLABORATORY"}, "archived": False,
             "disabled": False, "private": False, "default_branch": "main",
             "open_issues_count": 2, "html_url": "https://github.com/H4CKLABORATORY/one"},
            {"name": "fork", "owner": {"login": "someone-else"}},
            {"name": "old", "owner": {"login": "H4CKLABORATORY"}, "archived": True}
        ]
        def fake_get(path):
            if path.startswith("/users/"):
                return page
            if path.startswith("/repos/"):
                return {"workflow_runs": [{"name": "CI", "status": "completed",
                                           "conclusion": "success", "html_url": "https://github.com/example"}]}
            raise AssertionError(path)
        with patch.object(agent, "get", side_effect=fake_get):
            result = agent.inventory()
        self.assertEqual([r["name"] for r in result["repositories"]], ["one"])
        self.assertEqual(result["repositories"][0]["last_action"]["conclusion"], "success")
        self.assertIn("public", result["scope"])

    def test_action_failure_is_reported(self):
        repo = {"name": "one", "owner": {"login": "H4CKLABORATORY"},
                "default_branch": "main", "private": False}
        def fake_get(path):
            if path.startswith("/users/"):
                return [repo]
            raise PermissionError("forbidden")
        with patch.object(agent, "get", side_effect=fake_get):
            result = agent.inventory()
        self.assertEqual(result["repositories"][0]["actions_error"], "PermissionError")

if __name__ == "__main__":
    unittest.main()
