# DEXTER NEXUS — AI API HUB

Catálogo público de proveedores de modelos gratuitos para iPhone, OpenCode y proyectos de desarrollo.

- Lanzador: `nexus-os/index.html` → AI API HUB.
- Página: `nexus-os/ai-apis/index.html`.
- Instantánea local: `catalog.json`, derivada del repositorio MIT `open-free-llm-api/awesome-freellm-apis`.
- Actualización en navegador: `app.js` consulta el README público de GitHub y analiza las tablas de proveedores y modelos destacados; si la red falla, utiliza la instantánea incluida.
- Directorio completo de modelos: https://freellm.net/models/
- Generador de configuración: selecciona un modelo compatible y copia un `opencode.json` sin claves privadas.
- Integración con terminal DEXTER: `nexus-ai Groq` lista proveedores disponibles en el catálogo local si el repositorio fue clonado.

## Alcance comprobable
La instantánea incluida contiene 30 proveedores y 82 modelos destacados en el README de origen. El repositorio de origen anuncia un catálogo mayor, pero **no publica todos esos modelos como filas completas dentro de ese README**. El enlace al directorio completo está disponible; no afirmar que se importaron más modelos de los que realmente existen en `catalog.json`.

El sitio **no** registra ni guarda claves personales, no consulta APIs de generación por sí mismo y no prueba una clave o modelo como disponible. Cada API necesita la autenticación y límites del proveedor correspondiente. Los metadatos públicos no garantizan gratuidad permanente o acceso ilimitado.

La configuración de OpenCode se genera únicamente para proveedores con endpoints considerados compatibles según la documentación; otras APIs requieren adaptadores específicos. Consulta la documentación oficial https://docs.opencode.ai/docs/providers/ antes de habilitarla.

## Privacidad y licencia
Datos públicos atribuidos a https://github.com/open-free-llm-api/awesome-freellm-apis (licencia MIT).
Solo los nombres de proveedores favoritos se guardan localmente en el navegador. No se guardan tokens, API keys, sesiones ni credenciales en `localStorage` ni se suben a GitHub.

## Verificación
Ejecuta `node nexus-os/ai-apis/smoke.cjs` para validar el catálogo, rutas y sintaxis de JavaScript. Workflow: `.github/workflows/ai-api-hub.yml`.
