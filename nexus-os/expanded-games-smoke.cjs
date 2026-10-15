'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
(async()=>{
  const roms=[
   {id:'dabg',file:'dabg.nes',core:'nes'},
   {id:'falling',file:'falling.nes',core:'nes'},
   {id:'tabletennis',file:'table-tennis.nes',core:'nes'}
  ];
  for(const r of roms){
   const bytes=readFileSync(path.join(__dirname,'roms',r.file));
   assert.equal(bytes.subarray(0,4).toString('hex'),'4e45531a',r.file+' must be valid iNES');
   assert.ok(bytes.length>=16384,r.file+' must be a real cartridge');
  }
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
   await context.route('https://cdn.emulatorjs.org/stable/data/loader.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.__retroLoaderTest=true;'}));
   for(const rom of roms){
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765/');
    await page.locator('#home .tile[data-nav="retro"]').click();
    await page.locator('[data-rom="'+rom.id+'"]').click();
    await page.waitForFunction(()=>window.__retroLoaderTest===true,{timeout:15000});
    const result=await page.evaluate(async()=>{
      const bytes=new Uint8Array(await (await fetch(window.EJS_gameUrl)).arrayBuffer());
      return {core:window.EJS_core,hex:Array.from(bytes.slice(0,4)).map(x=>x.toString(16).padStart(2,'0')).join(''),len:bytes.length};
    });
    assert.equal(result.core,'nes',rom.file);
    assert.equal(result.hex,'4e45531a',rom.file);
    assert.ok(result.len>=16384);
    assert.deepEqual(errors,[]);
    await page.close();
   }
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/jump/');
   await page.locator('#play').click();
   assert.equal(await page.evaluate(()=>window.__NEXUS_JUMP_STATUS().active),true);
   assert.equal(await page.evaluate(()=>window.__NEXUS_JUMP_STATUS().lives),3);
   await page.keyboard.down('ArrowRight');
   await page.waitForTimeout(250);
   await page.keyboard.up('ArrowRight');
   const stat=await page.evaluate(()=>window.__NEXUS_JUMP_STATUS());
   assert.ok(stat.x>68,'NEXUS JUMP character must move after arrow key');
   assert.deepEqual(errors,[]);
   console.log('Three licensed NES ROMs load with correct headers and NEXUS JUMP responds to gameplay inputs (emulator loader mocked)');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
