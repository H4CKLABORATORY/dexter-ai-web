# DEXTER DOT — autonomous agent specification

A self-hosted **Dots-inspired** coordinator, not an official ChatGPT Dot and not an authenticated ChatGPT session. Its purpose is to make small, reviewable improvements across authorized H4CKLABORATORY repositories.

## Existing components to reuse

- [GitHub Agentic Workflows](https://github.com/github/gh-aw): agent workflows compiled into GitHub Actions; prefer read-only agent execution and validated safe outputs for PR creation. Pin a vetted release, and compile/audit generated workflows before enabling them. Do not use withdrawn vulnerable versions.
- [OpenCode](https://github.com/anomalyco/opencode): candidate coding engine. Evaluate its licensing, sandbox behavior, model authentication and version before enabling.
- GitHub Actions: deterministic checks, scheduled inventory and downloadable audit artifacts.
- GitHub Issues: proposed persistent task queue; deduplicate issues and do not treat untrusted issue text as instructions.

## Agent behavior

1. Discover repositories and their status using read-only API permissions.
2. Select an explicitly allowlisted issue, subject to a time and iteration budget.
3. In an isolated runner, checkout an exact revision, inspect, edit and test. Treat repository contents, issues and tool outputs as untrusted.
4. Publish a draft PR through a narrow, reviewed write mechanism only after tests pass; never push to protected/default branches.
5. Record decisions, failing tests, changed files and next steps. Do not claim success based solely on a generated patch.
6. Stop after bounded retries; never recursively dispatch workflows or self-escalate permissions.

## Gates to enable real autonomous coding

- **Model:** verify a supported provider and its actual free allowance and terms. No provider or ChatGPT subscription access is assumed. No model inference is enabled in this PR.
- **Credentials:** use GitHub Actions secrets or an appropriately scoped GitHub App for cross-repository access. Do not expose tokens in source, logs, artifacts or browser JavaScript.
- **Security:** branch protection, per-repository allowlists, no arbitrary shell commands from issue bodies, limited network egress, pinned dependencies, PR review, no automatic merge.
- **Cost:** explicitly disable spending and use capped run time and cadence. GitHub Actions quotas still apply.
- **Validation:** compile and audit gh-aw workflows with a vetted release before checking in generated lock workflows. Run a manual dry run, then a restricted pilot on one public repository.

## Current state

The existing `auto-agent/agent.py` and `dexter-auto-agent.yml` are inventory-only. This file is a design and integration specification, **not** evidence that gh-aw, OpenCode or an inference model are installed or operational.

## Next verifiable milestone

Validate inventory workflow on the default branch and capture an Actions artifact; then pilot one isolated, manually triggered agentic workflow with a verified free model and a draft-only PR output.
