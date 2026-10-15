# DEXTER AI — servidor de inferencia CPU sin escritorio

Esta alternativa funciona en una máquina Linux x86_64 o ARM64 compatible con Docker. Se recomienda al menos 8 GB de RAM (mejor 12–16 GB), 10 GB de disco disponible y varios núcleos de CPU. El modelo puede ser extremadamente lento sin GPU. Las limitaciones de memoria pueden impedir el inicio.

## Instalación

1. Instala Docker Engine y Compose en el servidor.
2. En esta carpeta ejecuta:

```bash
docker compose up -d
docker compose exec ollama ollama pull Godmoded/llama3-lexi-uncensored
docker compose exec ollama ollama list
curl http://127.0.0.1:11434/api/tags
```

La API queda vinculada **solo a localhost**, sin exposición pública. Para conectarla al backend de Render, se necesita una red privada o proxy HTTPS autenticado y protegido. **No abras 11434 directamente a Internet.**

Esto no instala ni ejecuta un Windows en el servidor. Es una configuración más ligera para ejecutar el mismo modelo Ollama. No hay GPU ni host CPU aprovisionado automáticamente.
