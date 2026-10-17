# XENO LAB 2.0 — Estado y continuidad

## Funcional en navegador (modo local)
- Interpretación de `6EQUJ5` como niveles cuantizados de la señal Wow! y graficación.
- Selección, catálogo, hipótesis e investigación de glifos en imágenes.
- Estadística de secuencias: frecuencias, entropía Shannon, índice de coincidencia, bigramas/trigramas, autocoincidencia, entropía condicional Markov, pruebas por permutaciones.
- Transformada discreta de Fourier DFT con ventana Hann (hasta 256 muestras).
- Optimización por recocido simulado, calculada en hardware clásico, para hipótesis de descifrado de sustitución A–Z. No es computación cuántica ni prueba de traducción.
- Generador de conceptos de invención parametrizable, hipótesis y posibles prototipos, riesgos, enlace a búsqueda de patentes y exportación de cartera JSON.
- XenoScript 0.1, intérprete en JavaScript: DATOS, FRECUENCIA, ENTROPIA, NGRAMAS 2|3|4, MARKOV, AUTOCORR 1..20, PERMUTA 100..3000.
- Consulta opcional a la API de transferencia tecnológica de NASA; puede fallar por CORS.

## Fuentes científicas y de investigación
- NASA, tecnofirmas: https://science.nasa.gov/universe/search-for-life/searching-for-signs-of-intelligent-life-technosignatures/
- NASA Transferencia API: https://technology.nasa.gov/api/
- NASA TechPort: https://techport.nasa.gov/
- NASA Patentes: https://technology.nasa.gov/patents
- turboSETI Doppler search: https://github.com/UCBerkeleySETI/turbo_seti
- blimpy data formats: https://github.com/UCBerkeleySETI/blimpy
- WIPO PATENTSCOPE: https://patentscope.wipo.int/
- USPTO Patent Public Search: https://ppubs.uspto.gov/pubwebapp/
- Google Patents: https://patents.google.com/

## Límites importantes
- No se incluyen todos los algoritmos de NASA. turboSETI y blimpy son referencias, NO motores importados. Sus archivos astronómicos especializados requieren backend Python si se integran más adelante.
- XenoScript es un DSL experimental, NO demostrado superior a C++, Rust o Python.
- Las ideas generadas NO fueron certificadas como novedosas, patentables, realizables o lucrativas.
- Como web estática, no funciona «siempre» mientras el navegador está cerrado. Los recordatorios de ChatGPT son un sistema separado y no reanudan código solos.
- Datos de usuario y bocetos se procesan en navegador, excepto si se pulsa la consulta explícita a NASA.

## Ejecutar
Abrir `XENO_LAB_2.html` en navegador móvil para trabajar con todas las funciones en un solo archivo, o subir `web/index.html` a una carpeta accesible en hosting estático gratuito. GitHub Pages debe estar habilitado en el repositorio para que la dirección pública exista.

## Próximas fases reales
1. Añadir backend científico opcional para conjuntos de datos de radio (blimpy y turboSETI), con cuotas de proceso.
2. Implementar OCR/segmentación robusta, clasificación de alfabetos y pruebas contra textos conocidos; evaluar precisión en corpus etiquetados.
3. Indexar fuentes de anterioridad patentaria con APIs autorizadas y revisión humana.
4. Guardado multi-dispositivo cifrado, cuentas y búsqueda programada bajo límites de servicio.
5. Benchmark del DSL y mejores pipelines en Python/Rust/C++ antes de alegar superioridad.