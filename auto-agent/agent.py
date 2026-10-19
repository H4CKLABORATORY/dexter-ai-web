#!/usr/bin/env python3
"""Read-only repository inventory. No external AI credentials required."""
import json
import os
import urllib.request
from datetime import datetime, timezone

OWNER = "H4CKLABORATORY"
API = "https://api.github.com"
TOKEN = os.environ.get("GH_TOKEN", "")
def get(path):
    req = urllib.request.Request(API + path, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "dexter-auto-agent/0.1",
        **({"Authorization": "Bearer " + TOKEN} if TOKEN else {}),
    })
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.load(response)

def inventory():
    repos = []
    for page in range(1, 11):
        batch = get(f"/user/repos?per_page=100&page={page}&affiliation=owner") if TOKEN else get(f"/users/{OWNER}/repos?per_page=100&page={page}")
        if not batch:
            break
        repos.extend(r for r in batch if r.get("owner", {}).get("login", "").lower() == OWNER.lower())
        if len(batch) < 100:
            break
    output = {"generated_at": datetime.now(timezone.utc).isoformat(), "owner": OWNER, "repositories": []}
    for r in repos:
        if r.get("archived") or r.get("disabled"):
            continue
        item = {"name": r["name"], "visibility": "private" if r.get("private") else "public",
                "default_branch": r.get("default_branch"), "open_issues_count": r.get("open_issues_count"),
                "url": r.get("html_url")}
        try:
            runs = get(f"/repos/{OWNER}/{r['name']}/actions/runs?per_page=1")
            recent = runs.get("workflow_runs", [])
            item["last_action"] = ({"name": recent[0].get("name"), "status": recent[0].get("status"),
                                    "conclusion": recent[0].get("conclusion"), "url": recent[0].get("html_url")}
                                   if recent else None)
        except Exception as exc:
            item["actions_error"] = type(exc).__name__
        output["repositories"].append(item)
    return output

if __name__ == "__main__":
    result = inventory()
    os.makedirs("auto-agent/reports", exist_ok=True)
    with open("auto-agent/reports/latest.json", "w", encoding="utf-8") as file:
        json.dump(result, file, indent=2, ensure_ascii=False)
    print("Inspected", len(result["repositories"]), "repositories")
