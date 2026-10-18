"""Real HTTP, mocked Ollama endpoint. No claim that Ollama model was executed."""
import json
import pathlib
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import server

class MockOllama(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_GET(self):
        raw=json.dumps({'models':[{'name':'llama3.2:latest'},{'name':'qwen2.5:3b'},{'name':'bad;unsafe'}]}).encode()
        self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
    def do_POST(self):
        self.server.last_payload=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        data=json.dumps({'model':'testmodel:latest','message':{'content':'Respuesta desde endpoint Ollama simulado'}}).encode()
        self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)

class EndToEnd(unittest.TestCase):
    def test_full_http_generation_and_cross_origin_rejection(self):
        ollama=ThreadingHTTPServer(('127.0.0.1',0),MockOllama)
        app=ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        oth=threading.Thread(target=ollama.serve_forever,daemon=True);oth.start()
        ath=threading.Thread(target=app.serve_forever,daemon=True);ath.start()
        try:
            with patch.object(server,'OLLAMA_URL',f'http://127.0.0.1:{ollama.server_port}/api/chat'), patch.object(server,'OLLAMA_TAGS_URL',f'http://127.0.0.1:{ollama.server_port}/api/tags'):
                url=f'http://127.0.0.1:{app.server_port}/api/generate'
                r=Request(url,data=json.dumps({'mode':'local','model':'testmodel:latest','prompt':'Hola desde MIRA'}).encode(),headers={'Content-Type':'application/json'})
                with urlopen(r,timeout=5) as res: answer=json.load(res)
                self.assertEqual(answer['text'],'Respuesta desde endpoint Ollama simulado')
                self.assertEqual(ollama.last_payload['messages'][0]['content'],'Hola desde MIRA')
                with urlopen(f'http://127.0.0.1:{app.server_port}/api/models',timeout=5) as res: models=json.load(res)['models']
                self.assertEqual(models,['llama3.2:latest','qwen2.5:3b'])
                r=Request(url,data=json.dumps({'mode':'local','prompt':'Hola'}).encode(),headers={'Content-Type':'application/json','Origin':'https://attacker.invalid'})
                with self.assertRaises(HTTPError) as ctx:urlopen(r,timeout=5)
                self.assertEqual(ctx.exception.code,403)
        finally:app.shutdown();ollama.shutdown();app.server_close();ollama.server_close()

if __name__=='__main__':unittest.main()
