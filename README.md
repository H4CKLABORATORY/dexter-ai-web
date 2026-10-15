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

**Seguridad (actualizada):** `POST /api/chat` requiere `CHAT_ACCESS_TOKEN` (variable privada de Render). Si el motor está conectado pero no existe el token, la ruta permanece bloqueada (HTTP 503); claves inválidas reciben HTTP 401. El frontend permite introducir la clave en «Acceso al chat» y la conserva solamente en `sessionStorage` de la pestaña. Una web pública sin autenticación de cuentas no es apta para ofrecer inferencia de pago a terceros. Usa presupuestos y cuotas persistentes antes de abrirla. No expongas Ollama directamente a Internet. El historial se guarda en el navegador.


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

## Runpod Serverless (integración preparada)

- Worker Docker/Python: `runpod/`
- Variables privadas necesarias en Render: `RUNPOD_ENDPOINT_ID`, `RUNPOD_API_KEY`, `CHAT_ACCESS_TOKEN`.
- `GET /api/status`: devuelve el proveedor configurado, la necesidad de clave y `modelVerified`. Este último se vuelve verdadero **solo después** de recibir una respuesta exitosa desde el modelo y se reinicia al desplegar.
- `GET /api/models`: lista el modelo permitido. Para Runpod, una configuración de credenciales no implica que la GPU esté viva.
- `POST /api/chat`: exige el header `Authorization: Bearer <clave privada>`. Runpod se consulta mediante `/run` + `/status/{jobId}`, con espera limitada.
- `node --test test/server.test.cjs` ejecuta pruebas de red locales con proveedor falso. Se verifican en GitHub Actions en cada push y **no constituyen una prueba de inferencia GPU real**.

Seguimiento persistente y criterios en `.dexter-omega/`. No se ha contratado ni habilitado GPU; requiere conexión Runpod, presupuesto autorizado, despliegue real del contenedor y validación final.
