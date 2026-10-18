"""Integration tests: browser preflight and authenticated API over a real local HTTP server."""
import json
import pathlib
import sys
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import server


class TestCorsAndModelAPI(unittest.TestCase):
    def test_origin_validation(self):
        self.assertEqual(server.validate_frontend_origin('https://example.github.io'), 'https://example.github.io')
        for origin in ('*', 'http://evil.example', 'https://evil.example/path',
                       'https://user:secret@example.org', 'https://example.org/', 'null'):
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                server.validate_frontend_origin(origin)

    def test_cross_origin_preflight_auth_and_rejection(self):
        token='a'*32
        with patch.object(server, 'ACCESS_TOKEN', token), patch.object(server, 'ALLOWED_ORIGINS', ('https://mira.example',)):
            httpd=ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
            thread=threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            base=f'http://127.0.0.1:{httpd.server_port}'
            def request(path, method='GET', origin=None, auth=False, body=None):
                headers={}
                if origin: headers['Origin']=origin
                if auth: headers['X-Omega-Token']=token
                if body is not None: headers['Content-Type']='application/json'
                req=urllib.request.Request(base+path, data=json.dumps(body).encode() if body is not None else None,
                                           method=method, headers=headers)
                try:
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        return resp.status, dict(resp.headers), resp.read()
                except urllib.error.HTTPError as exc:
                    return exc.code, dict(exc.headers), exc.read()
            try:
                code,headers,_=request('/api/health','OPTIONS',origin='https://mira.example')
                self.assertEqual(code,204)
                self.assertEqual(headers.get('Access-Control-Allow-Origin'),'https://mira.example')
                self.assertIn('X-Omega-Token',headers.get('Access-Control-Allow-Headers',''))
                code,headers,_=request('/api/health','OPTIONS',origin='https://evil.example')
                self.assertEqual(code,403)
                self.assertNotIn('Access-Control-Allow-Origin',headers)
                code,_,_=request('/api/health',origin='https://mira.example')
                self.assertEqual(code,401)
                code,headers,data=request('/api/health',origin='https://mira.example',auth=True)
                self.assertEqual(code,200)
                self.assertTrue(json.loads(data)['ok'])
                self.assertEqual(headers.get('Access-Control-Allow-Origin'),'https://mira.example')
                with patch.object(server,'generate',return_value={'text':'respuesta del motor','model':'mock','mode':'local'}) as generate:
                    code,headers,data=request('/api/generate','POST',origin='https://mira.example',auth=True,
                                               body={'mode':'local','model':'llama3.2','prompt':'Hola'})
                    self.assertEqual(code,200)
                    self.assertEqual(json.loads(data)['text'],'respuesta del motor')
                    self.assertEqual(generate.call_count,1)
                    code,_,_=request('/api/generate','POST',origin='https://evil.example',auth=True,
                                     body={'mode':'local','model':'llama3.2','prompt':'Hola'})
                    self.assertEqual(code,403)
                    self.assertEqual(generate.call_count,1)
            finally:
                httpd.shutdown()
                httpd.server_close()
                thread.join(timeout=5)


if __name__=='__main__': unittest.main()
