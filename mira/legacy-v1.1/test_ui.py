"""Pruebas reales de interacción en Chromium, sin depender de red.

Si no están instalados Playwright y Chromium, se omiten de forma explícita.
"""
import pathlib
import shutil
import unittest

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None

ROOT = pathlib.Path(__file__).resolve().parents[1]


@unittest.skipUnless(sync_playwright is not None and shutil.which('chromium'),
                     'Requiere playwright y chromium')
class TestUI(unittest.TestCase):
    def test_compare_desktop_and_iphone(self):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path=shutil.which('chromium'),
                                        args=['--no-sandbox', '--disable-dev-shm-usage'])
            try:
                for width, height in [(1366, 850), (390, 844)]:
                    with self.subTest(width=width):
                        context = browser.new_context(viewport={'width': width, 'height': height})
                        page = context.new_page()
                        errors = []
                        page.on('pageerror', lambda error: errors.append(str(error)))
                        # El navegador de pruebas de este entorno bloquea navegación por URL.
                        # Se inyectan los mismos HTML, CSS y JS que usa la aplicación real.
                        page.set_content((ROOT/'web/index.html').read_text(encoding='utf-8'))
                        page.add_style_tag(content=(ROOT/'web/styles.css').read_text(encoding='utf-8'))
                        page.add_script_tag(content=(ROOT/'web/compare.js').read_text(encoding='utf-8'))
                        page.add_script_tag(content=(ROOT/'web/app.js').read_text(encoding='utf-8'))
                        page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
                        page.locator('#loadDemoBtn').click()
                        page.locator('button[data-step="execute"]').click()
                        page.locator('#saveBaselineBtn').click()
                        self.assertIn('guardada', page.locator('#baselineStatus').inner_text().lower())
                        page.locator('#responseA').fill('Hola mundo. Esta es la primera respuesta.')
                        page.locator('#responseB').fill('Hola mundo. Esta respuesta tiene un cambio importante.')
                        page.locator('#analyzeCompareBtn').click()
                        self.assertIn('Palabras A / B', page.locator('#compareResults').inner_text())
                        self.assertTrue(page.locator('#exportCompareBtn').is_enabled())
                        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'), width)
                        self.assertEqual(errors, [])
                        context.close()
            finally:
                browser.close()


if __name__ == '__main__':
    unittest.main()
