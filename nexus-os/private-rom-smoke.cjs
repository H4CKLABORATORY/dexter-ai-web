'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const errors=[];
 try{
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://cdn.emulatorjs.org/stable/data/loader.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.__vaultEmulatorTest=true'}));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.locator('#home .tile[data-nav="retro"]').click();
  const library=page.locator('#privateRomList');
  await page.waitForFunction(()=>Boolean(window.NexusRomVault));
  assert.equal(await library.locator('.panel').count(),0);
  await page.locator('#romFile').setInputFiles({
    name:'Mi cartucho privado.gb',mimeType:'application/octet-stream',
    buffer:readFileSync(join(__dirname,'roms','pong.gb'))
  });
  await page.locator('#saveRom').click();
  await library.locator('.panel:has-text("Mi cartucho privado.gb")').waitFor();
  assert.equal(await library.locator('.panel').count(),1);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#privateRomList .panel:has-text("Mi cartucho privado.gb")').waitFor();
  await page.locator('#privateRomList .panel button:has-text("Jugar")').click();
  await page.waitForFunction(()=>window.__vaultEmulatorTest===true);
  assert.equal(await page.evaluate(()=>window.EJS_core),'gb');
  assert.equal((await page.evaluate(async()=>new Uint8Array(await (await fetch(window.EJS_gameUrl)).arrayBuffer()).then(b=>b.byteLength))),32768);
  page.once('dialog',dialog=>dialog.accept());
  await library.locator('.panel button:has-text("Eliminar")').click();
  await page.waitForFunction(async()=> (await window.NexusRomVault.list()).length===0);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#privateRomList .panel').count(),0);
  assert.deepEqual(errors,[]);
  console.log('Private IndexedDB ROM library: import, persistence after reload, launch, deletion and zero remaining entries PASS');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
