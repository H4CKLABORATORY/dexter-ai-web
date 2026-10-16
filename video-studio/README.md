# Dexter Video Studio — OpenCreator + FFmpeg

Módulo independiente para crear videos de YouTube, YouTube Shorts y TikTok, especialmente Free Fire. No cambia la página pública, el backend ni los otros proyectos.

## Estado comprobable

- Python 3.9+ y FFmpeg local: crea proyectos, conserva el original, genera MP4 horizontales (1920×1080), verticales (1080×1920), recortes de tiempo y fotogramas para miniaturas.
- Adaptador **opcional** al CLI documentado de OpenCreator/KrillinAI: subtitle, render-horizontal y render-vertical.
- Por defecto OpenCreator solo recibe --dry-run: no consume créditos ni realiza solicitudes a proveedores. Solo --execute habilita las operaciones reales.
- NO incluye OpenCreator instalado en tu PC, servicios externos, modelos de pago, publicación automática ni análisis de highlights por IA. GitHub Pages no puede ejecutar este software de escritorio.

## Interfaz gráfica para Windows (sin consola)

Con Python 3 instalado, abre PowerShell en esta carpeta y ejecuta: py -3 gui.py. Selecciona tu grabación con el botón Buscar, escribe nombre, pulsa Preparar proyecto y luego Exportar MP4. Funciona sin cuentas, sin nube y sin pagos. Esta ventana usa los mismos comandos de studio.py: requiere FFmpeg para exportar. OpenCreator no se controla desde esta ventana.

## Guía Windows sin costes obligatorios

1. Instala Python 3 y FFmpeg desde las fuentes oficiales: https://www.python.org/downloads/ y https://ffmpeg.org/download.html. Agrega FFmpeg al PATH.
2. Abre PowerShell dentro de video-studio.
3. Ejecuta los comandos y usa tu grabación original:

~~~powershell
py -3 studio.py check
py -3 studio.py prepare --name "Cazando Interesadas 01" --source "D:\Grabaciones\freefire.mp4"
py -3 studio.py render --job cazando-interesadas-01 --platform youtube
py -3 studio.py render --job cazando-interesadas-01 --platform shorts
py -3 studio.py render --job cazando-interesadas-01 --platform tiktok --start 60 --duration 30
py -3 studio.py thumbnail --job cazando-interesadas-01 --second 12
~~~

Los resultados quedan dentro de jobs/<proyecto>/: input/ guarda la grabación, brief.md el guion y exports/ el MP4 y la miniatura.

Para Free Fire ultrawide: --layout fit (por defecto) mantiene el contenido sin recortes y puede introducir bandas. --layout crop llena todo el encuadre pero elimina partes del original. --gpu intenta codificación NVENC si tu driver y FFmpeg la admiten. --preview enseña el comando sin procesar y --overwrite permite sustituir una salida existente.

## Integración opcional con CLI de OpenCreator

Instalador OpenCreator: https://github.com/krillinai/OpenCreator/releases

La aplicación visual y su CLI son diferentes: disponer del instalador visual no garantiza que puedas invocar desde esta carpeta el ejecutable krillinai-cli.exe. Al compilar el código fuente del upstream con pnpm krillinai:build se genera normalmente la ruta Windows .runtime/build/krillinai/win32-x64/bin/krillinai-cli.exe. El directorio de ejecución es runtime/krillinai, y su config/config.toml debe estar configurado correctamente según instrucciones oficiales.

~~~powershell
py -3 studio.py opencreator --job cazando-interesadas-01 --stage subtitle --cli "C:\OpenCreator\.runtime\build\krillinai\win32-x64\bin\krillinai-cli.exe" --cwd "C:\OpenCreator\runtime\krillinai"
~~~

Sin --execute se hace dry-run. Cuando tengas transcripción, servicios y costos configurados, agrega --execute de forma consciente. Las etapas de render posteriores requieren origin_video.mp4 y los subtítulos generados por OpenCreator. Los proveedores configurados pueden recibir datos o cobrar.

Documentación fuente:
- https://github.com/krillinai/OpenCreator/blob/master/skills/krillinai-cli/SKILL.md
- https://github.com/krillinai/OpenCreator/blob/master/skills/krillinai-cli/references/cli-contract.md

## Seguridad y alcance

Este script no descarga material ajeno, no publica a YouTube/TikTok, no expone servidores, no contacta la nube y no guarda tokens. No subas videos, secretos ni archivos config.toml al repositorio. FFmpeg funciona localmente; OpenCreator puede enviar datos a proveedores al activar su ejecución real.

Flujo: grabar Free Fire → preparar proyecto → completar brief.md → exportar horizontal y vertical → opcional OpenCreator para subtítulos y miniaturas → revisar manualmente → publicar manualmente.


## Modo Free Fire — biblioteca de estilo y editor de referencia

La biblioteca vive sólo en TU PC, en video-studio/library/ (excluida de GitHub). No subas guiones privados, memes, audio ni videos. Inicialízala:

~~~powershell
py -3 reference_lab.py init
py -3 reference_lab.py add --kind script --file "D:\Guiones\cazando-interesadas.txt"
py -3 reference_lab.py add --kind reference --file "D:\Referencias\ejemplo-edit.mp4"
py -3 reference_lab.py add --kind meme --file "D:\Memes\sorpresa.png" --tags "sorpresa,confusion" --license owned
py -3 reference_lab.py analyze
~~~

Opcional: importar tu TikTok público **sin eludir restricciones**, sólo material propio o con permiso. Requiere tener yt-dlp instalado. Se descargan **máximo 8 videos por defecto**; sin cookies ni accesos privados. TikTok puede bloquear o modificar su funcionamiento, por lo que es más fiable proporcionar MP4 de tus propios videos.

~~~powershell
py -3 reference_lab.py tiktok --url "https://www.tiktok.com/@TU_CUENTA" --name "mis-videos" --limit 8 --authorized
~~~

El análisis de referencia identifica duración, formato, cambios de escena aproximados, silencios y ritmo de montaje. Si adjuntas un archivo .srt con el mismo nombre que el MP4, calcula métricas de subtítulos. **NO interpreta automáticamente memes, posición de texto, quién habla ni copia ninguna voz**. Es un diagnóstico técnico, no una lectura multimodal inteligente.

### Transcribe tu gameplay sin pagar a una API

Instala opcionalmente faster-whisper (modelo gratuito/local; la primera descarga necesita Internet y almacenamiento). En tu PC puedes usar CPU, o GPU CUDA con requisitos adicionales.

~~~powershell
py -3 -m pip install faster-whisper
py -3 reference_lab.py transcribe --file "D:\Grabaciones\freefire.mp4" --output "D:\Grabaciones\freefire.srt" --language es --model small
~~~

Transcribe para generar tiempos de subtítulos de TU voz. Revisa nombres propios, puntuación y palabras de Free Fire.

### Crear un plan editable y exportar la edición

~~~powershell
py -3 editor.py plan --job cazando-interesadas-01 --platform tiktok --layout fit --target 30 --remove-silences --srt "D:\Grabaciones\freefire.srt" --script "D:\Guiones\cazando-interesadas.txt"
~~~

Se genera jobs/cazando-interesadas-01/edit-plan.json con cortes, subtítulos, secciones de guion, memes sugeridos y avisos de revisión. Los cortes automáticos quitan silencios, **no identifican jugadas emocionantes ni humor**. Si no hay SRT, no hay subtítulos sincronizados.

Las sugerencias de meme vienen de etiquetas que tú colocas en imágenes de tu biblioteca. **No se insertan sin aprobación:** copia eventos de meme_suggestions a meme_events_approved en el JSON para que aparezcan en el video.

~~~powershell
py -3 editor.py render --job cazando-interesadas-01 --burn-captions
~~~

Se exporta un MP4 con los cortes elegidos, tu audio original, subtítulos incrustados y **memes de imagen** aprobados. FFmpeg debe tener soporte libass para incrustar subtítulos. Los memes de audio/video, selección semántica de momentos y posicionamiento visual automático se reservan para una fase posterior. Si editas el plan, vuelve a exportar con --overwrite.

### Voz femenina en shorts (opcional)

- Puedes usar una **voz sintética instalada en Windows** a través de pyttsx3, sin clonar a otra creadora.
- Las voces disponibles dependen de tu PC. Instala pyttsx3 con py -3 -m pip install pyttsx3 y consulta py -3 editor.py voices.
- Genera una pista desde tu guion: py -3 editor.py narrate --job cazando-interesadas-01 --script "D:\Guiones\narracion.txt" --voice "ID_DE_VOZ_INSTALADA".
- Después registra la ruta de narration.wav en la propiedad voiceover del plan JSON. El render mezcla esa pista con el audio original a un volumen menor. Esta versión lee el texto seguido, no alinea cada oración automáticamente.
- También puedes utilizar una locución femenina que tengas permiso de usar. Una voz de un TikTok no se clona ni se reutiliza sin autorización.

### Interfaz visual

Ejecuta py -3 gui.py. La ventana permite seleccionar tu grabación, preparar proyecto, guardar referencias, analizar la biblioteca, seleccionar guion/SRT, crear el plan y exportar el video. Para enlaces TikTok, transcripción local y narración, usa los comandos documentados.

### Lo que falta para edición profesional totalmente automática

Se necesita un modelo multimodal compatible para interpretar personajes, eventos, chistes, texto en pantalla y comparar en detalle los ejemplos con tus nuevos videos. También se necesita un modelo de alineación para narración escena por escena y un editor de timeline visual para revisar. **Estas funciones no están conectadas hoy**, y no es correcto afirmar que el editor ya puede aprender todo un canal de TikTok por sí solo.

### Crear la guía de estilo a partir de la biblioteca

Con los videos de referencia analizados y los guiones/memes importados, ejecuta `py -3 style_report.py` o usa el botón **Generar guía de estilo**. Crea `library/EDITING_STYLE_GUIDE.md` con vocabulario real, duración mediana aproximada de escenas, formatos y reglas de edición. El archivo puede adjuntarse como contexto al agente de OpenCreator/Codex. No es un modelo entrenado ni implica que se hayan comprendido visualmente los videos.
