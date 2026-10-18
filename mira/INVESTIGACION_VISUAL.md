# Investigación y despiece de referencia — 17 octubre 2026

## Evidencia

1. Referencia primaria: captura recibida del usuario, interfaz tipo terminal dentro de una publicación de Entrelligence (`@entrelligence`), texto: "This prompt-building demo visualises how a role, objective, context and rules fit together, then adds review and execution steps".
2. Coincidencia parcial de la descripción indexada de la publicación en Facebook: https://www.facebook.com/groups/276508939647674/posts/2147051522593397/ . Se encontró el texto, **no** archivos originales ni código fuente con licencia de reutilización.
3. No se localizó un repositorio original verificable después de buscar las frases `studio.prompt`, `CRAWLER.PY`, `COVERAGE RADAR`, `Entrelligence`, `prompt-building demo`. No se debe atribuir esta implementación al autor original ni afirmar que su motor interno se conoce.

## Composición observada (captura comprimida)

- Proporción del panel del demo: alrededor de 687 × 842 píxeles dentro de una pantalla social; no es la proporción del dispositivo completo.
- Fondo de escenario negro azulado con partículas blanquecinas y verde turquesa, conexiones muy finas, algunas estelas curvas.
- Barra técnica superior delgada con contadores (`LINES`, `TENTACLES`, `WORDS`, `LINKS`, `FLAGS`, `FPS`) y marca `studio.prompt` rosa.
- Barra de siete etapas `role | objective | context | roles | rules | review | start`, fase `rules` resaltada en menta.
- Núcleo radial entre la zona media e inferior, múltiples tentáculos turquesa, diamante rosa, etiquetas pequeñas rectangulares.
- Cuadros luminosos amarillos distribuidos irregularmente en la escena.
- Franja inferior con **seis** instrumentos oscuros: `CRAWL LOG`, `SECTIONS`, `COVERAGE RADAR`, `WORD HEAT`, `SPEC SCORE`, `CRAWLER.PY`. El indicador circular de la muestra dice **72**, que no puede tomarse como una medida científica de calidad ni como un valor que deba fijarse en los datos reales.
- Tipografía monoespaciada pequeña, predominan negro, cian, menta y rosa; poco redondeo y bordes ultrafinos.

## Implementación elegida

- Canvas 2D nativo para nubes de puntos y tendrilos, sin dependencias externas. MDN documenta la API: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
- `requestAnimationFrame` para sincronizar el dibujo con el navegador y controlar la cadencia: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- DPR adaptable, sin asumir que un iPhone tiene solo 1 píxel por punto CSS: https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
- Se limitaron y adaptaron las partículas a pantallas móviles; para optimizaciones de renderización progresivas: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- Soporte de movimiento reducido: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion
- Manifest `standalone` y caché estática para experiencia tipo programa desde pantalla de inicio: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- Guía oficial para abrir como app en iPhone: https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27

## Lo que no permite deducir una captura

La cámara 3D auténtica, el lenguaje de shaders, los datos originales, la física de las partículas, los fotogramas intermedios, la tipografía precisa, los comandos reales del supuesto crawler, los eventos de interacción y la arquitectura del autor. **La reconstrucción es original y aproxima la estética, no verifica equivalencia exacta.** Si se proporciona el video original sin la interfaz de la red social, pueden ajustarse movimiento, proporciones y colocación con mayor fidelidad.
