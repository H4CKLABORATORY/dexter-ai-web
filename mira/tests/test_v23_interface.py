"""Browser verification for v2.3: literal criteria, real UI state, frozen A/B requests."""
import json
import pathlib
import shutil
import unittest
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright=None
BASE=pathlib.Path(__file__).resolve().parents[1]/'web'

@unittest.skipUnless(sync_playwright and shutil.which('chromium'), 'Requires Playwright and Chromium')
class TestABV23(unittest.TestCase):
    def test_comparison_settings_and_iphone(self):
        html=(BASE/'index.html').read_text()
        for tag in ['<link rel="stylesheet" href="styles.css">',
                    '<script src="compare.js"></script>', '<script src="analyzer.js"></script>',
                    '<script src="visual.js"></script>', '<script src="studio.js"></script>']:
            html=html.replace(tag,'')
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,
                                      args=['--no-sandbox','--disable-dev-shm-usage'])
            try:
                for width,height in [(1440,900),(390,844),(375,667),(320,568)]:
                    with self.subTest(width=width):
                        page=browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
                        errors=[]
                        page.on('pageerror',lambda e: errors.append(str(e)))
                        page.set_content(html)
                        page.add_style_tag(content=(BASE/'styles.css').read_text())
                        for script in ('compare.js','analyzer.js','visual.js','studio.js'):
                            page.add_script_tag(content=(BASE/script).read_text())
                        page.evaluate('''() => {
                            window.__miraCalls=[];
                            window.fetch=async (url,options={}) => {
                                if (String(url).includes('/api/generate')) {
                                    const req=JSON.parse(options.body);
                                    window.__miraCalls.push(req);
                                    const text=window.__miraCalls.length===1 ?
                                        'La respuesta incluye fuentes.' : 'La respuesta incluye fuentes y conclusión.';
                                    return {ok:true,json:async()=>({text,model:'mock-llama:latest'})};
                                }
                                return {ok:false,status:503,json:async()=>({error:'Offline'})};
                            };
                        }''')
                        page.locator('#viewCompare').click()
                        page.locator('#savePromptA').click()
                        page.locator('#closeDrawer').click()
                        page.locator('[data-phase="objective"]').click()
                        page.locator('#openEditor').click()
                        page.locator('#fieldEditor').fill('Elabora una respuesta con fuentes y conclusión verificable.')
                        page.locator('[data-tab="runtime"]').click()
                        page.locator('#modelName').fill('llama3.2:latest')
                        page.locator('#modelName').dispatch_event('change')
                        page.locator('[data-tab="compare"]').click()
                        page.locator('#requiredCriteria').fill('fuentes\nconclusión')
                        page.locator('#runCompare').click()
                        page.wait_for_function('window.__miraCalls.length===2',timeout=3000)
                        page.wait_for_function("document.querySelector('#compareStatus').textContent.includes('A/B completado')",timeout=3000)
                        self.assertIn('A: 1/2 (50%)',page.locator('#compareResults').inner_text())
                        self.assertIn('B: 2/2 (100%)',page.locator('#compareResults').inner_text())
                        self.assertTrue(page.locator('#exportAB').is_enabled())
                        calls=page.evaluate('window.__miraCalls')
                        self.assertEqual(calls[0]['model'],calls[1]['model'])
                        self.assertEqual(calls[0]['temperature'],calls[1]['temperature'])
                        self.assertNotEqual(calls[0]['prompt'],calls[1]['prompt'])
                        page.on('dialog',lambda d:d.accept())
                        with page.expect_download() as info:
                            page.locator('#exportAB').click()
                        report=json.loads(pathlib.Path(info.value.path()).read_text())
                        self.assertEqual(report['source'],'model')
                        self.assertEqual(report['version'],'2.4')
                        self.assertEqual(report['metrics']['coverageDifferencePoints'],50)
                        self.assertGreaterEqual(report['execution']['a']['elapsedMs'],0)
                        self.assertEqual(report['execution']['a']['model'],'mock-llama:latest')
                        self.assertNotIn('accessToken',report)
                        page.locator('#requiredCriteria').fill('fuentes')
                        self.assertFalse(page.locator('#exportAB').is_enabled())
                        page.locator('#analyzeAB').click()
                        self.assertTrue(page.locator('#exportAB').is_enabled())
                        self.assertIn('manuales',page.locator('#compareResults').inner_text())
                        # Editor change invalidates previous report.
                        page.locator('[data-tab="editor"]').click()
                        page.locator('#fieldEditor').fill('Cambió el objetivo')
                        self.assertFalse(page.locator('#exportAB').is_enabled())
                        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
                        if width<600:
                            self.assertGreaterEqual(page.locator('.drawer-tabs button').first.evaluate('(e)=>e.getBoundingClientRect().height'),40)
                            self.assertEqual(page.locator('#fieldEditor').evaluate('(e)=>getComputedStyle(e).fontSize'),'16px')
                        self.assertEqual(errors,[])
                        page.close()
            finally: browser.close()
