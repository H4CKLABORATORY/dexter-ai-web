# Dexter Video Studio — OpenCreator + FFmpeg

Módulo independiente para crear videos de YouTube, YouTube Shorts y TikTok, especialmente Free Fire. No cambia la página pública, el backend ni los otros proyectos.

## Estado comprobable

- Python 3.9+ y FFmpeg local: crea proyectos, conserva el original, genera MP4 horizontales (1920×1080), verticales (1080×1920), recortes de tiempo y fotogramas para miniaturas.
- Adaptador **opcional** al CLI documentado de OpenCreator/KrillinAI: subtitle, render-horizontal y render-vertical.
- Por defecto OpenCreator solo recibe --dry-run: no consume créditos ni realiza solicitudes a proveedores. Solo --execute habilita las operaciones reales.
- NO incluye OpenCreator instalado en tu PC, servicios externos, modelos de pago, publicación automática ni análisis de highlights por IA. GitHub Pages no puede ejecutar este software de escritorio.

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
