"""Regression: cancel A/B on iPhone, stale changes, and safe retry."""
import pathlib
import shutil
import unittest
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright=None

BASE=pathlib.Path(__file__).resolve().parents[1]/'web'

@unittest.skipUnless(sync_playwright and shutil.which('chromium'), 'Requires Playwright and Chromium')
class TestABCancellation(unittest.TestCase):
    def test_cancel_first_second_and_stale_prompt(self):
        html=(BASE/'index.html').read_text()
        for tag in ['<link rel="stylesheet" href="styles.css">',
                    '<script src="compare.js"></script>', '<script src="analyzer.js"></script>',
                    '<script src="visual.js"></script>', '<script src="studio.js"></script>']:
            html=html.replace(tag,'')
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,
                args=['--no-sandbox','--disable-dev-shm-usage'])
            try:
                for width in (1440,390,320):
                    with self.subTest(width=width):
                        page=browser.new_page(viewport={'width':width,'height':844})
                        errors=[]
                        page.on('pageerror',lambda e:errors.append(str(e)))
                        page.set_content(html)
                        page.add_style_tag(content=(BASE/'styles.css').read_text())
                        for script in ('compare.js','analyzer.js','visual.js','studio.js'):
                            page.add_script_tag(content=(BASE/script).read_text())
                        page.locator('#viewCompare').click()
                        page.locator('#savePromptA').click()
                        page.evaluate('''() => {
                          window.__pending=[];
                          window.fetch=(url,options={})=>new Promise(resolve=>{
                            window.__pending.push({resolve,signal:options.signal});
                          });
                        }''')
                        # Cancel while request A is pending. Even a mock that ignores AbortSignal
                        # must not start request B or produce a report.
                        page.locator('#runCompare').click()
                        page.wait_for_function('window.__pending.length===1')
                        self.assertTrue(page.locator('#runCompare').is_disabled())
                        self.assertTrue(page.locator('#cancelCompare').is_enabled())
                        self.assertTrue(page.locator('#responseA').get_attribute('readonly') is not None)
                        page.locator('#cancelCompare').click()
                        self.assertTrue(page.evaluate('window.__pending[0].signal.aborted'))
                        page.evaluate('window.__pending[0].resolve({ok:true,json:async()=>({text:"A",model:"fake"})})')
                        page.wait_for_function('document.querySelector("#compareStatus").textContent.includes("cancelada")')
                        self.assertEqual(page.evaluate('window.__pending.length'),1)
                        self.assertFalse(page.locator('#exportAB').is_enabled())
                        self.assertTrue(page.locator('#runCompare').is_enabled())
                        self.assertTrue(page.locator('#cancelCompare').is_disabled())
                        self.assertFalse(page.locator('#responseA').get_attribute('readonly') is not None)
                        # Cancel while B is pending, retaining A without making a false report.
                        page.evaluate('''() => {
                          window.__pending=[];
                          window.fetch=(url,options={})=>{
                            if(window.__pending.length===0){
                              window.__pending.push({signal:options.signal});
                              return Promise.resolve({ok:true,json:async()=>({text:'Primera respuesta',model:'fake'})});
                            }
                            return new Promise(resolve=>window.__pending.push({resolve,signal:options.signal}));
                          };
                        }''')
                        page.locator('#runCompare').click()
                        page.wait_for_function('window.__pending.length===2')
                        self.assertEqual(page.locator('#responseA').input_value(),'Primera respuesta')
                        page.locator('#cancelCompare').click()
                        self.assertTrue(page.evaluate('window.__pending[1].signal.aborted'))
                        page.evaluate('window.__pending[1].resolve({ok:true,json:async()=>({text:"B",model:"fake"})})')
                        page.wait_for_function('document.querySelector("#compareStatus").textContent.includes("cancelada")')
                        self.assertFalse(page.locator('#exportAB').is_enabled())
                        self.assertEqual(page.locator('#responseA').input_value(),'Primera respuesta')
                        self.assertEqual(page.locator('#responseB').input_value(),'')
                        # Editing prompt during B invalidates the model provenance.
                        page.evaluate('''() => {
                          window.__pending=[];
                          window.fetch=(url,options={})=>{
                            if(window.__pending.length===0){
                              window.__pending.push({signal:options.signal});
                              return Promise.resolve({ok:true,json:async()=>({text:'Respuesta A',model:'fake'})});
                            }
                            return new Promise(resolve=>window.__pending.push({resolve,signal:options.signal}));
                          };
                        }''')
                        page.locator('#runCompare').click()
                        page.wait_for_function('window.__pending.length===2')
                        page.locator('[data-tab="editor"]').click()
                        page.locator('#fieldEditor').fill('Cambió el contenido mientras se ejecutaba el modelo.')
                        page.locator('[data-tab="compare"]').click()
                        page.evaluate('window.__pending[1].resolve({ok:true,json:async()=>({text:"Respuesta B",model:"fake"})})')
                        page.wait_for_function('document.querySelector("#compareStatus").textContent.includes("cambió durante")')
                        self.assertFalse(page.locator('#exportAB').is_enabled())
                        page.locator('#analyzeAB').click()
                        self.assertTrue(page.locator('#exportAB').is_enabled())
                        self.assertEqual(page.evaluate('document.documentElement.scrollWidth <= innerWidth'),True)
                        self.assertEqual(errors,[])
                        page.close()
            finally:
                browser.close()
