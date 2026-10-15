'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const path=require('node:path');
(async()=>{
 const base=__dirname;
 for(const name of ['pong.gb','minesweep.gb']){
  const rom=readFileSync(path.join(base,'roms',name));
  assert.equal(rom.length,32768,name+' image size');
  assert.equal(rom.subarray(0x104,0x108).toString('hex'),'ceed6666','Game Boy cartridge header');
 }
 assert.equal(readFileSync(path.join(base,'assets/pc/v86.wasm')).subarray(0,4).toString('hex'),'0061736d');
 assert.ok(statSync(path.join(base,'assets/pc/freedos722.img')).size>700000);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.route('https://cdn.emulatorjs.org/stable/data/loader.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.__retroLoaderTest=true'}));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.locator('#home .tile[data-nav="retro"]').click();
  await page.locator('[data-rom="pong"]').click();
  await page.waitForFunction(()=>window.__retroLoaderTest===true);
  const data=await page.evaluate(async()=>{
    const bytes=new Uint8Array(await (await fetch(window.EJS_gameUrl)).arrayBuffer());
    return {core:window.EJS_core,magic:Array.from(bytes.slice(0x104,0x108)),size:bytes.length};
  });
  assert.deepEqual(data,{core:'gb',magic:[0xce,0xed,0x66,0x66],size:32768});
  await page.locator('#clearRom').click();
  await page.locator('nav [data-nav="pcdos"]').click();
  const mock='window.V86=class{constructor(opts){window.__dosTest={wasm:opts.wasm_path,floppy:opts.fda.url};}add_listener(n,cb){if(n==="emulator-started")setTimeout(cb,30)}stop(){}destroy(){}}';
  await page.route('**/assets/pc/libv86.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:mock}));
  await page.locator('#dosBoot').click();
  await page.waitForFunction(()=>Boolean(window.__dosTest));
  const dos=await page.evaluate(()=>window.__dosTest);
  assert.equal(dos.floppy,'./assets/pc/freedos722.img');
  assert.equal(dos.wasm,'./assets/pc/v86.wasm');
  await page.locator('#dosStop').click();
  assert.equal(await page.locator('#dosBoot').isDisabled(),false);
  assert.deepEqual(errors,[]);
  console.log('Media assets and UI integration PASS (external EmulatorJS and v86 runtime mocked for control-flow testing)');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
