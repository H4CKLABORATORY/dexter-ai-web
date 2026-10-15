# DEXTER Mobile OS

Proyecto web separado de la página principal, ubicado en `windows-mobile/` del repositorio `dexter-ai-web`.

## Qué hace de verdad
- Entorno de escritorio web original con ventanas táctiles y modo móvil.
- Motor de IA **local** por WebGPU/WebLLM con el modelo **SmolLM2-360M-Instruct-q4f32_1-MLC** (ligero y distinto del WormGPT de 8B). Requiere navegador con WebGPU y conexión para descargar modelo/runtime inicialmente. Si iOS bloquea WebGPU o la memoria no alcanza, muestra error en vez de fingir respuesta.
- Emulador x86 basado en [v86](https://github.com/copy/v86), con arranque de FreeDOS o selección de imagen ISO/IMG propia. Dependencias externas alojadas por v86 se descargan al iniciar. **No incluye ni distribuye imágenes Windows**. No es Windows moderno.
- Información verificable de compatibilidad del navegador.

## Limitaciones
Un perfil de configuración iPhone no convierte iOS en Windows ni añade RAM/CPU/GPU. Los modelos 8B completos necesitan memoria adicional y/o una GPU remota o runtime nativo compatible. No se ha portado `Godmoded/llama3-lexi-uncensored` a WebLLM; el chat local usa un modelo pequeño diferente, indicado explícitamente en pantalla.

El arranque de sistemas x86 puede fallar si el origen externo de recursos aplica políticas CORS o si Safari no dispone de suficiente memoria. En ese caso, el usuario puede abrir la demo oficial de v86.

## Publicación
GitHub Pages: `https://h4cklaboratory.github.io/dexter-ai-web/windows-mobile/`

Para alojar este sitio con dominio independiente, crear un sitio estático en Render con:
- repo: `https://github.com/H4CKLABORATORY/dexter-ai-web`
- build command: `echo "Pure static website"`
- publish directory: `windows-mobile`.

**Repositorio GitHub:** sigue compartiendo el repositorio fuente `dexter-ai-web`. Para separar además el código en un repositorio propio, crear el repositorio nuevo en GitHub y copiar esta carpeta; la conexión actual de GitHub no permite crear repositorios.

## iPhone: app instalada y emulador (actualización octubre 2026)

El sitio incluye `manifest.webmanifest`, `sw.js`, icono SVG y opción visual «⇧ App».
En Safari: **Compartir → Añadir a pantalla de inicio → Abrir como app** (si aparece).
La PWA conserva el motor WebKit: no desbloquea más RAM/CPU ni permite ejecutar Windows nativo u Ollama 8B en iPhone. Su beneficio es el modo pantalla completa y el acceso desde inicio.

El emulador ahora usa archivos **del mismo dominio** en `windows-mobile/assets/v86/` (v86 JS, WASM, BIOS y disquete FreeDOS), previamente descargados desde fuentes oficiales mediante la tarea GitHub Actions «Bundle emulator assets for mobile». Se conservó la licencia del runtime en `assets/v86/LICENSE`. El avisador de arranque espera 75 segundos y muestra estados de descarga reales, sin declarar fracaso por tardar 15 segundos.

### Verificación
GitHub Actions `Validate application` valida JavaScript, manifest y formato/tamaños de los archivos locales. Esta prueba **no sustituye** un arranque FreeDOS en el iPhone del usuario, que sigue pendiente.

Si el emulador no abre en iOS, prueba la [demo upstream](https://copy.sh/v86/?profile=freedos): si tampoco arranca, puede ser una restricción de compatibilidad de Safari/v86 y no un problema de instalación web.
