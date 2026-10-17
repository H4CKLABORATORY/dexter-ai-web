# DEXTER NEXUS — Cloud workstation (real remote terminal)

A real Linux container with PowerShell 7, Node 22, Git, OpenCode Web and ttyd.
Runs on a remote server; Safari on iPhone is only the thin client.

## Deployment on Render
- Repository: H4CKLABORATORY/dexter-ai-web
- Environment: Docker; Dockerfile path `cloud-workstation/Dockerfile`
- Branch: `main`; port: `10000`.
- Do not enable paid tiers without permission; start with Free only if available.
- Add PRIVATE environment variable `NEXUS_PASSWORD` with a strong unique value at least 20 characters long.
- Start command configured in Dockerfile; no additional commands needed.
- Entrypoint is `https://<render-service-host>/portal/`.
- `/shell/`: real pwsh (ttyd WebSocket). `/app/`: OpenCode browser frontend.
- OpenCode API also resides at the service root (reverse-proxy protected).
- `/health` is intentionally non-sensitive, and reports gateway readiness, not an end-to-end service health result.

## Security boundaries
- Never expose ttyd or OpenCode without authentication. Without `NEXUS_PASSWORD`, the container refuses to start.
- HTTPS is terminated by Render. NGINX enforces bcrypt HTTP Basic authentication throughout the service (except health). OpenCode enforces its own Basic auth.
- Both internal processes bind only to 127.0.0.1.
- Server session credentials must be treated as sensitive. Don't add your password or tokens to GitHub.
- User is unprivileged (`nexus`). No `sudo` is installed/configured for the user.
- Exposing a remote shell to the Internet is high-risk; this design has baseline authentication but is not a hardened multi-user product. Prefer private Codespaces for sensitive work, enable 2FA, and revoke/rotate credentials if exposed.

## Constraints
- Render free instances go to sleep after inactivity and can be restarted at any time.
- Free filesystem is ephemeral: changes not pushed to GitHub will be lost.
- No Windows kernel, drivers, or Windows .exe.
- Installing OpenCode doesn't provide model API entitlements/credits.
- This remote machine is not automatically controlled by ChatGPT: current connectors may edit GitHub files and inspect Render, but do not provide a general-purpose remote shell session.
- Connecting OpenCode Mobile via direct URL may require client support for HTTP Basic authentication; do not turn off the password to solve connection issues.
- This code needs deployment/build smoke checks before representing it as a running service.
