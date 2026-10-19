#!/usr/bin/env python3
"""Deterministic, read-only task planner for DEXTER DOT.

The planner never executes issue instructions or writes to other repositories.
"""
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone

OWNER = "H4CKLABORATORY"
API = "https://api.github.com"
TOKEN = os.environ.get("GH_TOKEN", "")
MAX_REPOS = 1000


def get(path, authenticated=True):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "dexter-auto-agent/0.2",
    }
    if authenticated and TOKEN:
        headers["Authorization"] = "Bearer " + TOKEN
    req = urllib.request.Request(API + path, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.load(response)


def inventory():
    repos = []
    # Use public endpoints; a workflow token cannot read sibling private repos.
    for page in range(1, 11):
        batch = get(f"/users/{OWNER}/repos?per_page=100&page={page}", authenticated=False)
        if not batch:
            break
        repos.extend(
            r for r in batch
            if r.get("owner", {}).get("login", "").lower() == OWNER.lower()
        )
        if len(batch) < 100:
            break
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "owner": OWNER,
        "scope": "public repositories only; private repos require separate authorization",
        "repositories": [],
        "next_tasks": [],
    }
    for r in repos[:MAX_REPOS]:
        if r.get("archived") or r.get("disabled"):
            continue
        item = {
            "name": r["name"],
            "visibility": "private" if r.get("private") else "public",
            "default_branch": r.get("default_branch"),
            "open_issues_count": r.get("open_issues_count"),
            "url": r.get("html_url"),
        }
        try:
            runs = get(f"/repos/{OWNER}/{r['name']}/actions/runs?per_page=1", authenticated=False)
            recent = runs.get("workflow_runs", [])
            item["last_action"] = (
                {
                    "name": recent[0].get("name"),
                    "status": recent[0].get("status"),
                    "conclusion": recent[0].get("conclusion"),
                    "url": recent[0].get("html_url"),
                }
                if recent else None
            )
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, PermissionError) as exc:
            item["actions_error"] = type(exc).__name__
        output["repositories"].append(item)
        action = item.get("last_action")
        if action and action.get("conclusion") == "failure":
            output["next_tasks"].append({
                "repository": r["name"],
                "kind": "review_failed_ci",
                "url": action.get("url"),
                "requires_human_review": True,
            })
    output["next_tasks"].sort(key=lambda task: task["repository"].lower())
    return output


if __name__ == "__main__":
    result = inventory()
    os.makedirs("auto-agent/reports", exist_ok=True)
    with open("auto-agent/reports/latest.json", "w", encoding="utf-8") as file:
        json.dump(result, file, indent=2, ensure_ascii=False)
    print("Inspected", len(result["repositories"]), "repositories")
    print("Suggested review tasks:", len(result["next_tasks"]))
