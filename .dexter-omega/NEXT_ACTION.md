# Reanudación exacta

1. Consultar estado de últimos despliegues Render para `srv-db8341689jmc73c0vq3g`; comprobar que el último commit llegue a `live`.
2. Confirmar si GitHub Actions `Validate application` pasó `node --test test/server.test.cjs`. Si falla, inspeccionar logs reales y corregir.
3. Revisar la integración privada Runpod (`plugins_6ad03b426cd88191880ce1a2dc93161f`) por si sus herramientas MCP ya están disponibles.
4. Solicitar autorización de cuenta y presupuesto máximo solo cuando se pueda aprovisionar una GPU. Nunca crear recurso de pago por suposición.
5. En Render configurar secretos `RUNPOD_ENDPOINT_ID`, `RUNPOD_API_KEY` y `CHAT_ACCESS_TOKEN` después de crear endpoint, no en GitHub.
6. Verificar `/api/status`, `/api/models`, `/api/chat` con respuesta real; confirmar `modelVerified:true`.
7. Fortalecer limitación de uso persistente, controles de cuota y alertas financieras antes de compartir masivamente.

Misión no terminada mientras GPU, modelo real y prueba final falten.
