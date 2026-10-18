# CONTINUIDAD — MIRA Neural Prompt Studio

## Estado verificado: v2.4 — 17 octubre 2026

**Base utilizada:** ZIP completo v2.3 y `CONTINUIDAD.md` de v2.3 disponibles. No se ha publicado ni modificado ningún repositorio externo. Interfaz inspirada en fotografía; no mide neuronas reales ni modifica ChatGPT.

### Cambio real de esta ejecución

- Se incorporó **CANCELAR A/B** al laboratorio, accesible también en pantalla iPhone. Interrumpe las peticiones HTTP del navegador mediante `AbortController` y evita comenzar la segunda consulta si se cancela la primera.
- Las solicitudes de inferencia admiten señal externa de cancelación y liberan escuchas/temporizadores. Incluso si una implementación de `fetch` entrega tardíamente una respuesta tras cancelación, MIRA la descarta.
- Si el usuario cambia el prompt o configuración durante A/B, no se genera un informe atribuido al modelo con estado inconsistente. Se conservan las respuestas recibidas para revisión y análisis manual.
- Durante una ejecución A/B se bloquean temporalmente la edición de respuestas y criterios y el botón ANALIZAR, para evitar informes ambiguos; se restauran en todos los desenlaces.
- Se eliminó una solicitud automática de `/api/health` al cargar una PWA estática. La comprobación del backend es ahora explícita desde **PROBAR CONEXIÓN**.
- Versionado actualizado de informe JSON y caché PWA a v2.4. Se regeneró el HTML autónomo y los dos ZIP.

### Pruebas verificadas

- `python -m unittest discover -s tests -v`: **14 pruebas correctas**, incluyendo nueva regresión de cancelación A, cancelación B y edición durante B en Chromium a 1440, 390 y 320 px.
- `node tests/test_analyzer.cjs`: **9 comprobaciones correctas**.
- `node tests/test_compare.cjs`: **8 comprobaciones correctas**.
- `node tests/test_compare_v23.cjs`: **14 comprobaciones correctas**.
- `node --check web/*.js` y `node --check web/sw.js`: sintaxis correcta.
- El entorno bloquea navegación a `file://` y pruebas reales de PWA instalada. Las pruebas de navegador cargan HTML/CSS/JS por inyección. No se probó Safari físico ni un modelo Ollama real.

### Pendientes

1. Publicar `web/` en un repositorio propio/autorizado y comprobar HTTPS + instalación PWA en Safari iPhone.
2. Conectar un motor de IA real, comprobar tiempo/cancelación en el backend y la factura de posibles solicitudes abortadas.
3. Validar persistencia offline con una prueba de service worker en navegador con origen HTTPS o localhost permitido.
4. Considerar cancelación explícita de trabajos de generación en el servidor, ya que AbortController solo detiene la petición del cliente.

### Notas

El laboratorio A/B calcula métricas literales; no mide calidad, veracidad ni cambios al algoritmo de ChatGPT. No se afirma trabajo ininterrumpido ni inferencia real verificada.

---

## Registro anterior (v2.3)

# CONTINUIDAD — MIRA Neural Prompt Studio

## Estado verificado: v2.3 — 17 octubre 2026

**Base utilizada:** archivo ZIP completo v2.2 disponible en el entorno y bitácora `CONTINUIDAD.md` v2.2. No se alteró ningún repositorio externo. El frontend sigue siendo una reconstrucción visual basada en la fotografía del demo; no reproduce ni modifica el motor interno de ChatGPT.

### Cambios reales de esta ejecución

1. **Laboratorio A/B verificable:** hasta 20 criterios literales por líneas; comparación sin distinguir tildes o mayúsculas, sin falsos positivos por coincidencia parcial de palabras; conteo y diferencias A/B; términos faltantes explícitos. El informe JSON distingue respuestas manuales de ejecuciones con modelo.
2. **Ejecución A/B consistente:** congela prompt A, prompt B, modo, nombre de modelo y temperatura para las dos llamadas; registra latencia y nombre devuelto por el servidor. Si una llamada falla, conserva lo recibido sin inventar un resultado. No se atribuye calidad a las métricas.
3. **Evita informes obsoletos:** editar respuestas, criterios, campos del prompt o configuración invalida la exportación anterior hasta volver a analizar.
4. **iPhone/PWA:** iconos PNG Apple 180, Android/Chrome 192 y 512; manifest y caché actualizados a v2.3; pestañas del editor desplazables horizontalmente y áreas táctiles ampliadas; fuente de 16 px en campos para evitar zoom de enfoque; zonas seguras para notch; corrección de desbordamiento horizontal a 320 px.
5. **Telemetría más fiel a datos:** eliminado el denominador fijo `/181` del contador de palabras; se muestra tiempo de lectura **estimado** a 200 palabras/minuto en vez de velocidad falsa; se renombraron contadores basados en palabras y se retiraron timestamps decorativos del registro.
6. **Distribución:** versión HTML autónoma v2.3, paquete completo y carpeta PWA estática actualizada.

### Pruebas y limitaciones

- `python -m unittest discover -s tests -v`: **13 pruebas correctas**.
- `node tests/test_analyzer.cjs`: **9 correctas**.
- `node tests/test_compare.cjs`: **8 correctas**.
- `node tests/test_compare_v23.cjs`: **14 correctas**.
- `node --check web/*.js`: correcto.
- Chromium con viewport de **1440×900, 390×844, 375×667 y 320×568**: editor, criterios, ejecución A/B con backend **simulado**, exportación JSON, invalidación del informe y sin desbordamiento horizontal; sin errores JS.
- HTML autónomo abierto en Chromium y análisis A/B manual ejecutado; captura generada.
- Intento de prueba PWA mediante servidor local en Chromium: **bloqueado por la política de red del entorno** (`ERR_BLOCKED_BY_ADMINISTRATOR`). Los archivos de manifest/iconos/precaché sí fueron verificados; no se afirma instalación offline real.
- **No hay Ollama real disponible, ni prueba en Safari físico, ni sitio MIRA publicado.**

### Próximo pendiente

1. Publicar `web/` en un repositorio exclusivo de MIRA o destino expresamente autorizado y comprobar el enlace HTTPS.
2. Probar instalación, caché offline, gestos y memoria en un iPhone físico con Safari.
3. Conectar un backend seguro con un modelo real y medir latencia y fallos de A/B; nunca publicar claves en el frontend.
4. Mejorar el diseño de evaluación A/B con criterios semánticos opcionales y verificadores externos, claramente diferenciados de coincidencia literal.

### Restricciones de comunicación

Las partículas y el núcleo son una visualización inspirada en una referencia, no neuronas medidas. El índice es una heurística de estructura, no calidad ni exactitud. No afirmar que se entrenó un modelo real ni que se modificó ChatGPT. No afirmar trabajo continuo en segundo plano.
