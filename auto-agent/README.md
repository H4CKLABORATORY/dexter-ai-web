# DEXTER AUTO AGENT — foundation

This first version is an **audit-only** scheduled GitHub Actions job. It inventories repositories owned by H4CKLABORATORY and the latest workflow result for each accessible repository.

## Security and limits
- No AI model is connected. No autonomous code editing or PR creation is enabled.
- Uses the temporary GitHub Actions token only; never prints or stores it.
- Workflow has read-only contents permission. GitHub's token may not have access to sibling private repositories; these will be omitted unless separately authorized with a narrowly scoped credential. Do not store credentials in source code.
- Runs every six hours *after the workflow is merged into the default branch*. GitHub schedules are best-effort, not a 24/7 process.
- Produces a downloadable JSON Actions artifact. It does not commit audit data, merge PRs, run third-party repository code or incur paid infrastructure.
- API requests can fail due to rate limits or permission restrictions; failures are surfaced instead of treated as success.

## Next steps
1. Review workflow permissions and confirm which repositories can be audited.
2. Add an allowlisted task queue with deterministic, testable changes.
3. Add isolated test runners and draft PR creation with minimum required scoped permissions.
4. Evaluate a genuinely free, permitted model provider separately; never assume an unauthenticated endpoint supports inference.

## Local check
Run `python3 auto-agent/agent.py` with a suitable GitHub token or unauthenticated for public repositories.
