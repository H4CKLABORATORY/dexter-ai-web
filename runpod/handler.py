import runpod
import json
import urllib.request
import urllib.error

MODEL = "Godmoded/llama3-lexi-uncensored"

def handler(event):
    payload = event.get("input") or {}
    if not isinstance(payload, dict):
        return {"error": "Input inválido"}
    if str(payload.get("model", "")).lower().removesuffix(":latest") != MODEL.lower():
        return {"error": "Modelo no permitido"}
    messages = payload.get("messages")
    if not isinstance(messages, list) or not 0 < len(messages) <= 60:
        return {"error": "Mensajes inválidos"}
    clean = []
    for message in messages:
        if not isinstance(message, dict): continue
        role, content = message.get("role"), message.get("content")
        if role in ("user", "assistant", "system") and isinstance(content, str) and len(content) <= 10000:
            clean.append({"role": role, "content": content})
    if not clean:
        return {"error": "Sin mensajes"}
    data = json.dumps({"model": MODEL, "messages": clean, "stream": False, "options": {"num_ctx": 2048}}).encode()
    request = urllib.request.Request("http://127.0.0.1:11434/api/chat", data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            output = json.load(response)
        return {"message": output.get("message", {})}
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        return {"error": str(error)}

runpod.serverless.start({"handler": handler})
