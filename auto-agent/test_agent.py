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
        def fake_get(path, **kwargs):
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

    def test_unauthenticated_public_inventory(self):
        with patch.object(agent, "TOKEN", "dummy"), patch("urllib.request.urlopen") as urlopen:
            response = urlopen.return_value.__enter__.return_value
            response.read.return_value = b'[]'
            agent.get("/users/H4CKLABORATORY/repos", authenticated=False)
            request = urlopen.call_args.args[0]
            self.assertNotIn("Authorization", request.headers)

    def test_failed_ci_proposes_review_only(self):
        repo = {"name": "one", "owner": {"login": "H4CKLABORATORY"},
                "default_branch": "main", "private": False}
        def fake_get(path, **kwargs):
            if path.startswith("/users/"):
                return [repo]
            return {"workflow_runs": [{"name": "CI", "status": "completed",
                                       "conclusion": "failure", "html_url": "https://github.com/example/actions/runs/1"}]}
        with patch.object(agent, "get", side_effect=fake_get):
            result = agent.inventory()
        self.assertEqual(result["next_tasks"][0]["kind"], "review_failed_ci")
        self.assertTrue(result["next_tasks"][0]["requires_human_review"])

    def test_action_failure_is_reported(self):
        repo = {"name": "one", "owner": {"login": "H4CKLABORATORY"},
                "default_branch": "main", "private": False}
        def fake_get(path, **kwargs):
            if path.startswith("/users/"):
                return [repo]
            raise PermissionError("forbidden")
        with patch.object(agent, "get", side_effect=fake_get):
            result = agent.inventory()
        self.assertEqual(result["repositories"][0]["actions_error"], "PermissionError")

if __name__ == "__main__":
    unittest.main()
