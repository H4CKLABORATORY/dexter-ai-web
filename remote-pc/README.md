# NEXUS Remote PC (private Chromium)

A real Linux Chromium desktop rendered over noVNC to Safari, rather than a fake Windows desktop.

## What it does
- Remote Chromium with mouse/keyboard/touch through HTTPS.
- Lets the owner log into ChatGPT from an actual desktop browser.
- Access from NEXUS OS launcher or direct HTTPS URL.

## What it does NOT do
- Cannot make ChatGPT automatically install plugins; ChatGPT's plugin connection and approval flows are server-side account operations.
- Cannot turn iOS into Windows or run Windows executables.
- Does not grant unapproved plugins access to the account.

## Deployment
On Render, deploy this folder as a Docker web service: Dockerfile path `./remote-pc/Dockerfile`, repository `H4CKLABORATORY/dexter-ai-web`, branch `main`, listening port `10000`.
Set `NEXUS_PASSWORD` to a unique random password of >=16 characters, **only** in private Render environment settings. Username is `nexus`.
Do not place login passwords, ChatGPT cookies, API keys, or session exports into source control.
Render free Docker may not have enough memory for Chromium, and free service instances can sleep. If you upgrade, check pricing before enabling a paid tier. The browser profile is ephemeral without a persistent private disk.

## Privacy and security
- HTTP Basic Auth at Nginx; SSL termination at hosting.
- VNC and WebSocket broker bound to loopback only; Nginx is the only public listener.
- Browser launched as non-root and in a dedicated container, though Chromium has `--no-sandbox` for container compatibility; don't browse unknown sites or install untrusted extensions.
- Service is single-user; do not share credentials.
- No credentials or cookies are passed via URL.
- Do not expose the VNC socket outside localhost.
- Use `/health` only for basic service status; it is not an end-to-end Chromium test.

## Next step for ChatGPT automation
A genuine in-ChatGPT plugin can offer metadata, search, status and installation *suggestions*. Actual plugin installation/connection must use ChatGPT's approved plugin-management flow, including consent prompts. A remote browser doesn't override those platform controls.
