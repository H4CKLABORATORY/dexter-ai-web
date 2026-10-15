# DEXTER AI WEB

Sitio web independiente de H4CKLABORATORY, preparado para GitHub Pages.

## Interfaz pública
`index.html` incluye chat, historial en navegador, exportación y selector de modelos. No utiliza el código cerrado de otros proyectos.

## Activar GitHub Pages
En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**.
Luego abre: https://h4cklaboratory.github.io/dexter-ai-web/

## Motor real de IA (backend)
GitHub Pages solo publica frontend. Para usar respuestas reales necesitas desplegar `server.js` en un hosting compatible con Node.js 18+ y tener Ollama accesible desde ese hosting.

Variables:
- `OLLAMA_URL`: URL privada de Ollama, por defecto `http://127.0.0.1:11434`.
- `ALLOWED_ORIGIN`: `https://h4cklaboratory.github.io`.
- `PORT`: puerto asignado por el hosting.

Ejecuta `node server.js`, y en la web pulsa **Configurar API** para introducir la URL **HTTPS** del backend.

**Seguridad:** El backend de ejemplo no incluye cuentas ni autenticación. **No lo expongas públicamente** sin añadir autenticación, límites de solicitudes y protección contra abuso. No expongas el puerto de Ollama directamente a internet. Las conversaciones se guardan solo en el navegador desde el que se usan.
