#!/bin/sh
set -eu
ollama serve >/tmp/ollama.log 2>&1 &
for i in $(seq 1 120); do
  if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null; then break; fi
  sleep 2
done
ollama pull Godmoded/llama3-lexi-uncensored
exec python3 /app/handler.py
