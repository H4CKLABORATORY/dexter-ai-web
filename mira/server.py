#!/usr/bin/env python3
"""OMEGA Prompt Engine backend: local/online inference and opt-in persistent jobs.

Only for trusted local use. No keys are sent to frontend. No remote execution feature.
"""
import argparse
import json
import secrets
import os
import re
import sqlite3
import subprocess
import sys
import threading
import time
import traceback
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DATASETS = ROOT / 'datasets'
OUTPUT = ROOT / 'output'
WEB = ROOT / 'web'
DB = ROOT / 'jobs.sqlite3'
for p in (DATASETS, OUTPUT):
    p.mkdir(parents=True, exist_ok=True)

OLLAMA_URL = 'http://127.0.0.1:11434/api/chat'
OLLAMA_TAGS_URL = 'http://127.0.0.1:11434/api/tags'
ONLINE_URL = os.environ.get('OMEGA_ONLINE_URL', 'https://api.openai.com/v1/chat/completions')
ONLINE_KEY = os.environ.get('OMEGA_ONLINE_KEY', '')
ONLINE_MODEL = os.environ.get('OMEGA_ONLINE_MODEL', '')
ACCESS_TOKEN = os.environ.get('OMEGA_ACCESS_TOKEN', '')
# Comma-separated, explicit HTTPS origins for a separately hosted iPhone/PWA frontend.
ALLOWED_ORIGINS = tuple(x.strip() for x in (os.environ.get('OMEGA_ALLOWED_ORIGINS', '') + ',' + os.environ.get('OMEGA_ALLOWED_ORIGIN', '')).split(',') if x.strip())
MAX_BODY = 2_000_000
ALLOWED_JOB_TYPES = {'lora_train', 'online_fine_tune'}


def validate_frontend_origin(origin):
    """Reject wildcards, credentials, paths, query strings and insecure remote origins."""
    if not isinstance(origin, str) or origin != origin.strip() or not origin:
        raise ValueError('Origen de frontend inválido.')
    u = urlsplit(origin)
    if not u.hostname or u.username or u.password or u.path or u.query or u.fragment or u.scheme not in ('https', 'http'):
        raise ValueError('Origen de frontend inválido.')
    try: _ = u.port
    except ValueError as exc: raise ValueError('Puerto de frontend inválido.') from exc
    if u.scheme != 'https' and u.hostname not in ('localhost', '127.0.0.1', '::1'):
        raise ValueError('Los orígenes remotos requieren HTTPS.')
    if origin != f'{u.scheme}://{u.netloc}':
        raise ValueError('Usa un origen exacto sin barra final.')
    return origin


def now():
    return datetime.now(timezone.utc).isoformat()


def db_connect():
    conn = sqlite3.connect(DB, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db_connect() as c:
        c.execute('''CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL,
            data TEXT NOT NULL, result TEXT, attempts INTEGER NOT NULL DEFAULT 0,
            error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        )''')
        # Interrupted jobs are recoverable after restart. Re-run only an interrupted job once.
        c.execute("UPDATE jobs SET status='queued', updated_at=? WHERE status='running'", (now(),))


def row_to_dict(row):
    d = dict(row)
    d['data'] = json.loads(d['data'])
    if d['result']:
        try: d['result'] = json.loads(d['result'])
        except ValueError: pass
    return d


def valid_model(name):
    return isinstance(name, str) and bool(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._/-]{0,150}(?::[A-Za-z0-9][A-Za-z0-9._-]{0,50})?', name)) and '..' not in name and '//' not in name and not name.startswith('/')


def load_dataset(filename):
    if not isinstance(filename, str) or not re.fullmatch(r'dataset_[a-f0-9]{12}\.jsonl', filename):
        raise ValueError('Conjunto de datos no reconocido.')
    path = (DATASETS / filename).resolve()
    if path.parent != DATASETS.resolve() or not path.is_file():
        raise ValueError('Conjunto de datos no encontrado.')
    return path


def http_json(url, payload, key=None, timeout=110):
    body = json.dumps(payload).encode('utf-8')
    headers = {'Content-Type': 'application/json', 'User-Agent': 'OmegaPromptEngine/1.0'}
    if key: headers['Authorization'] = 'Bearer ' + key
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read(4_000_000).decode('utf-8'))
    except urllib.error.HTTPError as e:
        msg = e.read(1300).decode('utf-8', errors='replace')
        raise ValueError(f'Proveedor HTTP {e.code}: {msg}') from e


def ensure_https_provider(url):
    parts = urlsplit(url)
    if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password or parts.fragment:
        raise ValueError('La URL del proveedor remoto debe ser HTTPS y válida.')


def generate(req):
    mode = req.get('mode')
    prompt = str(req.get('prompt', '')).strip()
    if not prompt or len(prompt) > 50_000:
        raise ValueError('Prompt vacío o demasiado largo.')
    temp = req.get('temperature', 0.4)
    try: temp = float(temp)
    except (TypeError, ValueError): raise ValueError('Temperatura inválida.')
    if not 0 <= temp <= 2: raise ValueError('Temperatura fuera de rango.')
    if mode == 'local':
        model = str(req.get('model', 'llama3.2')).strip()
        if not valid_model(model): raise ValueError('Nombre de modelo inválido.')
        result = http_json(OLLAMA_URL, {
            'model': model, 'stream': False,
            'messages': [{'role': 'user', 'content': prompt}],
            'options': {'temperature': temp, 'num_predict': 1024}
        })
        return {'text': result.get('message', {}).get('content', ''), 'model': result.get('model', model), 'mode': mode}
    if mode == 'online':
        if not ONLINE_KEY or not ONLINE_MODEL:
            raise ValueError('Configura OMEGA_ONLINE_KEY y OMEGA_ONLINE_MODEL en el servidor.')
        ensure_https_provider(ONLINE_URL)
        result = http_json(ONLINE_URL, {
            'model': ONLINE_MODEL, 'messages': [{'role': 'user', 'content': prompt}],
        }, key=ONLINE_KEY)
        choices = result.get('choices') or []
        return {'text': choices[0].get('message', {}).get('content', '') if choices else '', 'model': ONLINE_MODEL, 'mode': mode}
    raise ValueError('Selecciona local u online.')


def enqueue(kind, data):
    if kind not in ALLOWED_JOB_TYPES: raise ValueError('Trabajo no permitido.')
    if not isinstance(data, dict): raise ValueError('Configuración de trabajo inválida.')
    dataset = load_dataset(data.get('dataset'))
    model = data.get('model', '')
    if not valid_model(model): raise ValueError('Nombre de modelo inválido.')
    if kind == 'online_fine_tune' and not os.environ.get('OMEGA_ENABLE_ONLINE_TRAIN') == '1':
        raise ValueError('El ajuste online está deshabilitado. Requiere proveedor compatible, facturación y autorización explícita.')
    if kind == 'lora_train':
        if os.environ.get('OMEGA_ENABLE_TRAIN') != '1':
            raise ValueError('Activa OMEGA_ENABLE_TRAIN=1 en el servidor para entrenar.')
        try: steps = int(data.get('steps', 30))
        except (TypeError, ValueError): raise ValueError('Número de pasos inválido.')
        if not 1 <= steps <= 2000: raise ValueError('Pasos permitidos: 1 a 2000.')
        data = {'dataset': dataset.name, 'model': model, 'steps': steps}
    else:
        data = {'dataset': dataset.name, 'model': model}
    job_id = uuid.uuid4().hex[:14]
    with db_connect() as conn:
        conn.execute('INSERT INTO jobs(id,kind,status,data,created_at,updated_at) VALUES(?,?,?,?,?,?)',
                     (job_id, kind, 'queued', json.dumps(data), now(), now()))
    return job_id


def online_tune(dataset, model):
    """OpenAI-compatible file upload and fine-tuning job endpoints; not universal.

    Provider controls eligibility, training access, supported models and billing.
    """
    if not ONLINE_KEY: raise ValueError('Falta OMEGA_ONLINE_KEY.')
    base = os.environ.get('OMEGA_TUNE_BASE_URL', 'https://api.openai.com/v1').rstrip('/')
    ensure_https_provider(base)
    # Multipart with random boundary, required by file upload endpoint.
    boundary = 'omega-' + uuid.uuid4().hex
    # Convert the local instruction/response format to chat SFT JSONL.
    converted = []
    for line in dataset.read_text(encoding='utf-8').splitlines():
        if not line.strip(): continue
        ex = json.loads(line)
        converted.append(json.dumps({'messages': [
            {'role':'user', 'content':ex['instruction']},
            {'role':'assistant', 'content':ex['response']}
        ]}, ensure_ascii=False))
    file_bytes = ('\n'.join(converted) + '\n').encode('utf-8')
    body = (
        f'--{boundary}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\nfine-tune\r\n'
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="training.jsonl"\r\n'
        'Content-Type: application/jsonl\r\n\r\n'
    ).encode() + file_bytes + f'\r\n--{boundary}--\r\n'.encode()
    def call(url, content, content_type):
        request = urllib.request.Request(url, data=content, headers={
            'Content-Type': content_type, 'Authorization': 'Bearer ' + ONLINE_KEY,
        }, method='POST')
        try:
            with urllib.request.urlopen(request, timeout=110) as res:
                return json.loads(res.read(500_000))
        except urllib.error.HTTPError as e:
            raise ValueError(f'Ajuste remoto rechazado (HTTP {e.code}): {e.read(1200).decode(errors="replace")}') from e
    upload = call(base + '/files', body, f'multipart/form-data; boundary={boundary}')
    if not upload.get('id'): raise ValueError('El proveedor no devolvió un identificador de archivo.')
    result = call(base + '/fine_tuning/jobs', json.dumps({'training_file': upload['id'], 'model': model}).encode(), 'application/json')
    return {'provider_job': result.get('id'), 'provider_status': result.get('status'), 'note': 'Trabajo enviado al proveedor; finalización y costos dependen de él.'}


def perform_job(job):
    data = json.loads(job['data'])
    dataset = load_dataset(data['dataset'])
    if job['kind'] == 'online_fine_tune':
        return online_tune(dataset, data['model'])
    if job['kind'] == 'lora_train':
        out_dir = OUTPUT / f'adapter_{job["id"]}'
        cmd = [sys.executable, str(ROOT / 'train_lora.py'), '--model', data['model'],
               '--dataset', str(dataset), '--output', str(out_dir), '--steps', str(data['steps'])]
        completed = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=60*60*5)
        log = (completed.stdout + '\n' + completed.stderr)[-6000:]
        (OUTPUT / f'job_{job["id"]}.log').write_text(log, encoding='utf-8')
        if completed.returncode:
            raise ValueError(f'Entrenamiento falló (código {completed.returncode}). Revisa output/job_{job["id"]}.log: {log[-900:]}')
        return {'adapter_directory': str(out_dir.relative_to(ROOT)), 'log': f'output/job_{job["id"]}.log'}
    raise ValueError('Trabajo no soportado.')


def worker():
    while True:
        try:
            with db_connect() as c:
                job = c.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1").fetchone()
                if job:
                    if job['attempts'] >= 2:
                        c.execute("UPDATE jobs SET status='failed',error=?,updated_at=? WHERE id=?", ('Máximo de reintentos después de interrupciones.', now(), job['id']))
                        job = None
                    else:
                        c.execute("UPDATE jobs SET status='running', attempts=attempts+1, updated_at=? WHERE id=?", (now(), job['id']))
            if not job:
                time.sleep(2)
                continue
            try:
                result = perform_job(job)
                with db_connect() as c:
                    c.execute("UPDATE jobs SET status='done',result=?,updated_at=? WHERE id=?", (json.dumps(result, ensure_ascii=False), now(), job['id']))
            except Exception as e:
                with db_connect() as c:
                    c.execute("UPDATE jobs SET status='failed',error=?,updated_at=? WHERE id=?", (str(e)[:2200], now(), job['id']))
        except Exception as e:
            print('worker error:', str(e), file=sys.stderr)
            time.sleep(3)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB), **kwargs)

    def origin_is_same_local(self, origin):
        # The local launcher serves both HTML and API from loopback.
        host = self.headers.get('Host', '')
        return origin == 'http://' + host and bool(re.fullmatch(r'(localhost|127\.0\.0\.1)(:[0-9]{1,5})?', host))

    def origin_permitted(self):
        origin = self.headers.get('Origin')
        return not origin or origin in ALLOWED_ORIGINS or self.origin_is_same_local(origin)

    def add_cors_headers(self):
        origin = self.headers.get('Origin')
        if origin and origin in ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Omega-Token')
            self.send_header('Access-Control-Max-Age', '600')
            self.send_header('Vary', 'Origin')

    def do_OPTIONS(self):
        if self.path not in ('/api/health', '/api/generate', '/api/jobs', '/api/datasets', '/api/models') or not self.headers.get('Origin') or not self.origin_permitted():
            return self.json_response(403, {'error':'Origen no autorizado.'})
        self.send_response(204)
        self.add_cors_headers()
        self.send_header('Content-Length', '0')
        self.end_headers()

    def json_response(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.add_cors_headers()
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def allowed(self):
        if not ACCESS_TOKEN: return True
        token = self.headers.get('X-Omega-Token', '')
        return bool(token and secrets.compare_digest(token, ACCESS_TOKEN))

    def get_json(self):
        try: n = int(self.headers.get('Content-Length', '0'))
        except ValueError: raise ValueError('Longitud inválida.')
        if not 0 < n <= MAX_BODY: raise ValueError('Cuerpo demasiado grande o vacío.')
        data = json.loads(self.rfile.read(n))
        if not isinstance(data, dict): raise ValueError('Se esperaba un objeto JSON.')
        return data

    def do_GET(self):
        if self.path.startswith('/api/'):
            if not self.origin_permitted(): return self.json_response(403,{'error':'Origen no permitido.'})
            if not self.allowed(): return self.json_response(401, {'error':'Token inválido.'})
            if self.path == '/api/health':
                return self.json_response(200, {'ok':True, 'local':True,
                    'online_configured':bool(ONLINE_KEY and ONLINE_MODEL),
                    'training_enabled':os.environ.get('OMEGA_ENABLE_TRAIN')=='1',
                    'online_training_enabled':os.environ.get('OMEGA_ENABLE_ONLINE_TRAIN')=='1'})
            if self.path == '/api/models':
                try:
                    with urllib.request.urlopen(OLLAMA_TAGS_URL,timeout=3) as ollama:
                        payload=json.loads(ollama.read(2_000_000))
                    models=[entry.get('name','') for entry in payload.get('models',[]) if isinstance(entry,dict) and valid_model(entry.get('name'))]
                    return self.json_response(200, {'ok':True,'models':models})
                except (OSError,ValueError,KeyError) as e:
                    return self.json_response(503, {'error':'Ollama no responde en esta computadora.', 'models':[]})
            if self.path == '/api/jobs':
                with db_connect() as c:
                    rows = c.execute('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 30').fetchall()
                return self.json_response(200, {'jobs':[row_to_dict(r) for r in rows]})
            if re.fullmatch('/api/jobs/[a-f0-9]{14}', self.path):
                with db_connect() as c: job = c.execute('SELECT * FROM jobs WHERE id=?', (self.path.rsplit('/',1)[1],)).fetchone()
                return self.json_response(200, {'job': row_to_dict(job)}) if job else self.json_response(404, {'error':'No existe.'})
            return self.json_response(404, {'error':'Ruta desconocida.'})
        if urlsplit(self.path).path == '/': self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        if not self.path.startswith('/api/'):
            return self.json_response(404, {'error':'Ruta desconocida.'})
        if not self.origin_permitted(): return self.json_response(403,{'error':'Origen no permitido.'})
        if not self.allowed(): return self.json_response(401, {'error':'Token inválido.'})
        try:
            data = self.get_json()
            if self.path == '/api/generate':
                return self.json_response(200, generate(data))
            if self.path == '/api/datasets':
                samples = data.get('samples')
                if not isinstance(samples, list) or not 2 <= len(samples) <= 2000:
                    raise ValueError('Proporciona entre 2 y 2000 ejemplos.')
                lines = []
                for s in samples:
                    if not isinstance(s, dict) or not all(isinstance(s.get(k), str) and 1 <= len(s[k]) <= 5000 for k in ('instruction','response')):
                        raise ValueError('Ejemplos inválidos: instruction y response deben ser texto.')
                    lines.append(json.dumps({'instruction':s['instruction'], 'response':s['response']}, ensure_ascii=False))
                filename = f'dataset_{uuid.uuid4().hex[:12]}.jsonl'
                (DATASETS / filename).write_text('\n'.join(lines)+'\n',encoding='utf-8')
                return self.json_response(201, {'dataset':filename, 'count':len(lines)})
            if self.path == '/api/jobs':
                job_id = enqueue(data.get('kind'), data.get('config'))
                return self.json_response(201, {'id':job_id, 'status':'queued'})
            return self.json_response(404, {'error':'Ruta desconocida.'})
        except (ValueError, json.JSONDecodeError) as e:
            return self.json_response(400, {'error':str(e)})
        except urllib.error.URLError as e:
            return self.json_response(502, {'error':'No se pudo conectar: '+str(e.reason)})
        except Exception as e:
            traceback.print_exc()
            return self.json_response(500, {'error':'Fallo interno: '+str(e)[:300]})


def main():
    parser = argparse.ArgumentParser(description='OMEGA Prompt Engine')
    parser.add_argument('--host', default='127.0.0.1', help='127.0.0.1 por defecto (LAN: 0.0.0.0 con token)')
    parser.add_argument('--port', default=8765, type=int)
    args = parser.parse_args()
    if args.host not in ('127.0.0.1', 'localhost') and (not ACCESS_TOKEN or len(ACCESS_TOKEN)<24):
        parser.error('Para exponer el servidor en red configura OMEGA_ACCESS_TOKEN.')
    ensure_https_provider(ONLINE_URL)
    for origin in ALLOWED_ORIGINS: validate_frontend_origin(origin)
    if ALLOWED_ORIGINS and (not ACCESS_TOKEN or len(ACCESS_TOKEN)<24):
        parser.error('Para habilitar un frontend remoto configura OMEGA_ACCESS_TOKEN.')
    init_db()
    threading.Thread(target=worker,daemon=True).start()
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f'OMEGA Prompt Engine: http://{args.host}:{args.port}/')
    try: httpd.serve_forever()
    except KeyboardInterrupt: pass
    finally: httpd.server_close()


if __name__=='__main__':
    main()
