# Windows Lite in DEXTER NEXUS OS

Two **browser desktops inspired by Windows** are available inside NEXUS OS:
- **Windows 7 Lite · Web Edition**, launch with `https://dexter-nexus-os.onrender.com/windows-lite/?mode=7`.
- **Windows 10 Lite · Web Edition**, launch with `https://dexter-nexus-os.onrender.com/windows-lite/?mode=10`.

## Runtime and independence

From NEXUS OS → Windows, choose one of the two editions. The edition loads inside an iframe only when opened. The two desktops do not run simultaneously; pressing **Apagar** removes the iframe to release its JavaScript contexts and associated resources. You can use **Abrir aparte** to open the selected desktop in a browser tab. Each edition has a distinct PWA manifest and an isolated localStorage namespace.

Apps are available *after that edition boots*: file explorer and TXT files, note editor, arithmetic calculator without `eval`, limited educational web console, wallpaper settings, FPS measurement and a bounded CPU Web Worker benchmark. Notes and files are stored on the phone through browser localStorage; manual JSON backups and TXT downloads are supported. No server is required to execute these apps.

This uses iPhone CPU through JavaScript/Web Workers, GPU browser rendering, WebAssembly if available, and WebGPU only when enabled in the browser; it does not bypass iOS security or enable Windows x86 programs. **Neither edition is a modified licensed copy of Microsoft Windows**. No Windows binaries, ISOs, registry, drivers, .exe runtime or native Windows compatibility are bundled. Running genuine Windows 7/10 remotely would require a licensed VM/server and streaming, not a lightweight Safari app.

## Installation

From Safari, open the edition-specific link above and use **Compartir → Añadir a pantalla de inicio**. iOS may or may not use separate icons depending on installed web app policy and browser version. The main NEXUS OS PWA already supports both desktop modes.

## Testing

`.github/workflows/windows-lite-smoke.yml` checks booting both editions in mobile Chromium, calculator, CPU Web Worker, editor, shutdown and data isolation. This **does not** prove compatibility with iOS Safari; that still requires testing on the owner's iPhone.

Shared lightweight runtime files live under `windows-lite/`; only one instance boots on demand. The app shell cache in `nexus-os/sw.js` allows subsequent use offline after initially caching required files.
