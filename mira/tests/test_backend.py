import json
import os
import pathlib
import sqlite3
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import server

class TestValidation(unittest.TestCase):
    def test_valid_model(self):
        self.assertTrue(server.valid_model('Qwen/Qwen2.5-3B-Instruct'))
        self.assertTrue(server.valid_model('llama3.2'))
        self.assertTrue(server.valid_model('llama3.2:latest'))
        self.assertTrue(server.valid_model('qwen2.5:3b'))
        for value in ['../etc/passwd', '/absolute', 'bad;whoami', '', 'x'*180]:
            self.assertFalse(server.valid_model(value))

    def test_online_url_enforces_https(self):
        with self.assertRaises(ValueError): server.ensure_https_provider('http://example.com/api')
        with self.assertRaises(ValueError): server.ensure_https_provider('https://user:pass@example.com')
        server.ensure_https_provider('https://api.example.org/v1/chat/completions')

    def test_local_generate_request(self):
        def fake_http(url, payload, **kwargs):
            self.assertEqual(url, server.OLLAMA_URL)
            self.assertFalse(payload['stream'])
            return {'model':'llama3.2','message':{'content':'Funciona'}}
        with patch.object(server, 'http_json', fake_http):
            result=server.generate({'mode':'local','prompt':'Prueba','model':'llama3.2'})
        self.assertEqual(result['text'],'Funciona')

    def test_invalid_temperature(self):
        with self.assertRaises(ValueError): server.generate({'mode':'local','prompt':'Hola','temperature':10})

    def test_online_requires_key(self):
        with patch.object(server,'ONLINE_KEY',''), patch.object(server,'ONLINE_MODEL',''):
            with self.assertRaises(ValueError): server.generate({'mode':'online','prompt':'Hola'})

    def test_training_restricted_by_environment(self):
        with tempfile.TemporaryDirectory() as tmp:
            name='dataset_123456789abc.jsonl'
            (pathlib.Path(tmp)/name).write_text('{"instruction":"i","response":"r"}\n')
            with patch.object(server,'DATASETS',pathlib.Path(tmp)),patch.dict(os.environ, {'OMEGA_ENABLE_TRAIN':'0'}):
                with self.assertRaisesRegex(ValueError,'Activa OMEGA_ENABLE_TRAIN'):
                    server.enqueue('lora_train', {'dataset':name, 'model':'Qwen/Qwen2.5-3B-Instruct','steps':1})

    def test_job_db_persists_and_recovers(self):
        with tempfile.TemporaryDirectory() as d:
            with patch.object(server,'DB',pathlib.Path(d)/'jobs.sqlite3'):
                server.init_db()
                with server.db_connect() as c:
                    c.execute("INSERT INTO jobs(id,kind,status,data,created_at,updated_at) VALUES (?,?,?,?,?,?)",
                              ('00000000000000','lora_train','running','{}',server.now(),server.now()))
                server.init_db()
                with server.db_connect() as c:
                    row=c.execute('SELECT status FROM jobs WHERE id=?',('00000000000000',)).fetchone()
                self.assertEqual(row['status'],'queued')

if __name__=='__main__': unittest.main()
