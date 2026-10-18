"""Validate installable PWA assets without claiming real Safari installation."""
import json
import pathlib
import re
import unittest
from PIL import Image
BASE=pathlib.Path(__file__).resolve().parents[1]/'web'

class TestPWAAssets(unittest.TestCase):
    def test_manifest_icons_and_precache(self):
        manifest=json.loads((BASE/'manifest.webmanifest').read_text())
        self.assertEqual(manifest['display'],'standalone')
        for icon in manifest['icons']:
            self.assertTrue((BASE/icon['src']).is_file(),icon['src'])
        with Image.open(BASE/'apple-touch-icon.png') as img:
            self.assertEqual(img.size,(180,180))
        for size in (192,512):
            with Image.open(BASE/f'icon-{size}.png') as img:
                self.assertEqual(img.size,(size,size))
        sw=(BASE/'sw.js').read_text()
        self.assertIn('mira-atlas-v2.4-20261017',sw)
        match=re.search(r'const ASSETS=\[(.*?)\];',sw,re.S)
        self.assertIsNotNone(match)
        paths=re.findall(r"'\./([^']*)'",match.group(1))
        self.assertGreaterEqual(len(paths),10)
        for path in paths:
            if path:
                self.assertTrue((BASE/path).is_file(),path)
        html=(BASE/'index.html').read_text()
        self.assertIn('rel="apple-touch-icon"',html)
        self.assertIn('navigator.serviceWorker.register("./sw.js")',html)
