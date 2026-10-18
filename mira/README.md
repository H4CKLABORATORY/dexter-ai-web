# MIRA Neural Prompt Studio v2.4 — Programa de atlas neuronal

Interfaz inmersiva inspirada en la captura facilitada por el usuario. Incluye un atlas Canvas animado, editor de cinco secciones, auditoría estructural offline, laboratorio A/B y conexión opcional a motores IA autorizados. **No es el código original del demo de Entrelligence, no observa neuronas de ChatGPT y no cambia sus algoritmos internos.**

## Empezar sin servidor

- **PC:** abre `MIRA_STANDALONE_v2.4.html` en un navegador compatible; si usas el ZIP completo, ejecuta `python server.py` y abre la dirección que muestra el programa.
- **iPhone:** publica el contenido de `web/` como sitio estático bajo HTTPS; abre la dirección en Safari y usa Compartir → Añadir a pantalla de inicio. La carpeta incluye iconos PNG de 180, 192 y 512 px, manifest y caché de aplicación para uso offline **después de la primera carga e instalación correctas**. No se ha probado en un iPhone físico.
- **Sin conexión:** editar, auditar, mejorar la estructura, importar/exportar proyectos JSON y comparar respuestas pegadas manualmente. No genera respuestas de IA por sí mismo.

La versión HTML autónoma no instala una PWA ni requiere archivos auxiliares. Algunos visores de archivos de iPhone no permiten ejecutar JavaScript local; para uso estable en Safari se recomienda alojar `web/` por HTTPS.

## Laboratorio A/B mejorado en v2.4

1. Abre LAB A/B y pulsa **GUARDAR PROMPT ORIGINAL (A)**.
2. Modifica el prompt en el editor para crear B.
3. Opcionalmente escribe hasta 20 **criterios observables**, uno por línea, por ejemplo `fuentes`, `conclusión`, `pasos verificables`.
4. Pega ambas respuestas y pulsa **ANALIZAR**, o conecta un modelo y pulsa **EJECUTAR A/B**.
5. Durante la ejecución puedes pulsar **CANCELAR A/B** para detener las solicitudes desde el navegador. Esto no garantiza que el servidor deje de generar; el backend podría continuar consumiendo recursos.
6. Obtendrás conteos de palabras y caracteres, solapamiento Jaccard de palabras únicas, presencia literal de los criterios en cada respuesta, diferencias en puntos porcentuales y un informe JSON. Los criterios ignoran mayúsculas y tildes y respetan límites de palabra/frase.

Al ejecutar un modelo, MIRA congela ambos prompts y la configuración del motor para la comparación y registra latencia de cada llamada y modelo devuelto por el backend. Si se cambian respuestas, criterios, prompts o configuración, se invalida el informe anterior hasta volver a analizar. Si editas el prompt durante una ejecución A/B, no se genera automáticamente un informe atribuido al modelo; debes revisar las respuestas y analizarlas manualmente. **Ni la presencia de términos ni la similitud demuestran calidad, cumplimiento semántico o veracidad.** Las respuestas manuales se identifican como tales y no se atribuyen a un modelo.

## Conectar IA real en computadora

1. Instala Python 3 y Ollama; descarga un modelo, por ejemplo con `ollama pull llama3.2`.
2. Ejecuta `python server.py` desde la carpeta principal (o el lanzador Windows/macOS/Linux) y abre el navegador en `http://127.0.0.1:8765/`.
3. En MOTOR IA, pulsa **BUSCAR MODELOS OLLAMA INSTALADOS** y selecciona un modelo. Los nombres con etiquetas, como `llama3.2:latest`, son válidos.
4. Pulsa **PROBAR CONEXIÓN** y después **EJECUTAR PROMPT** o **EJECUTAR A/B**.

Las pruebas de backend usan Ollama **simulado**. La inferencia con un modelo real sigue sin verificarse en este entorno. Los módulos LoRA requieren dependencias, GPU, datos adecuados y habilitación explícita; no entrenan ChatGPT.

## iPhone con un motor remoto

Una página alojada en GitHub Pages solo puede servir archivos estáticos: no ejecuta Python, Ollama ni GPU. Para IA real desde el teléfono necesitas un backend independiente accesible por HTTPS, bajo tu control, con token secreto y una lista de orígenes autorizados. El frontend permite introducir temporalmente URL HTTPS y token. **No publiques el token ni claves de proveedores en GitHub Pages.**

En el backend, con proxy HTTPS delante y controles de acceso:

```sh
export OMEGA_ACCESS_TOKEN='REEMPLAZAR_POR_TOKEN_ALEATORIO_DE_24_CARACTERES_O_MAS'
export OMEGA_ALLOWED_ORIGINS='https://TU-USUARIO.github.io'
python server.py --host 127.0.0.1 --port 8765
```

No expongas `server.py` directamente a Internet: sirve HTTP, no TLS, y no es un servicio SaaS multiusuario. Las llamadas a proveedores remotos pueden costar dinero.

## Pruebas reproducibles

```sh
python -m unittest discover -s tests -v
node tests/test_analyzer.cjs
node tests/test_compare.cjs
node tests/test_compare_v23.cjs
node --check web/studio.js
```

En esta entrega: **14 pruebas Python** (incluye pruebas HTTP con Ollama simulado, interfaz Chromium en 1440×900, 390×844, 375×667 y 320×568, iconos/manifest) y **31 comprobaciones JavaScript** (9 auditoría, 8 comparador anterior, 14 criterios A/B). La versión autónoma fue inspeccionada y el mismo código de interfaz se probó inyectado en Chromium; este entorno bloquea la navegación directa a archivos locales. Se probaron cancelación durante A, cancelación durante B y edición durante B en Chromium a 1440, 390 y 320 px. **Safari físico, instalación PWA real, inferencia en GPU y publicación online no están comprobados.**

Consulta `CONTINUIDAD.md` para el estado exacto y próximos pasos.
