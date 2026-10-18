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
      console.log(`PASS ${label}: URL ${url}; CSS/JS/icons/manifest/SW all HTTP 200; no page or console errors`);
      await context.close();
    }
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});