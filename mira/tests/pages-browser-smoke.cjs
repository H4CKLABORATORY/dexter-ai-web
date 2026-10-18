'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const url=process.argv[2];
assert(/^https:\/\//.test(url),'Published HTTPS URL is required');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    for (const [label,width,height] of [['desktop',1440,900],['iphone',390,844]]) {
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:label==='iphone',hasTouch:label==='iphone'});
      const page=await context.newPage(); const problems=[];
      page.on('pageerror', e=>problems.push('JS '+e.message));
      page.on('console',msg=>{if(msg.type()==='error')problems.push('Console '+msg.text())});
      page.on('response',r=>{const u=r.url();if(u.startsWith(url) && r.status()>=400)problems.push(`HTTP ${r.status()} ${u}`)});
      const response=await page.goto(url,{waitUntil:'networkidle',timeout:60000});
      assert.equal(response?.status(),200,`${label}: page HTTP status`);
      await page.waitForSelector('#cosmos',{timeout:15000});
      assert(await page.locator('#openEditor').isVisible(),`${label}: editor button hidden`);
      assert(await page.locator('#viewCompare').isVisible(),`${label}: A/B button hidden`);
      const assets=await page.evaluate(async()=> {
        const names=['styles.css','studio.js','visual.js','analyzer.js','compare.js','icon.svg','icon-192.png','icon-512.png','manifest.webmanifest','sw.js'];
        return Promise.all(names.map(async name=>({name,status:(await fetch(new URL(name,location.href),{cache:'no-store'})).status})));
      });
      assert(assets.every(a=>a.status===200),`${label}: bad assets ${JSON.stringify(assets)}`);
      assert.equal(problems.length,0,`${label}: errors: ${problems.join(' | ')}`);
      // The existence of sw.js does not prove that the PWA actually works offline.
      const sw=await page.evaluate(async()=>{
        const timeout=new Promise((_,reject)=>setTimeout(()=>reject(Error('Service worker activation timeout')),15000));
        const registration=await Promise.race([navigator.serviceWorker.ready,timeout]);
        return {state:registration.active?.state,scope:registration.scope};
      });
      assert.equal(sw.state,'activated',`${label}: service worker not activated`);
      assert.equal(new URL(sw.scope).pathname,new URL(url).pathname,`${label}: service worker scope escapes /mira/`);
      // An already-open first visit may not yet be controlled until the next navigation.
      if(!await page.evaluate(()=>Boolean(navigator.serviceWorker.controller))){
        await page.reload({waitUntil:'networkidle',timeout:30000});
      }
      assert(await page.evaluate(()=>Boolean(navigator.serviceWorker.controller)),`${label}: page not controlled by service worker`);
      await context.setOffline(true);
      try {
        const offline=await page.reload({waitUntil:'load',timeout:30000});
        assert.equal(offline?.status(),200,`${label}: offline reload was not served from cache`);
        await page.waitForSelector('#cosmos',{timeout:10000});
        await page.locator('#viewCompare').click();
        await page.locator('#requiredCriteria').fill('informe\\nfuentes\\nconclusión');
        await page.locator('#responseA').fill('Informe y fuentes.');
        await page.locator('#responseB').fill('Informe, fuentes y conclusión.');
        await page.locator('#analyzeAB').click();
        assert(await page.locator('#exportAB').isEnabled(),`${label}: offline A/B analysis failed`);
        const result=await page.locator('#compareResults').innerText();
        assert(result.includes('CRITERIOS LITERALES (3)'),`${label}: offline criteria missing`);
        assert.equal(problems.length,0,`${label}: offline page or console errors: ${problems.join(' | ')}`);
      } finally {
        await context.setOffline(false);
      }
      console.log(`PASS ${label}: URL ${url}; HTTP 200 assets, SW-controlled offline reload and manual A/B, no page/console errors`);
      await context.close();
    }
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});