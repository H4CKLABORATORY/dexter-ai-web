'use strict';
// Private, on-device ROM library. No sync, upload, network operations or server writes.
(function(){
 const DB_NAME='dexter-nexus-private-rom-library';
 const STORE='roms';
 const MAX_ROM_BYTES=32*1024*1024;
 const MAX_ENTRIES=80;
 const MAX_TOTAL_BYTES=200*1024*1024;
 const SUPPORTED={gb:'gb',gbc:'gb',gba:'gba',nes:'nes'};
 let dbPromise;
 const requestResult=request=>new Promise((resolve,reject)=>{
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||new Error('No se pudo leer la biblioteca'));
 });
 function db(){
  if(!('indexedDB' in window))return Promise.reject(new Error('Este navegador no admite IndexedDB'));
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB_NAME,1);
   req.onupgradeneeded=()=>{const database=req.result;if(!database.objectStoreNames.contains(STORE))database.createObjectStore(STORE,{keyPath:'id'});};
   req.onsuccess=()=>{const database=req.result;database.onversionchange=()=>database.close();resolve(database)};
   req.onerror=()=>reject(req.error||new Error('No se pudo abrir el almacenamiento del teléfono'));
   req.onblocked=()=>reject(new Error('Cierra otras pestañas de NEXUS para liberar la biblioteca'));
  }).catch(error=>{dbPromise=null;throw error});
  return dbPromise;
 }
 function transaction(mode,fn){
  return db().then(database=>new Promise((resolve,reject)=>{
   const tx=database.transaction(STORE,mode),store=tx.objectStore(STORE);
   let data;
   tx.oncomplete=()=>resolve(data);
   tx.onerror=()=>reject(tx.error||new Error('Error al guardar ROM'));
   tx.onabort=()=>reject(tx.error||new Error('El navegador canceló el guardado'));
   try{fn(store,value=>{data=value})}catch(error){tx.abort();reject(error)}
  }));
 }
 async function list(){
  const result=await transaction('readonly',(store,set)=>{
   const req=store.getAll();
   req.onsuccess=()=>set(req.result.map(({id,name,core,size,addedAt})=>({id,name,core,size,addedAt})));
  });
  return result.sort((a,b)=>b.addedAt-a.addedAt);
 }
 const coreFor=name=>SUPPORTED[String(name||'').split('.').pop().toLowerCase()]||null;
 function validateHeader(bytes,core){
   if(core==='nes'&&!(bytes[0]===0x4e&&bytes[1]===0x45&&bytes[2]===0x53&&bytes[3]===0x1a))throw Error('El archivo no tiene una cabecera NES válida');
   if((core==='gb'||core==='gbc')&&!(bytes[0x104]===0xce&&bytes[0x105]===0xed))throw Error('El archivo no tiene una cabecera Game Boy válida');
   if(core==='gba'&&!(bytes[0xb2]===0x96))throw Error('El archivo no tiene una cabecera Game Boy Advance válida');
 }
 async function save(file){
   if(!(file instanceof Blob))throw Error('Selecciona un archivo ROM válido');
   const name=String(file.name||'ROM sin nombre').slice(0,140);
   const core=coreFor(name);
   if(!core)throw Error('Solo se admiten .gb, .gbc, .gba o .nes');
   if(file.size<16000||file.size>MAX_ROM_BYTES)throw Error('La ROM debe medir entre 16 KB y 32 MB');
   const magic=new Uint8Array(await file.slice(0,0x150).arrayBuffer());
   validateHeader(magic,core);
   const current=await list();
   const same=current.find(x=>x.name===name&&x.size===file.size);
   if(!same&&current.length>=MAX_ENTRIES)throw Error('Límite de '+MAX_ENTRIES+' archivos. Elimina alguno primero.');
   const used=current.reduce((sum,x)=>sum+x.size,0)-(same?.size||0);
   if(used+file.size>MAX_TOTAL_BYTES)throw Error('Límite de 200 MB de archivos privados.');
   const id=same?.id||(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random());
   const record={id,name,core,size:file.size,addedAt:Date.now(),blob:file};
   await transaction('readwrite',(store)=>store.put(record));
   return {id,name,core};
 }
 async function load(id){
   const item=await transaction('readonly',(store,set)=>{
    const r=store.get(id);r.onsuccess=()=>set(r.result);
   });
   if(!item?.blob)throw Error('Este archivo ya no está en tu biblioteca');
   return item;
 }
 function remove(id){return transaction('readwrite',store=>store.delete(id))}
 window.NexusRomVault={list,save,load,remove,coreFor};
})();