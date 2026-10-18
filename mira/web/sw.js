'use strict';
const VERSION='mira-atlas-v2.4-20261017';
const ASSETS=['./','./index.html','./styles.css','./compare.js','./analyzer.js','./studio.js','./visual.js','./icon.svg','./apple-touch-icon.png','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mira-atlas-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).pathname.startsWith('/api/'))return;
 const u=new URL(request.url);
 if(u.origin!==self.location.origin)return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(request,copy)).catch(()=>{});}
  return response;
 })));
});
