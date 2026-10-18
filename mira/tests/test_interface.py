"""Pruebas reales en Chromium, con assets locales inyectados sin usar una URL bloqueada."""
import pathlib
import shutil
import unittest
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None

BASE=pathlib.Path(__file__).resolve().parents[1]/'web'

@unittest.skipUnless(sync_playwright and shutil.which('chromium'), 'Requiere playwright y chromium')
class TestAtlas(unittest.TestCase):
    def test_desktop_iphone_and_AB(self):
        html=(BASE/'index.html').read_text()
        for tag in ['<link rel="stylesheet" href="styles.css">', '<script src="compare.js"></script>', '<script src="analyzer.js"></script>', '<script src="visual.js"></script>', '<script src="studio.js"></script>']:
            html=html.replace(tag,'')
        with sync_playwright() as p:
            b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
            try:
                for width,height in [(1440,900),(390,844)]:
                    with self.subTest(width=width):
                        page=b.new_page(viewport={'width':width,'height':height})
                        errors=[]
                        page.on('pageerror',lambda error: errors.append(str(error)))
                        page.set_content(html)
                        page.add_style_tag(content=(BASE/'styles.css').read_text())
                        for script in ('compare.js','analyzer.js','visual.js','studio.js'):
                            page.add_script_tag(content=(BASE/script).read_text())
                        self.assertEqual(page.locator('#stageTitle').inner_text(),'05 RULES')
                        self.assertEqual(page.locator('#systemStatus').inner_text(),'OFFLINE // AUDIT')
                        self.assertGreater(page.locator('#cosmos').evaluate('(c)=>c.width'),100)
                        self.assertGreater(int(page.locator('#gaugeNumber').inner_text()),0)
                        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
                        page.locator('#openEditor').click()
                        self.assertEqual(page.locator('#drawer').get_attribute('aria-hidden'),'false')
                        page.locator('#fieldEditor').fill('Regla verificada mediante prueba de interfaz.')
                        self.assertIn('Regla verificada',page.locator('#compiledPrompt').inner_text())
                        page.locator('#closeDrawer').click()
                        page.locator('[data-phase="objective"]').click()
                        self.assertEqual(page.locator('#stageTitle').inner_text(),'02 OBJECTIVE')
                        page.locator('#viewCompare').click()
                        page.locator('#savePromptA').click()
                        page.locator('#responseA').fill('Una respuesta con tres conceptos')
                        page.locator('#responseB').fill('Otra respuesta con cinco conceptos')
                        page.locator('#analyzeAB').click()
                        self.assertIn('Solapamiento léxico',page.locator('#compareResults').inner_text())
                        self.assertTrue(page.locator('#exportAB').is_enabled())
                        # Offline audit and project portability are actual user actions, not decorative panels.
                        page.locator('[data-tab="audit"]').click()
                        page.locator('#runAudit').click()
                        self.assertIn('COBERTURA:', page.locator('#auditResults').inner_text())
                        self.assertIn('# ESPECIFICACIÓN DE LA TAREA', page.locator('#enhancedPrompt').input_value())
                        with page.expect_download() as download_info:
                            page.locator('#exportProject').click()
                        download=download_info.value
                        self.assertEqual(download.suggested_filename, 'MIRA_PROYECTO.json')
                        import json
                        exported=json.loads(pathlib.Path(download.path()).read_text())
                        self.assertEqual(exported['format'],'mira-prompt-project')
                        self.assertIn('Regla verificada', exported['fields']['rules'])
                        # Alter the prompt, then import the exported project and confirm restoration.
                        page.locator('[data-tab="editor"]').click()
                        page.locator('#closeDrawer').click()
                        page.locator('[data-phase="rules"]').click()
                        page.locator('#openEditor').click()
                        page.locator('#fieldEditor').fill('Temporal, borrar al importar.')
                        page.locator('[data-tab="audit"]').click()
                        page.on('dialog', lambda d: d.accept())
                        page.locator('#importProject').set_input_files({
                            'name':'MIRA_PROYECTO.json','mimeType':'application/json',
                            'buffer':json.dumps(exported).encode('utf-8')
                        })
                        page.wait_for_function("document.querySelector('#projectStatus').textContent.includes('Proyecto importado')",timeout=3000)
                        self.assertIn('Regla verificada',page.locator('#compiledPrompt').inner_text())
                        page.locator('#closeDrawer').click()
                        page.locator('#openAudit').click()
                        self.assertIn('ÍNDICE ESTRUCTURAL',page.locator('#auditResults').inner_text())
                        self.assertIn('CRITERIOS DE ACEPTACIÓN',page.locator('#enhancedPrompt').input_value())
                        page.locator('#exportProject').click()
                        self.assertGreater(page.locator('#statLinks').inner_text().strip(), '0')
                        self.assertIn('Proyecto',page.locator('#auditPane').inner_text().replace('PROYECTO','Proyecto'))
                        self.assertEqual(errors,[])
                        page.close()
            finally:
                b.close()

if __name__=='__main__':unittest.main()
