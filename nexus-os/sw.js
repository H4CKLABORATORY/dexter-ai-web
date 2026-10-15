'use strict';
const VERSION='nexus-shell-v4-nes-platform';
const SHELL=[
 './','./index.html','./app.js','./manifest.webmanifest','./assets/nexus.svg',
 './windows-lite/index.html','./windows-lite/style.css','./windows-lite/desktop.js',
 './windows-lite/worker.js','./windows-lite/win7.webmanifest','./windows-lite/win10.webmanifest',
 './windows-lite/win7.svg','./windows-lite/win10.svg',
 './roms/pong.gb','./roms/minesweep.gb',
 './roms/dabg.nes','./roms/falling.nes','./roms/table-tennis.nes',
 './jump/index.html','./jump/game.js',
 './assets/pc/libv86.js','./assets/pc/v86.wasm','./assets/pc/seabios.bin',
 './assets/pc/vgabios.bin','./assets/pc/freedos722.img'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nexus-shell-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  const fallback=u.pathname.includes('/windows-lite/')?'./windows-lite/index.html':'./index.html';
  event.respondWith(fetch(event.request).catch(()=>caches.match(fallback)));
  return;
 }
 const isShell=SHELL.some(path=>new URL(path,self.registration.scope).pathname===u.pathname);
 if(isShell)event.respondWith(
  fetch(event.request).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
   return response;
  }).catch(()=>caches.match(event.request))
 );
});
