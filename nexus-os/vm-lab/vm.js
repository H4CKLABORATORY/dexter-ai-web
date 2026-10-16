'use strict';
// v86 runs on this iPhone inside Safari; no uploads, no external remote server.
(()=>{
 const $=id=>document.getElementById(id);
 const ASSETS='../assets/pc/';
 const MAX_MEDIA=128*1024*1024;
 let machine=null,loading=false,engineReady=false,session=0,timeoutId=null;
 const status=msg=>{$('status').textContent=msg;};
 $('wasm').textContent=typeof WebAssembly==='object'?'Disponible':'No disponible';
 $('platform').textContent=/iPhone|iPad/i.test(navigator.userAgent)?'iOS':/Android/i.test(navigator.userAgent)?'Android':'Navegador';
 const choice=()=>$('system').value;
 function showChoice(){
   $('filebox').classList.toggle('hidden',choice()==='freedos');
   $('image-status').textContent=choice()==='freedos'?'FreeDOS':(choice()==='iso'?'ISO local':'IMG local');
 }
 $('system').addEventListener('change',showChoice);showChoice();
 function teardown(){
   ++session;clearTimeout(timeoutId);timeoutId=null;
   if(machine){const old=machine;machine=null;try{old.stop();}catch{}try{old.destroy();}catch{}}
   loading=false;$('boot').disabled=false;$('engine-status').textContent='Apagado';
 }
 $('shutdown').addEventListener('click',()=>{teardown();status('Máquina apagada. Memoria liberada cuando Safari la recupere.');});
 async function ensureEngine(){
   if(engineReady)return;
   await new Promise((resolve,reject)=>{
     const s=document.createElement('script');s.src=ASSETS+'libv86.js';
     s.onload=resolve;s.onerror=()=>reject(Error('No fue posible cargar libv86.js. Revisa tu conexión.'));
     document.head.append(s);
   });
   if(typeof V86!=='function')throw Error('El motor v86 no se cargó correctamente.');
   engineReady=true;
 }
 async function available(path){
   const res=await fetch(ASSETS+path,{method:'HEAD',cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!res.ok)throw Error('No se encontró '+path+' (HTTP '+res.status+')');
 }
 async function boot(){
   if(loading||machine)return;
   const mode=choice(),file=$('image-file').files[0];
   if(mode!=='freedos'){
     if(!file){status('Selecciona primero la imagen local que quieres arrancar.');return}
     const ext=file.name.toLowerCase().split('.').pop();
     if(!['iso','img','bin'].includes(ext) || (mode==='iso' && ext!=='iso') || (mode==='img' && ext==='iso')){status('Formato no válido para el tipo de arranque. Selecciona ISO o IMG según corresponda.');return}
     if(file.size<512||file.size>MAX_MEDIA){status('Tamaño incompatible: selecciona una imagen mayor que 512 bytes y de máximo 128 MB.');return}
   }
   loading=true;$('boot').disabled=true;
   const ticket=++session;$('engine-status').textContent='Preparando';
   let started=false;
   try{
     if(typeof WebAssembly!=='object')throw Error('Tu navegador no dispone de WebAssembly.');
     status('Verificando motor y BIOS del proyecto…');
     await available('seabios.bin');
     await available('vgabios.bin');
     if(mode==='freedos')await available('freedos722.img');
     await ensureEngine();
     if(ticket!==session)return;
     const screen=$('vm-screen');screen.replaceChildren();
     const text=document.createElement('div');text.style.cssText='font:14px monospace;line-height:14px;white-space:pre';
     const canvas=document.createElement('canvas');canvas.style.display='none';
     screen.append(text,canvas);
     const opts={
       wasm_path:ASSETS+'v86.wasm',
       bios:{url:ASSETS+'seabios.bin'},
       vga_bios:{url:ASSETS+'vgabios.bin'},
       screen_container:screen,
       memory_size:Number($('memory').value)*1024*1024,
       vga_memory_size:2*1024*1024,
       autostart:true
     };
     if(mode==='freedos'){opts.fda={url:ASSETS+'freedos722.img'};}
     else{
       status('Leyendo imagen local sin subirla al servidor…');
       const buffer=await file.arrayBuffer();
       if(ticket!==session)return;
       if(mode==='iso')opts.cdrom={buffer};
       else if(file.size<=2880*1024)opts.fda={buffer};
       else opts.hda={buffer};
     }
     status('Arrancando PC x86 dentro del iPhone…');
     const m=new V86(opts);machine=m;$('engine-status').textContent='Iniciando';
     m.add_listener('emulator-ready',()=>{if(machine!==m)return;status('Hardware x86 preparado. Esperando arranque del sistema…')});
     m.add_listener('emulator-started',()=>{if(machine!==m)return;started=true;clearTimeout(timeoutId);$('engine-status').textContent='En ejecución';status('Motor de PC en ejecución. Toca la pantalla para interactuar. Si aún no aparece el escritorio, espera al sistema invitado.')});
     m.add_listener('emulator-stopped',()=>{if(machine!==m)return;$('engine-status').textContent='Detenido';status('Emulador detenido.')});
     m.add_listener('download-error',e=>{if(machine!==m)return;status('Faltan recursos del emulador: '+String(e?.message||e?.url||'descarga fallida'))});
     timeoutId=setTimeout(()=>{if(machine===m&&!started){$('engine-status').textContent='Sin confirmación';status('Arranque sin confirmar después de 80 s. El sistema puede ser incompatible o Safari puede haberse quedado sin recursos.')}} ,80000);
   }catch(e){if(ticket===session){status('No se pudo arrancar: '+String(e?.message||e));teardown();}}
   finally{if(ticket===session){loading=false;$('boot').disabled=Boolean(machine)}}
 }
 $('boot').addEventListener('click',boot);
 $('fullscreen').addEventListener('click',()=>{
   const screen=$('vm-screen');
   if(!machine){status('Enciende primero la máquina.');return;}
   try{if(typeof machine.screen_go_fullscreen==='function')machine.screen_go_fullscreen();else if(screen.requestFullscreen)screen.requestFullscreen();else status('Safari no permite pantalla completa en este modo.');}
   catch(e){status('Pantalla completa no disponible: '+e.message)}
 });
 const SC={
   enter:[0x1c,0x9c],esc:[0x01,0x81],backspace:[0x0e,0x8e],
   up:[0xe0,0x48,0xe0,0xc8],down:[0xe0,0x50,0xe0,0xd0],
   left:[0xe0,0x4b,0xe0,0xcb],right:[0xe0,0x4d,0xe0,0xcd]
 };
 function sendKey(key){if(!machine){status('Primero enciende la PC.');return}try{machine.keyboard_send_scancodes(SC[key]);}catch(e){status('Tecla no disponible: '+e.message)}}
 document.querySelectorAll('[data-key]').forEach(b=>b.addEventListener('click',()=>sendKey(b.dataset.key)));
 function type(andEnter){
   if(!machine){status('Primero enciende la PC.');return}
   try{const value=$('vm-text').value;
     if(value&&typeof machine.keyboard_send_text==='function')machine.keyboard_send_text(value);
     if(andEnter)sendKey('enter');
   }catch(e){status('No se pudo escribir: '+e.message)}
 }
 $('send').addEventListener('click',()=>type(false));
 $('send-enter').addEventListener('click',()=>type(true));
 $('vm-text').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();type(true)}});
 window.addEventListener('pagehide',teardown);
})();