# DEXTER AI – Runpod Serverless

Este directorio prepara una imagen contenedora que arranca Ollama, descarga el **modelo original** `Godmoded/llama3-lexi-uncensored` y ejecuta un worker Runpod de una solicitud por trabajo.

1. Construir y publicar la imagen en un registry propio (GitHub Container Registry o Docker Hub).
2. Crear endpoint **Runpod Serverless GPU** con esa imagen, suficiente VRAM y volumen para la caché Ollama. Aviso: el primer arranque descargará unos 4.9 GB y puede exceder el tiempo de arranque del proveedor. Para producción, precarga el modelo en una imagen/volumen privado compatible y ajusta timeouts.
3. En el backend **Render**, configurar `RUNPOD_ENDPOINT_ID` y `RUNPOD_API_KEY` como variables **privadas**. No colocarlas en GitHub ni en el frontend.
4. Verificar `/api/status`, `/api/models`, luego enviar una conversación desde el navegador.

El adaptador usa la API `/v2/{endpointId}/runsync`. Para arranques fríos que superen el tiempo síncrono, habrá que implementar `/run` y consultas a `/status/{jobId}`. El trabajo no incluye crear cuenta Runpod, autorizar gastos ni desplegar una GPU. Evita publicar una API abierta con crédito de pago sin autenticación de usuarios y control de consumo persistente.
