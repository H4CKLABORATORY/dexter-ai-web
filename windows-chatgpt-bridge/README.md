# DEXTER NEXUS — ChatGPT Windows Bridge

Goal: use the **real ChatGPT Windows desktop application** remotely from an iPhone, without pretending a Linux browser is the native Windows app.

## Why this is different from remote-pc

\`remote-pc/\` contains a planned Debian/Chromium remote browser, which **cannot run ChatGPT's official Windows desktop application**. For a true desktop-only plugin, the host must be supported Windows or macOS running the actual app.

This bridge uses an actual Windows 10/11 machine (your own PC or licensed Windows cloud VM). [ChatGPT for Windows](https://help.openai.com/en/articles/9982051-using-the-chatgpt-windows-app) requires build 17763 or later.

## Set up once on the Windows PC

1. Download and inspect \`setup-chatgpt.ps1\` from this folder. Open Windows PowerShell, navigate to the downloaded file, then run \`.\setup-chatgpt.ps1\`. Use the official Microsoft Store if the installation command fails. You can also install ChatGPT yourself via https://chatgpt.com/download/.
2. Open ChatGPT Desktop locally to confirm it starts. Do not send login tokens to any website or repository.
3. Visit https://www.dwservice.net/es/ and, if you choose this service, sign up for your own account and enable strong authentication.
4. Download the official DWAgent, select **Install** and use the installation code from **your DWService dashboard**. This is a full remote-access agent. Grant access only to your own Windows machine.
5. Keep the Windows host powered on and connected to the internet. Do not disable Windows Firewall or open RDP ports to the public internet.
6. On iPhone, open \`NEXUS OS > CHATGPT PC\`, then **Abrir Windows remoto**. Sign in to DWService, choose the machine and select **Screen**.
7. Inside the streamed Windows screen, run ChatGPT Desktop and sign in to your own ChatGPT account. This is the actual app, not the web version.
8. Install or connect plugins from the native app following ChatGPT's official prompts. A **Desktop only** label means the desktop app is required. The account may still require explicit consent and provider authentication.

## Can everything run without my personal computer?

Only if you provision a real Windows VM (or compatible Mac) with supported app distribution, persistent storage, and remote access. GitHub Pages and Render Linux container hosting alone cannot provide a Windows desktop VM. A paid VM normally requires a billing decision. This repository does not create a cloud VM, and doesn't claim one exists.

## Security

- NEXUS OS links to the official DWService website. It does not embed a remote login form, collect credentials, or store ChatGPT sessions.
- No browser-deceptive user-agent spoofing, unattended sign-in or unauthorized plugin installation.
- DWAgent gives remote access to the computer. Protect the provider login with MFA. Never publish an agent key or share one in ChatGPT.
- A work-managed PC might disallow remote agents. Respect your organization's policies.
- ChatGPT account/app features depend on your plan and setup.
- Once authenticated, ChatGPT might use installed plugins automatically for relevant tasks, but first-time installation or OAuth/consent isn't bypassed.

Provider references:
- [ChatGPT Windows installer](https://chatgpt.com/download/)
- [DWService](https://www.dwservice.net/es/)
- [DWService: how to install the agent](https://docs.dwservice.net/docs/site/dwservice-installation/how-do-i-install-the-agent/)
- [ChatGPT plugins](https://help.openai.com/en/articles/20001256-plugins-in-chatgpt)
