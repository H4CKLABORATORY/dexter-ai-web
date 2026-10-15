'use strict';
const VERSION='nexus-shell-v1';
const SHELL=['./','./index.html','./app.js','./manifest.webmanifest','./assets/nexus.svg'];
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
  event.respondWith(fetch(event.request).then(res=>{const copy=res.clone();caches.open(VERSION).then(c=>c.put('./index.html',copy)).catch(()=>{});return res}).catch(()=>caches.match('./index.html')));
  return;
 }
 const local=SHELL.some(s=>new URL(s,self.registration.scope).pathname===u.pathname);
 if(local)event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});
