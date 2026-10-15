# DEXTER NEXUS OS — Mobile Futuristic Launcher (Beta)

Independently hosted web app at `https://dexter-nexus-os.onrender.com`.

This is a browser/PWA application using local-device CPU and GPU (when applicable). **It is not an iOS native IPA, an Android APK runner or a full Android emulator.** It has its own manifest, icon, standalone presentation, service worker and install instructions.

## Working features

- 3 original HTML5 games with iPhone touch controls: Neon Snake (swipe/arrows), Orbit Dodge (drag), Quantum Pairs (taps).
- Scores and notes saved in browser localStorage. Export/import the `dexter-nexus-save.json` backup file. No collection or transmission of user notes/scores.
- EmulatorJS **Stable CDN** loaded only on demand for user-provided `.gb`, `.gbc`, `.gba` and `.nes` files. Retro emulation may require network and device compatibility and must be validated by a real iPhone test. No ROMs are distributed.
- Browser FPS benchmark, WebGPU detection, logical CPU count; not a hardware benchmark comparable to Android native execution.
- Offline cache of app shell (games run offline after install; EmulatorJS core must have been downloaded separately and is not precached).
- Unconfigured Android Cloud explanation, intentionally no simulated APK execution.
- App install: iOS Safari → Share → Add to Home Screen. Android Chrome offers Install when eligible.

## Signing and distribution

An installable PWA is served over HTTPS and has a manifest and icon; it is **not an Apple-signed IPA**. On U.S. iPhones native iOS app distribution is not available by simply installing an IPA from a webpage; Apple distribution, developer enrollment and signing/provisioning rules apply. A custom iOS configuration profile cannot bypass these conditions.

A signed native IPA would require an authorized Apple Developer signing identity and compatible build infrastructure; this release does not include one. We do not distribute a fake signed package.

## Android Cloud roadmap (not deployed)

- Linux container host supporting Android binder + redroid (https://github.com/remote-android/redroid-doc) or licensed Anbox Cloud.
- WebRTC streaming gateway with authentication, TLS and per-user isolation.
- Server-side cloud saves in authenticated/private object storage + quota and backup policy.
- Estimated costs and explicit financial approval **before** creating infrastructure.

Cloud storage provides synchronization and caching, **not additional local CPU/GPU capacity**.

## Repo arrangement

Current GitHub-connected tools cannot create a GitHub repository. Thus NEXUS lives in the isolated folder `nexus-os/` of `H4CKLABORATORY/dexter-ai-web`, and on an independently deployed Render static site. It is not mixed into the existing DEXTER AI page and can later be split into a new GitHub repo without rewriting app logic.

## Licensing and references

Original code for this launcher. EmulatorJS CDN is separately loaded and subject to its own license: https://github.com/EmulatorJS/EmulatorJS. Other references: https://github.com/copy/v86 and https://github.com/remote-android/redroid-doc. No system firmware or copyrighted game ROM is bundled.
