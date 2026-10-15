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


## Modelo exacto del proyecto WormGPT de referencia

Modelo confirmado en Ollama: `Godmoded/llama3-lexi-uncensored` (8.03B, archivo ~4.9 GB).
https://ollama.com/Godmoded/llama3-lexi-uncensored

En una máquina propia o servidor con memoria suficiente y Ollama instalado:

```bash
ollama pull Godmoded/llama3-lexi-uncensored
ollama list
```

El servicio Render `dexter-ai-web-api` es un **proxy** Node.js, no un servidor de inferencia. El plan gratuito no ejecuta el modelo de 4.9 GB. Se necesita un host de Ollama privado, accesible de forma segura desde el backend mediante `OLLAMA_URL`, o bien un proveedor que aloje **ese mismo modelo**. No se debe usar una API distinta y presentarla como el modelo original.

Los modelos disponibles se consultan desde `/api/models`. Sin Ollama conectado la interfaz debe mostrar que no hay modelos; esto es intencional, no una simulación. Antes de abrir el chat al público con una clave de pago, añadir autenticación de usuarios, cuotas persistentes y controles de costes.
