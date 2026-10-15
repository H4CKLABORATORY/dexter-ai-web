# Progreso verificable

- Repositorio independiente y GitHub Pages comprobados en sesión anterior con captura.
- Render backend: despliegue `dep-db83lsu0tbcc73e4os7g` marcado `live` para commit `29011016`.
- Plugin privado Runpod 2.1.0 existe (`plugins_6ad03b426cd88191880ce1a2dc93161f`), pero sus herramientas no están accesibles todavía.
- API `server.js`: agregado control de acceso `CHAT_ACCESS_TOKEN` con comparación de tiempo constante, bloqueo si falta clave, soporte de etiqueta `:latest` y estado `modelVerified`; error de JSON incorrecto devuelve HTTP 400.
- Web `index.html`: botón de acceso que conserva el token solo en `sessionStorage` por pestaña y lo transmite en Authorization; nunca lo comitea.
- Pruebas `test/server.test.cjs`: rutas protegidas, origen inválido, modelo equivocado, JSON inválido, caso éxito con proveedor mock y servidor sin GPU. Integradas en workflow.
- Validación estática realizada dentro del entorno JS del asistente: parseo de `server.js`, script integrado en `index.html` y `test/server.test.cjs` sin errores.
- No se ha comprobado aún resultado final de CI ni intercambio real con proveedor Ollama/Runpod.

Nota: jamás incluir credenciales, llaves privadas o contraseñas en estos registros.
