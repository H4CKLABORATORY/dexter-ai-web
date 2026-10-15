# DEXTER NEXUS OS — Mobile Futuristic Launcher (Beta)

Independently hosted web app at `https://dexter-nexus-os.onrender.com`.

This is a browser/PWA application using local-device CPU and GPU (when applicable). **It is not an iOS native IPA, an Android APK runner or a full Android emulator.** It has its own manifest, icon, standalone presentation, service worker and install instructions.

## Nuevos juegos de plataformas y NES (2026-10-15)

La galería Retro Core incluye ROM de distribución autorizada:

| Juego | Consola | Licencia | Fuente |
|---|---|---|---|
| Pong | Game Boy | CC0 | [Game Boy Coding Adventure](https://github.com/mdagois/gca) |
| Minesweep | Game Boy | CC0 | [Game Boy Coding Adventure](https://github.com/mdagois/gca) |
| Double Action Blaster Guys | NES | Zlib | [NovaSquirrel/DABG v2](https://github.com/NovaSquirrel/DABG/releases/tag/v2) |
| Falling | NES | MIT | [xram64/falling-nes](https://github.com/xram64/falling-nes) |
| 8-Bit Table Tennis | NES | MIT | [mike42/8bit-table-tennis v1.0](https://github.com/mike42/8bit-table-tennis/releases/tag/v1.0) |

Las copias de las licencias se incluyen en `roms/CC0-LICENSE.txt` y `roms/legal-licenses/`. Los tres juegos NES se verifican al descargar mediante GitHub Actions comprobando cabecera iNES y tamaño del archivo.

Además se incluye **NEXUS JUMP**, un juego de plataformas web original con 3 mundos, enemigos, monedas, portales, controles táctiles y récords locales, en `jump/`. No es una ROM de NES ni utiliza personajes ni gráficos de Nintendo.

**Super Mario Bros., Super Mario World y los demás juegos comerciales de Nintendo no se incluyen** porque sus ROM no están autorizadas para redistribución general. El emulador permite cargar archivos del usuario que tenga derecho a utilizar. La licencia MIT del repositorio de un emulador NO transfiere derechos sobre las ROM comerciales alojadas en otro lugar.

## Bundled media — latest version

A starter library ships **two genuine Game Boy ROMs**: `roms/pong.gb` and `roms/minesweep.gb` (32 KiB each). They come from Maximilien Dagois's [Game Boy Coding Adventure](https://github.com/mdagois/gca) repository, specifically `prebuilt/games/pong/pong.gb` and `prebuilt/games/minesweep/minesweep.gb`. That author's README identifies the games as CC0 1.0 Universal; the corresponding license is included at `roms/CC0-LICENSE.txt`. Note that the source repository documents exceptions for certain unrelated third-party art assets; review those restrictions before adding more games.

The NEXUS **PC FreeDOS** tab bundles the real `freedos722.img` floppy image and v86 assets from the already integrated `windows-mobile/assets/v86/` demo. All are served from the same origin under `assets/pc/`. This is FreeDOS emulated on a PC x86 CPU, **not Windows 7/10 or Android**. It is an experimental compatibility mode in Safari, and will report an error if startup fails.

Android Lab offers built-in web games and a future cloud Android roadmap; it does **not** include an Android OS image, Android system services, Google Play, or an APK execution engine. Bundling commercial ROMs, Windows ISO/firmware, Android apps without permission, or claiming an unsupported OS runs is out of scope.

The homebrew media is provisioned by `.github/workflows/bundle-nexus-roms.yml`. This workflow checks the GB cartridge header and the WebAssembly signature before committing the assets. `nexus-os/sw.js` caches the included assets for later offline usage if browser storage permits; EmulatorJS core assets are external and not precached.

## Working features

- 3 original HTML5 games with iPhone touch controls: Neon Snake (swipe/arrows), Orbit Dodge (drag), Quantum Pairs (taps).
- Scores and notes saved in browser localStorage. Export/import the `dexter-nexus-save.json` backup file. No collection or transmission of user notes/scores.
- EmulatorJS **Stable CDN** loaded only on demand for the two included GB homebrew ROMs or user-provided `.gb`, `.gbc`, `.gba` and `.nes` files. Retro emulation may require network and device compatibility and must be validated by a real iPhone test. No ROMs are distributed.
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
