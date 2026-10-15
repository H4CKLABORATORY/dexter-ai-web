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
