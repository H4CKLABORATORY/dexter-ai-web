'use strict';
const $=id=>document.getElementById(id);
const STORE='dexter-nexus-state-v1';
const blank=()=>({version:1,runs:0,scores:{snake:0,dodge:0,memory:0},notes:''});
function readStore(){try{
 const value=JSON.parse(localStorage.getItem(STORE)||'null');
 if(!value||typeof value!=='object')return blank();
 return {version:1,runs:capInt(value.runs,0,10000000),scores:{
  snake:capInt(value.scores?.snake,0,10000000),
  dodge:capInt(value.scores?.dodge,0,10000000),
  memory:capInt(value.scores?.memory,0,10000000)
 },notes:typeof value.notes==='string'?value.notes.slice(0,10000):''};
}catch{return blank()}}
function capInt(v,min,max){return Number.isFinite(v)?Math.max(min,Math.min(max,Math.floor(v))):min}
let state=readStore();
function persist(){try{localStorage.setItem(STORE,JSON.stringify(state));return true}catch{return false}}
function refreshStats(){
 $('heroRuns').textContent=String(state.runs);
 $('scores').textContent='NEON SNAKE: '+state.scores.snake+' puntos · ORBIT DODGE: '+state.scores.dodge+' segundos · QUANTUM PAIRS: '+(state.scores.memory?state.scores.memory+' turnos mínimos':'sin completar')+' · Partidas: '+state.runs;
}
refreshStats();$('notes').value=state.notes;
function startRun(){state.runs++;persist();refreshStats()}
function recordScore(game,value){
 const best=state.scores[game]||0;
 if((game==='memory'&&(!best||value<best))||(game!=='memory'&&value>best)){
  state.scores[game]=value;persist();refreshStats();return true;
 }return false;
}
let activeView='home';
function nav(id){
 if(!$(id))return;
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
 document.querySelectorAll('[data-nav]').forEach(btn=>btn.classList.toggle('active',btn.dataset.nav===id));
 activeView=id;scrollTo({top:0,behavior:'instant'});
 if(id!=='arcade')stopGames();
 if(id!=='pcdos')stopDos();
 if(id!=='windows' && typeof winOff==='function')winOff();
 if(id==='system')loadDeviceDetails();
 if(id==='vault')refreshStats();
}
document.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>nav(btn.dataset.nav)));
const modal=$('installDialog');
$('installShortcut').onclick=()=>{modal.classList.add('open');$('installMessage').textContent=matchMedia('(display-mode: standalone)').matches?'Ya estás ejecutando NEXUS como app instalada.':'Compatible con instalación PWA desde Safari.'};
$('closeInstall').onclick=()=>modal.classList.remove('open');
modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};
document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.classList.remove('open')});
$('deviceStatus').textContent=matchMedia('(display-mode: standalone)').matches?'● APP INSTALADA':'● MODO LOCAL';
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.info('PWA offline no disponible:',error.message)));

let gameActive='',snakeLoop=null, snakeState=null, dodgeFrame=null, dodgeState=null, memoryState=null, memoryTimer=null;
const sg=$('snakeCanvas').getContext('2d',{alpha:false});
const dg=$('dodgeCanvas').getContext('2d',{alpha:false});
function stopGames(){
 if(snakeLoop){clearInterval(snakeLoop);snakeLoop=null}
 if(dodgeFrame){cancelAnimationFrame(dodgeFrame);dodgeFrame=null}
 if(memoryTimer){clearTimeout(memoryTimer);memoryTimer=null}
 snakeState=null;dodgeState=null;
}
function gameMenu(){stopGames();gameActive='';$('gameMenu').style.display='grid';document.querySelectorAll('.gamebox').forEach(x=>x.classList.remove('active'))}
function selectGame(name){
 stopGames();gameActive=name;$('gameMenu').style.display='none';
 document.querySelectorAll('.gamebox').forEach(x=>x.classList.toggle('active',x.id===name+'Box'));
 if(name==='snake'){paintSnake([],null);$('snakeStatus').textContent='Pulsa Jugar para comenzar.'}
 if(name==='dodge'){paintDodge({player:{x:180,y:295},blocks:[],elapsed:0});$('dodgeStatus').textContent='Arrastra la nave con el dedo.'}
 if(name==='memory')memoryStart();
}
document.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>selectGame(b.dataset.game)));
$('snakeBack').onclick=gameMenu;$('dodgeBack').onclick=gameMenu;$('memoryBack').onclick=gameMenu;
function snakeStart(){
 stopGames();gameActive='snake';
 const grid=18;
 snakeState={parts:[{x:9,y:9},{x:8,y:9},{x:7,y:9}],dir:{x:1,y:0},next:{x:1,y:0},food:null,score:0,steps:0};
 snakeFood();startRun();$('snakeScore').textContent='Puntos: 0';$('snakeStatus').textContent='Desliza la pantalla o usa las flechas.';
 paintSnake(snakeState.parts,snakeState.food);
 snakeLoop=setInterval(()=>{
  const st=snakeState;if(!st)return;
  st.dir=st.next;
  const head={x:st.parts[0].x+st.dir.x,y:st.parts[0].y+st.dir.y};
  const eat=st.food&&head.x===st.food.x&&head.y===st.food.y;
  const blocking=eat?st.parts:st.parts.slice(0,-1);
  if(head.x<0||head.y<0||head.x>=grid||head.y>=grid||blocking.some(p=>p.x===head.x&&p.y===head.y)){
   clearInterval(snakeLoop);snakeLoop=null;
   const best=recordScore('snake',st.score);
   $('snakeStatus').textContent='Fin de partida. '+st.score+' puntos.'+(best?' ¡Nuevo récord!':'');
   return;
  }
  st.parts.unshift(head);
  if(eat){st.score+=10;snakeFood()}else st.parts.pop();
  $('snakeScore').textContent='Puntos: '+st.score;paintSnake(st.parts,st.food);
 },138);
}
function snakeFood(){
 const st=snakeState;if(!st)return;
 const available=[];
 for(let y=0;y<18;y++)for(let x=0;x<18;x++)if(!st.parts.some(p=>p.x===x&&p.y===y))available.push({x,y});
 if(!available.length){clearInterval(snakeLoop);snakeLoop=null;$('snakeStatus').textContent='¡Completaste el tablero!';recordScore('snake',st.score);return}
 st.food=available[Math.floor(Math.random()*available.length)];
}
function paintSnake(parts,food){
 sg.fillStyle='#050f20';sg.fillRect(0,0,360,360);
 sg.strokeStyle='#163348';sg.lineWidth=.7;
 for(let i=0;i<=18;i++){sg.beginPath();sg.moveTo(i*20,0);sg.lineTo(i*20,360);sg.stroke();sg.beginPath();sg.moveTo(0,i*20);sg.lineTo(360,i*20);sg.stroke()}
 if(food){sg.fillStyle='#ff78b5';sg.beginPath();sg.arc(food.x*20+10,food.y*20+10,7,0,Math.PI*2);sg.fill()}
 parts.forEach((p,i)=>{sg.fillStyle=i===0?'#bdffff':'#59f7c1';sg.fillRect(p.x*20+2,p.y*20+2,16,16)});
}
function direction(dir){
 if(!snakeState||!snakeLoop)return;
 const moves={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
 const n=moves[dir];if(n&&!(n.x===-snakeState.dir.x&&n.y===-snakeState.dir.y))snakeState.next=n;
}
document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('click',()=>direction(b.dataset.dir)));
let swipeStart=null;
$('snakeTouch').addEventListener('pointerdown',e=>swipeStart={x:e.clientX,y:e.clientY});
$('snakeTouch').addEventListener('pointerup',e=>{
 if(!swipeStart)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;
 if(Math.max(Math.abs(dx),Math.abs(dy))<14)return;
 direction(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));
});
document.addEventListener('keydown',e=>{
 if(gameActive!=='snake'||activeView!=='arcade')return;
 const m={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key];
 if(m){e.preventDefault();direction(m)}
});
$('snakeStart').onclick=snakeStart;

function paintDodge(st){
 dg.fillStyle='#051021';dg.fillRect(0,0,360,360);
 dg.strokeStyle='#16394e';for(let x=20;x<360;x+=40){dg.beginPath();dg.moveTo(x,0);dg.lineTo(x,360);dg.stroke()}
 dg.fillStyle='#ef6eae';st.blocks.forEach(b=>{dg.fillRect(b.x,b.y,b.w,b.h)});
 dg.fillStyle='#6dffd7';dg.beginPath();dg.arc(st.player.x,st.player.y,12,0,Math.PI*2);dg.fill();
 dg.strokeStyle='#c1fff5';dg.lineWidth=2;dg.stroke();
}
function dodgeStart(){
 stopGames();gameActive='dodge';
 dodgeState={player:{x:180,y:296},blocks:[],elapsed:0,last:0,spawn:0,started:performance.now()};
 startRun();$('dodgeStatus').textContent='Arrastra la nave para esquivar.';$('dodgeScore').textContent='Tiempo: 0 s';
 const run=now=>{
  const st=dodgeState;if(!st)return;
  const dt=Math.min(45,now-(st.last||now));st.last=now;st.elapsed=(now-st.started)/1000;st.spawn+=dt;
  if(st.spawn>480){st.spawn=0;const w=22+Math.random()*34;st.blocks.push({x:Math.random()*(360-w),y:-35,w,h:18+Math.random()*22})}
  st.blocks.forEach(b=>b.y+=(2.2+st.elapsed*.035)*dt/16);
  st.blocks=st.blocks.filter(b=>b.y<400);
  const px=st.player.x,py=st.player.y;
  const hit=st.blocks.some(b=>px+9>b.x&&px-9<b.x+b.w&&py+9>b.y&&py-9<b.y+b.h);
  $('dodgeScore').textContent='Tiempo: '+Math.floor(st.elapsed)+' s';paintDodge(st);
  if(hit){cancelAnimationFrame(dodgeFrame);dodgeFrame=null;const value=Math.floor(st.elapsed);
   $('dodgeStatus').textContent='Colisión a los '+value+' segundos.'+(recordScore('dodge',value)?' ¡Nuevo récord!':'');return}
  dodgeFrame=requestAnimationFrame(run);
 };
 dodgeFrame=requestAnimationFrame(run);
}
function dodgeMove(e){
 if(!dodgeState)return;
 const rect=$('dodgeCanvas').getBoundingClientRect();
 dodgeState.player.x=Math.max(14,Math.min(346,(e.clientX-rect.left)*360/rect.width));
 dodgeState.player.y=Math.max(18,Math.min(342,(e.clientY-rect.top)*360/rect.height));
}
$('dodgeTouch').addEventListener('pointerdown',e=>{e.currentTarget.setPointerCapture(e.pointerId);dodgeMove(e)});
$('dodgeTouch').addEventListener('pointermove',dodgeMove);$('dodgeStart').onclick=dodgeStart;

const icons=['◆','✦','⬡','◇','★','☯','♜','⚡'];
function memoryStart(){
 stopGames();gameActive='memory';
 const cards=[...icons,...icons].map((icon,id)=>({icon,id,matched:false}));
 for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}
 memoryState={cards,first:null,locked:false,turns:0,pairs:0,started:false};
 drawMemory();$('memoryStatus').textContent='Encuentra 8 parejas en el menor número de turnos.';$('memoryScore').textContent='Parejas: 0/8';
}
function drawMemory(){
 const st=memoryState;if(!st)return;const root=$('memoryGrid');root.replaceChildren();
 st.cards.forEach((card,i)=>{
  const b=document.createElement('button');const show=card.matched||st.first===i||card.visible;
  b.textContent=show?card.icon:'?';b.className=card.matched?'matched':show?'revealed':'';
  b.setAttribute('aria-label',show?'Carta '+card.icon:'Carta oculta '+(i+1));
  b.disabled=card.matched;b.onclick=()=>flipMemory(i);
  root.append(b);
 });
}
function flipMemory(i){
 const st=memoryState;if(!st||st.locked||st.cards[i].matched||st.first===i)return;
 if(!st.started){startRun();st.started=true}
 if(st.first===null){st.first=i;drawMemory();return}
 const first=st.first,second=i;st.turns++;st.cards[second].visible=true;st.locked=true;drawMemory();
 if(st.cards[first].icon===st.cards[second].icon){
  st.cards[first].matched=true;st.cards[second].matched=true;st.pairs++;st.first=null;st.locked=false;
  $('memoryScore').textContent='Parejas: '+st.pairs+'/8 · '+st.turns+' turnos';
  drawMemory();
  if(st.pairs===8)$('memoryStatus').textContent='¡Victoria en '+st.turns+' turnos!'+(recordScore('memory',st.turns)?' ¡Nuevo récord!':'');
 }else{
  memoryTimer=setTimeout(()=>{if(memoryState!==st)return;st.cards[second].visible=false;st.first=null;st.locked=false;drawMemory();},780);
 }
}
$('memoryStart').onclick=memoryStart;

let retroUrl=null,retroStarted=false;
const BUILTIN_GB={
 pong:{path:'./roms/pong.gb',name:'Pong — Game Boy',core:'gb'},
 minesweep:{path:'./roms/minesweep.gb',name:'Minesweep — Game Boy',core:'gb'},
 dabg:{path:'./roms/dabg.nes',name:'Double Action Blaster Guys — NES',core:'nes'},
 falling:{path:'./roms/falling.nes',name:'Falling — NES',core:'nes'},
 tabletennis:{path:'./roms/table-tennis.nes',name:'8-Bit Table Tennis — NES',core:'nes'}
};
async function launchRetro(url,core,title,isLocal=false){
 if(retroStarted){$('retroStatus').textContent='Ya hay una consola abierta. Para cambiar de juego, toca Cerrar y recarga la página.';return}
 retroStarted=true;$('runRom').disabled=true;
 document.querySelectorAll('[data-rom]').forEach(button=>button.disabled=true);
 $('retroStatus').textContent='Preparando '+title+'…';
 try{
   const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('Archivo ROM no disponible (HTTP '+response.status+')');
   const buffer=await response.arrayBuffer();
   if(buffer.byteLength<16000||buffer.byteLength>32*1024*1024)throw Error('ROM inválida o demasiado grande');
   if(isLocal&&core==='gb'&&(new Uint8Array(buffer)[0x104]!==0xce||new Uint8Array(buffer)[0x105]!==0xed))throw Error('La ROM incluida no tiene cabecera de Game Boy válida');
   if(isLocal&&core==='nes'&&!(new Uint8Array(buffer)[0]===0x4e&&new Uint8Array(buffer)[1]===0x45&&new Uint8Array(buffer)[2]===0x53&&new Uint8Array(buffer)[3]===0x1a))throw Error('La ROM NES incluida tiene cabecera inválida');
   retroUrl=URL.createObjectURL(new Blob([buffer],{type:'application/octet-stream'}));
   window.EJS_player='#game';window.EJS_gameUrl=retroUrl;
   window.EJS_core=core;window.EJS_pathtodata='https://cdn.emulatorjs.org/stable/data/';
   window.EJS_startOnLoaded=true;
   const script=document.createElement('script');script.src='https://cdn.emulatorjs.org/stable/data/loader.js';
   script.onload=()=>{$('retroStatus').textContent=title+': motor EmulatorJS cargado. Prepara los controles táctiles.'};
   script.onerror=()=>{$('retroStatus').textContent='Error al descargar EmulatorJS. Se requiere conexión para cargar el núcleo la primera vez.'};
   document.head.append(script);
 }catch(error){
  $('retroStatus').textContent='No se pudo iniciar '+title+': '+error.message;
  retroStarted=false;$('runRom').disabled=false;
  document.querySelectorAll('[data-rom]').forEach(button=>button.disabled=false);
 }
}
document.querySelectorAll('[data-rom]').forEach(button=>button.addEventListener('click',()=>{
 const media=BUILTIN_GB[button.dataset.rom];if(media)launchRetro(media.path,media.core,media.name,true);
}));
$('runRom').onclick=()=>{
 const file=$('romFile').files?.[0];
 if(!file){$('retroStatus').textContent='Selecciona una ROM o usa los juegos incluidos.';return}
 const ext=file.name.toLowerCase().split('.').pop();
 const core={gb:'gb',gbc:'gb',gba:'gba',nes:'nes'}[ext];
 if(!core){$('retroStatus').textContent='Formato no compatible (.gb, .gbc, .gba o .nes).';return}
 if(file.size>32*1024*1024){$('retroStatus').textContent='Archivo mayor a 32 MB.';return}
 const object=URL.createObjectURL(file);
 launchRetro(object,core,file.name).finally(()=>URL.revokeObjectURL(object));
};

/* Personal ROMs: bytes stay in IndexedDB of this browser, never on Render/GitHub. */
const vaultStatus=text=>$('privateRomStatus').textContent=text;
async function updatePrivateRoms(){
 const box=$('privateRomList');
 box.replaceChildren();
 if(!window.NexusRomVault){vaultStatus('Biblioteca local no disponible. Revisa si Safari permite almacenamiento.');return}
 try{
  const records=await window.NexusRomVault.list();
  if(!records.length){
   const empty=document.createElement('p');empty.className='hint';empty.textContent='Todavía no has guardado ROM en este iPhone.';box.append(empty);
   return;
  }
  for(const item of records){
   const card=document.createElement('div');card.className='panel';card.style.cssText='margin:0;padding:12px;min-width:0';
   const title=document.createElement('strong');title.textContent=item.name;title.style.cssText='display:block;overflow-wrap:anywhere;line-height:1.4';
   const details=document.createElement('p');details.className='hint';
   details.textContent=item.core.toUpperCase()+' · '+(item.size/1024/1024).toFixed(2)+' MB · Solo en este dispositivo';
   const controls=document.createElement('div');controls.className='controls';
   const play=document.createElement('button');play.className='act';play.textContent='▶ Jugar';
   play.addEventListener('click',async()=>{
    try{
     const stored=await window.NexusRomVault.load(item.id);
     const localUrl=URL.createObjectURL(stored.blob);
     try{await launchRetro(localUrl,stored.core,stored.name)}finally{URL.revokeObjectURL(localUrl)}
    }catch(error){vaultStatus('No se pudo abrir la ROM privada: '+error.message)}
   });
   const remove=document.createElement('button');remove.className='alt';remove.textContent='Eliminar';
   remove.addEventListener('click',async()=>{
    if(!confirm('¿Eliminar '+item.name+' únicamente de esta biblioteca local?'))return;
    try{await window.NexusRomVault.remove(item.id);vaultStatus('Archivo eliminado del navegador.');await updatePrivateRoms()}
    catch(error){vaultStatus('Error al eliminar: '+error.message)}
   });
   controls.append(play,remove);card.append(title,details,controls);box.append(card);
  }
 }catch(error){vaultStatus('La biblioteca privada no está disponible: '+error.message)}
}
$('saveRom').onclick=async()=>{
 const selected=Array.from($('romFile').files||[]);
 if(!selected.length){vaultStatus('Selecciona uno o más archivos ROM desde Archivos.');return}
 $('saveRom').disabled=true;
 let count=0,failed=[];
 try{
  for(const file of selected){
   try{await window.NexusRomVault.save(file);count++}
   catch(error){failed.push(file.name+': '+error.message)}
  }
  $('romFile').value='';
  await updatePrivateRoms();
  vaultStatus(count+' ROM guardada(s) en este iPhone. '+(failed.length?'No se guardaron: '+failed.slice(0,2).join(' · '):'Ninguna se ha subido a Internet.'));
 }finally{$('saveRom').disabled=false}
};
updatePrivateRoms();

$('clearRom').onclick=()=>{if(retroUrl)URL.revokeObjectURL(retroUrl);retroUrl=null;
 $('retroStatus').textContent='La sesión retro se cerrará al recargar. Los juegos incluidos seguirán disponibles.';
 location.hash='retro';location.reload();
};
window.addEventListener('pagehide',()=>{if(retroUrl)URL.revokeObjectURL(retroUrl)});

async function loadDeviceDetails(){
 const details=[];
 details.push('Sistema informado: '+(/iPhone|iPad/i.test(navigator.userAgent)?'iOS / iPadOS':/Android/i.test(navigator.userAgent)?'Android':'Escritorio / otro'));
 details.push('WebAssembly: '+(typeof WebAssembly==='object'?'Sí':'No'));
 details.push('CPU lógica: '+(navigator.hardwareConcurrency||'no disponible'));
 details.push('PWA instalada: '+(matchMedia('(display-mode:standalone)').matches?'Sí':'No'));
 let gp='No disponible';
 if(navigator.gpu){try{gp=(await navigator.gpu.requestAdapter())?'Adaptador listo':'No hay adaptador'}catch{gp='Error al acceder'}}$('webgpu').textContent=gp==='Adaptador listo'?'SÍ':'NO';$('heroGpu').textContent=gp==='Adaptador listo'?'Sí':'No';
 details.push('WebGPU: '+gp);
 $('cores').textContent=String(navigator.hardwareConcurrency||'—');
 $('deviceDetails').textContent=details.join(' · ');
}
$('benchmark').onclick=()=>{
 $('benchmark').disabled=true;$('benchInfo').textContent='Midiendo animación 4 segundos…';
 let count=0,prev=0,sum=0,start=0;
 const frame=now=>{
  if(!start){start=now;prev=now}
  if(now-start>=4000){
    const duration=(now-start)/1000;
    const fps=Math.round(count/duration);
    $('fps').textContent=String(fps);$('heroFps').textContent=String(fps);
    $('benchInfo').textContent='Resultado: '+fps+' FPS medios medidos durante '+duration.toFixed(1)+' s. Es una medición sencilla del navegador; no representa la velocidad de Android emulado.';
    $('benchmark').disabled=false;return;
  }
  const delta=now-prev;prev=now;if(delta>0&&delta<1000){count++;sum+=delta}
  requestAnimationFrame(frame);
 };
 requestAnimationFrame(frame);
};
loadDeviceDetails();

$('saveNotes').onclick=()=>{
 state.notes=$('notes').value.slice(0,10000);
 $('vaultStatus').textContent=persist()?'Notas guardadas solo en este navegador.':'No se pudo guardar (almacenamiento privado o lleno).';
};
$('backup').onclick=()=>{
 state.notes=$('notes').value.slice(0,10000);persist();
 const data=JSON.stringify({app:'dexter-nexus',savedAt:new Date().toISOString(),state},null,2);
 const blob=new Blob([data],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dexter-nexus-save.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 $('vaultStatus').textContent='Respaldo creado. En iPhone puedes guardarlo en Archivos.';
};
$('restore').onclick=()=>$('restoreFile').click();
$('restoreFile').onchange=async()=>{
 const file=$('restoreFile').files?.[0];if(!file)return;
 try{
  if(file.size>100000)throw Error('Archivo demasiado grande');
  const data=JSON.parse(await file.text());
  if(data.app!=='dexter-nexus'||data.state?.version!==1)throw Error('Este respaldo no pertenece a DEXTER NEXUS');
  const restored=data.state;
  const clean={version:1,runs:capInt(restored.runs,0,10000000),scores:{
    snake:capInt(restored.scores?.snake,0,10000000),
    dodge:capInt(restored.scores?.dodge,0,10000000),
    memory:capInt(restored.scores?.memory,0,10000000)
   },notes:typeof restored.notes==='string'?restored.notes.slice(0,10000):''};
  state=clean;persist();refreshStats();$('notes').value=state.notes;
  $('vaultStatus').textContent='Respaldo restaurado correctamente.';
 }catch(e){$('vaultStatus').textContent='No se pudo restaurar: '+e.message}
 $('restoreFile').value='';
};
$('clearData').onclick=()=>{
 if(!confirm('¿Eliminar todas las puntuaciones y notas locales de NEXUS OS?'))return;
 state=blank();persist();$('notes').value='';refreshStats();$('vaultStatus').textContent='Datos locales borrados.';
};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&snakeLoop){clearInterval(snakeLoop);snakeLoop=null;$('snakeStatus').textContent='Pausado al salir de la app. Pulsa Jugar para reiniciar.'}if(document.hidden&&dodgeFrame){cancelAnimationFrame(dodgeFrame);dodgeFrame=null;dodgeState=null;$('dodgeStatus').textContent='Pausado al salir. Pulsa Jugar para reiniciar.'}});
paintSnake([],null);paintDodge({player:{x:180,y:296},blocks:[]});


/* Independent on-demand Windows Lite browser desktops. Each edition uses a distinct localStorage profile. */
let activeWindows=null;
function winOff(){
 const frame=$('winFrame');
 if(activeWindows!==null){frame.src='about:blank';frame.removeAttribute('src');activeWindows=null}
 $('winSession').hidden=true;$('winBootPanel').hidden=false;
}
function winOn(mode){
 const requested=mode==='10'?'10':'7';
 if(activeWindows===requested){$('winSession').hidden=false;$('winBootPanel').hidden=true;return}
 winOff();activeWindows=requested;
 $('winSessionName').textContent='Windows '+requested+' Lite · edición web';
 $('winOpenNew').href='./windows-lite/?mode='+requested;
 $('winBootPanel').hidden=true;$('winSession').hidden=false;
 $('winFrame').src='./windows-lite/?mode='+requested;
}
$('win7Start').onclick=()=>winOn('7');
$('win10Start').onclick=()=>winOn('10');
$('winShutdown').onclick=winOff;
$('winSwitch').onclick=winOff;
window.addEventListener('message',e=>{
 if(e.origin!==location.origin || e.source!==$('winFrame').contentWindow)return;
 if(e.data?.type!=='NEXUS_NAV'||!['home','arcade','windows'].includes(e.data.view))return;
 nav(e.data.view);
});



/* FreeDOS PC: truly emulates old x86 via v86 WebAssembly; not Windows or Android. */
let dosVM=null,dosLoading=false,dosLibReady=false,dosTimer=null,dosGeneration=0;
const DOS_ASSETS='./assets/pc/';
function dosStatus(message){$('dosStatus').textContent=message}
function stopDos(){
 dosGeneration++;clearTimeout(dosTimer);
 if(dosVM){try{dosVM.stop()}catch{}try{dosVM.destroy()}catch{}dosVM=null;}
 dosLoading=false;$('dosBoot').disabled=false;dosStatus('Emulador apagado. La CPU virtual ya no se ejecuta.');
}
async function ensureDosLibrary(){
 if(dosLibReady)return;
 await new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=DOS_ASSETS+'libv86.js';
   script.onload=resolve;script.onerror=()=>reject(Error('No se encontró el motor v86 preinstalado'));
   document.head.append(script);
 });
 if(typeof V86!=='function')throw Error('El motor v86 no pudo inicializarse');
 dosLibReady=true;
}
$('dosBoot').onclick=async()=>{
 if(dosLoading||dosVM)return;dosLoading=true;$('dosBoot').disabled=true;
 const generation=++dosGeneration;
 try{
   dosStatus('Verificando imagen FreeDOS y BIOS locales…');
   const res=await fetch(DOS_ASSETS+'freedos722.img',{method:'HEAD',signal:AbortSignal.timeout(12000)});
   if(!res.ok)throw Error('Disquete FreeDOS no disponible (HTTP '+res.status+')');
   await ensureDosLibrary();
   if(dosGeneration!==generation)return;
   const screen=$('dosScreen');screen.replaceChildren();
   const text=document.createElement('div');text.style.cssText='font:14px monospace;white-space:pre;line-height:14px';
   const canvas=document.createElement('canvas');canvas.style.display='none';screen.append(text,canvas);
   dosStatus('Inicializando PC x86…');
   const instance=new V86({
    wasm_path:DOS_ASSETS+'v86.wasm',
    memory_size:32*1024*1024,vga_memory_size:2*1024*1024,
    screen_container:screen,
    bios:{url:DOS_ASSETS+'seabios.bin'},vga_bios:{url:DOS_ASSETS+'vgabios.bin'},
    fda:{url:DOS_ASSETS+'freedos722.img'},autostart:true
   });
   dosVM=instance;
   instance.add_listener('emulator-ready',()=>{if(dosVM===instance)dosStatus('PC preparado. FreeDOS iniciándose…')});
   instance.add_listener('emulator-started',()=>{if(dosVM===instance){clearTimeout(dosTimer);dosStatus('PC encendido. Si la pantalla está negra, comprueba compatibilidad de Safari y BIOS.')}});
   instance.add_listener('download-error',e=>{if(dosVM===instance)dosStatus('Error al descargar archivos x86: '+String(e?.message||e?.url||'origen no disponible'))});
   dosTimer=setTimeout(()=>{if(dosVM===instance)dosStatus('Sin confirmación de arranque en 75 s. Esto puede ser una limitación de Safari o WebAssembly. No se ha arrancado Windows.')},75000);
 }catch(error){if(dosGeneration===generation)dosStatus('Error del sistema FreeDOS: '+error.message)}
 finally{dosLoading=false;$('dosBoot').disabled=Boolean(dosVM)}
};
$('dosStop').onclick=stopDos;
$('dosType').onclick=()=>{if(dosVM&&typeof dosVM.keyboard_send_text==='function')dosVM.keyboard_send_text($('dosText').value);else dosStatus('No hay teclado DOS disponible. Toca la pantalla del emulador.')};

// Restore navigation only after all lazy runtime state and handlers have initialized.
const initialHash=location.hash.slice(1);
if(['retro','pcdos','windows','arcade','android','system','vault'].includes(initialHash))nav(initialHash);
