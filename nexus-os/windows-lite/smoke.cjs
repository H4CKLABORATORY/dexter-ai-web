'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 page.on('pageerror',error=>{throw new Error('Browser JS exception: '+error.message)});
 try{
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.locator('nav [data-nav="windows"]').click();
  await page.locator('#win7Start').click();
  const frame=page.frameLocator('#winFrame');
  await frame.locator('#osLabel').waitFor();
  assert.match(await frame.locator('#osLabel').textContent(),/WINDOWS 7 LITE/);
  await frame.locator('.shortcut[data-app="notes"]').click();
  await frame.locator('.os-window[data-app="notes"] input').fill('Notas7.txt');
  await frame.locator('.os-window[data-app="notes"] textarea').fill('Documentos propios de Windows 7 Lite.');
  await frame.locator('.os-window[data-app="notes"] button:has-text("Guardar")').click();
  await frame.locator('#startButton').click();
  await frame.locator('#startApps [data-app="calc"]').click();
  const calculator=frame.locator('.os-window[data-app="calc"]');
  await calculator.locator('input').fill('2*(3+4)');
  await calculator.locator('input').press('Enter');
  assert.equal(await calculator.locator('input').inputValue(),'14');
  await frame.locator('#startButton').click();
  await frame.locator('#startApps [data-app="performance"]').click();
  await frame.locator('.os-window[data-app="performance"] button:has-text("Probar CPU")').click();
  await frame.locator('.os-window[data-app="performance"] .metric:has-text("Worker CPU")').waitFor({timeout:12000});
  await page.locator('#winShutdown').click();
  assert.equal(await page.locator('#winSession').isVisible(),false);

  await page.locator('#win10Start').click();
  await frame.locator('#osLabel').waitFor();
  assert.match(await frame.locator('#osLabel').textContent(),/WINDOWS 10 LITE/);
  await frame.locator('.shortcut[data-app="files"]').click();
  assert.equal(await frame.locator('.file-row:has-text("Notas7.txt")').count(),0,'Windows 7 file should not exist in 10');
  await frame.locator('#startButton').click();
  await frame.locator('#startApps [data-app="notes"]').click();
  await frame.locator('.os-window[data-app="notes"] input').fill('Notas10.txt');
  await frame.locator('.os-window[data-app="notes"] textarea').fill('Archivos propios de Windows 10 Lite.');
  await frame.locator('.os-window[data-app="notes"] button:has-text("Guardar")').click();

  await page.locator('#winShutdown').click();
  await page.locator('#win7Start').click();
  await frame.locator('#osLabel').waitFor();
  await frame.locator('.shortcut[data-app="files"]').click();
  await frame.locator('.file-row:has-text("Notas7.txt")').waitFor();
  assert.equal(await frame.locator('.file-row:has-text("Notas10.txt")').count(),0,'Windows 10 file must not leak into Windows 7');
  const mode7=await frame.locator('#editionManifest').getAttribute('href');
  assert.equal(mode7,'./win7.webmanifest');
  console.log('Windows Lite: mobile boot, calculator, worker CPU, notes, shutdown and edition isolation PASS');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
