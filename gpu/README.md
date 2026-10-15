# Despliegue del modelo original en GPU

Modelo: `Godmoded/llama3-lexi-uncensored`.

Requiere un servidor Linux con GPU NVIDIA, controladores y NVIDIA Container Toolkit. Válido para una GPU reservada en Vast.ai, Runpod o tu propia máquina. No se crea ninguna instancia ni se activa facturación automáticamente.

```bash
cd gpu
docker compose up -d ollama
docker compose run --rm model-init
docker compose exec ollama ollama list
```

La API de Ollama escucha **solo en 127.0.0.1:11434**. No abras el puerto 11434 a internet.

## Conectar al backend existente de Render

Utiliza una conexión privada o túnel HTTPS autenticado entre Render y el servidor de inferencia, y configura `OLLAMA_URL` en el entorno de Render con la dirección autorizada. La aplicación actual no admite todavía un token específico para ese túnel: implementa autenticación de origen antes de conectarlo. Comprueba primero `/api/models` y después prueba un chat autenticado.

Para uso público del sitio también faltan autenticación real de usuarios y límites persistentes de consumo. No despliegues un endpoint GPU público sin esos controles.
