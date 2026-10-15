# Bloqueos verdaderos

1. **Runpod OAuth**: la instalación privada existe, pero en esta conversación no se han expuesto herramientas MCP Runpod; necesita autorización explícita del usuario desde cuenta compatible o ruta API certificada.
2. **GPU**: no existe una instancia creada ni presupuesto aprobado. Es un servicio potencialmente facturable.
3. **Inferencia**: el modelo `Godmoded/llama3-lexi-uncensored` no está activo; no hay prueba de extremo a extremo.
4. **Control de abuso de producción**: el backend usa límites de memoria por instancia e identificación básica de origen. El token secreto bloquea accesos anónimos, pero una publicación amplia requiere cuentas, almacenamiento duradero de cuotas y límites financieros del proveedor.
5. **Validación externa**: el entorno actual no pudo recuperar Pages/Render usando búsqueda web; confirmar GitHub Actions y el endpoint tras desplegar.

Alternativa autorizada: despliegue Linux + Ollama de CPU/GPU propio sin gasto Runpod; no debe confundirse con alojamiento ya disponible.
