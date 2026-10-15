'use strict';
// NEXUS Windows Lite is an original browser desktop: NOT Microsoft Windows.
const $=id=>document.getElementById(id);
const edition=new URLSearchParams(location.search).get('mode')==='10'?'10':'7';
document.body.dataset.edition=edition;
$('editionManifest').href='./win'+edition+'.webmanifest';
document.querySelector('meta[name="apple-mobile-web-app-title"]').content='NEXUS Win '+edition;

const label='Windows '+edition+' Lite · Web Edition';
$('osLabel').textContent=label.toUpperCase();$('startTitle').textContent='Windows '+edition+' Lite';
$('watermark').textContent='NEXUS · EDICIÓN WEB / NO ES WINDOWS '+edition+' REAL';
document.title=label+' — DEXTER NEXUS';
const storageKey='nexus-lite-'+edition+'-v2';
const appInfo={
 files:['📁','Explorador de archivos'],notes:['📝','Bloc de notas'],calc:['⌗','Calculadora'],
 terminal:['▣','Consola web'],performance:['◫','Rendimiento'],settings:['⚙','Configuración'],
 about:['ⓘ','Acerca de']
};
const defaultProfile=()=>({version:2,wallpaper:'default',files:[{name:'Bienvenido.txt',content:'Bienvenido a Windows '+edition+' Lite (edición web). Esta interfaz usa tu teléfono y no contiene Microsoft Windows.'}],last:'Bienvenido.txt'});
const validName=name=>String(name||'').trim().replace(/[\/\\:*?"<>|\x00-\x1f]/g,'_').slice(0,70);
function normalize(value){
 const fallback=defaultProfile();if(!value||typeof value!=='object')return fallback;
 const files=[],seen=new Set();
 if(Array.isArray(value.files))for(const item of value.files.slice(0,70)){
  if(!item||typeof item!=='object'||typeof item.content!=='string')continue;
  const name=validName(item.name);if(!name||seen.has(name.toLowerCase()))continue;
  seen.add(name.toLowerCase());files.push({name,content:item.content.slice(0,45000)});
 }
 return {version:2,wallpaper:['default','aurora','minimal'].includes(value.wallpaper)?value.wallpaper:'default',files:files.length?files:fallback.files,last:validName(value.last)};
}
function readProfile(){try{return normalize(JSON.parse(localStorage.getItem(storageKey)))}catch{return defaultProfile()}}
let profile=readProfile();
$('desktop').dataset.wallpaper=profile.wallpaper;
function toast(message){
 const e=$('toast');e.textContent=message;e.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.hidden=true,2900);
}
function persist(){
 try{const text=JSON.stringify(profile);if(text.length>320000)throw Error('almacenamiento lleno');localStorage.setItem(storageKey,text);return true}
 catch(e){toast('No se pudo guardar: '+e.message);return false}
}
const mk=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const btn=(text,fn)=>{const e=mk('button',text);e.addEventListener('click',fn);return e};
const row=(parent)=>{const e=mk('div',undefined,'toolbar');parent.append(e);return e};
const para=(parent,text,cls='muted')=>{const e=mk('p',text,cls);parent.append(e);return e};
const field=(parent,value='',placeholder='')=>{const e=mk('input');e.type='text';e.value=value;e.placeholder=placeholder;parent.append(e);return e};
function download(filename,content,type='text/plain'){
 const u=URL.createObjectURL(new Blob([content],{type}));const a=mk('a');a.href=u;a.download=filename;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
}
function tick(){const d=new Date();$('clock').textContent=d.toLocaleTimeString('es-US',{hour:'2-digit',minute:'2-digit'});$('date').textContent=d.toLocaleDateString('es-US',{month:'2-digit',day:'2-digit'})}
tick();setInterval(tick,60000);
const windows=new Map();let active=null,z=30;
function closeStart(){$('startMenu').hidden=true;$('startButton').setAttribute('aria-expanded','false')}
$('startButton').onclick=()=>{const open=$('startMenu').hidden;$('startMenu').hidden=!open;$('startButton').setAttribute('aria-expanded',String(open));if(open)$('appSearch').focus()};
$('appSearch').oninput=()=>{const q=$('appSearch').value.toLowerCase();$('startApps').querySelectorAll('button').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(q))};
function jump(view){
 if(window.parent!==window)window.parent.postMessage({type:'NEXUS_NAV',view},location.origin);
 else location.href='../'+(view==='home'?'':'#'+view);
}
$('exitOS').onclick=()=>jump('home');$('startApps').querySelector('[data-action=arcade]').onclick=()=>jump('arcade');
function taskbar(){
 const target=$('taskApps');target.replaceChildren();
 const ids=['files','notes','calc',...Array.from(windows.keys()).filter(id=>!['files','notes','calc'].includes(id))];
 for(const id of ids){
  const b=btn(appInfo[id][0],()=>openApp(id));b.title=appInfo[id][1];b.setAttribute('aria-label',appInfo[id][1]);
  if(id===active&&windows.has(id)&&!windows.get(id).classList.contains('is-minimized'))b.classList.add('active');
  target.append(b);
 }
}
function focusApp(id){
 const w=windows.get(id);if(!w)return;
 w.classList.remove('is-minimized');w.style.zIndex=String(++z);active=id;
 for(const [other,el] of windows)el.classList.toggle('is-active',other===id);
 taskbar();
}
function closeApp(id){
 const w=windows.get(id);if(!w)return;
 w.remove();windows.delete(id);active=null;taskbar();
}
function openApp(id){
 if(!appInfo[id])return;closeStart();
 if(windows.has(id)){focusApp(id);return}
 const win=mk('section',undefined,'os-window');
 win.setAttribute('role','dialog');win.setAttribute('aria-label',appInfo[id][1]);win.dataset.app=id;
 win.style.top=(8+windows.size*4)+'%';
 if(innerWidth>650)win.style.left='calc(50% - 285px + '+windows.size*18+'px)';
 const head=mk('header',undefined,'titlebar'),title=mk('span',appInfo[id][0]+' '+appInfo[id][1],'win-title');
 head.append(title);
 for(const [action,label] of [['min','−'],['max','□'],['close','×']]){
  const b=btn(label,e=>{e.stopPropagation();if(action==='close')closeApp(id);
   else if(action==='min'){win.classList.add('is-minimized');active=null;taskbar()}
   else win.classList.toggle('is-max')});
  b.dataset.action=action;b.setAttribute('aria-label',action==='min'?'Minimizar':action==='max'?'Maximizar':'Cerrar');head.append(b);
 }
 let drag=null;
 head.addEventListener('pointerdown',e=>{
  if(e.target.closest('button')||innerWidth<651||win.classList.contains('is-max'))return;
  drag={x:e.clientX,y:e.clientY,left:win.offsetLeft,top:win.offsetTop};head.setPointerCapture(e.pointerId);
 });
 head.addEventListener('pointermove',e=>{
  if(!drag)return;
  win.style.left=Math.max(0,Math.min(innerWidth-win.offsetWidth,drag.left+e.clientX-drag.x))+'px';
  win.style.top=Math.max(0,Math.min(innerHeight-win.offsetHeight-55,drag.top+e.clientY-drag.y))+'px';
 });
 for(const event of ['pointerup','pointercancel'])head.addEventListener(event,()=>drag=null);
 const body=mk('div',undefined,'win-body');win.append(head,body);
 win.addEventListener('pointerdown',()=>focusApp(id));
 $('windows').append(win);windows.set(id,win);renderApp(id,body);focusApp(id);
}
document.querySelectorAll('[data-app]').forEach(b=>b.addEventListener('click',()=>openApp(b.dataset.app)));
function findFile(name){return profile.files.find(x=>x.name.toLowerCase()===name.toLowerCase())}
function saveFile(name,content){
 name=validName(name);if(!name.toLowerCase().endsWith('.txt')){toast('El nombre debe terminar en .txt');return false}
 if(content.length>45000){toast('Límite de 45 KB por documento');return false}
 const current=findFile(name);
 if(current)current.content=content;
 else if(profile.files.length<70)profile.files.push({name,content});
 else{toast('Máximo 70 documentos');return false}
 profile.last=name;return persist();
}
function exportProfile(){download('nexus-windows-'+edition+'-backup.json',JSON.stringify({app:'nexus-windows-lite',edition,profile},null,2),'application/json')}
function renderFiles(body){
 body.replaceChildren();para(body,'Unidad local virtual. Archivos privados en este navegador.');
 const toolbar=row(body);
 toolbar.append(btn('＋ Nuevo archivo',()=>{
  let name=validName(prompt('Nombre del documento','Nuevo.txt'));if(!name)return;
  if(!name.endsWith('.txt'))name+='.txt';
  if(saveFile(name,''))renderFiles(body);
 }),btn('⇧ Importar .txt',()=>$('filePicker').click()),btn('⇩ Respaldo',exportProfile));
 const list=mk('div',undefined,'file-list');body.append(list);
 for(const f of profile.files){
  const line=mk('div',undefined,'file-row'),name=mk('span','📄 '+f.name,'filename');line.append(name);
  line.append(btn('Abrir',()=>openNotes(f.name)),btn('↓',()=>download(f.name,f.content)));
  line.append(btn('×',()=>{if(confirm('¿Eliminar '+f.name+'?')){profile.files=profile.files.filter(x=>x.name!==f.name);persist();renderFiles(body)}}));
  list.append(line);
 }
 para(body,profile.files.length+' archivos, máximo 70. Nada se envía a la nube.','hint');
}
function openNotes(name){openApp('notes');renderNotes(windows.get('notes').querySelector('.win-body'),name)}
function renderNotes(body,name){
 body.replaceChildren();para(body,'Bloc de notas local. Documentos independientes entre las dos ediciones.');
 const filename=field(body,name||profile.last||'Notas.txt','Archivo.txt');
 filename.setAttribute('aria-label','Nombre del documento');
 const textarea=mk('textarea');textarea.setAttribute('aria-label','Contenido del documento');textarea.value=findFile(filename.value)?.content||'';body.append(textarea);
 const tools=row(body);
 tools.append(btn('Guardar',()=>{if(saveFile(filename.value,textarea.value))toast('Guardado en el iPhone / navegador')}),
 btn('Descargar .txt',()=>download(validName(filename.value)||'Notas.txt',textarea.value)),
 btn('Nuevo',()=>{filename.value='Nuevo.txt';textarea.value='';textarea.focus()}));
 para(body,'Para compartir documentos con otro teléfono utiliza Descargar o el respaldo JSON.','hint');
}
function arithmetic(str){
 const clean=str.replace(/\s+/g,'').replace(/,/g,'.');
 const parts=clean.match(/\d+(?:\.\d+)?|[()+*/-]/g);
 if(!parts||parts.join('')!==clean||parts.length>120)throw Error('Expresión inválida');
 let i=0;
 function atom(){
  const t=parts[i++];
  if(t==='('){const n=add();if(parts[i++]!==')')throw Error('Paréntesis incompleto');return n}
  if(t==='-')return -atom();if(t==='+')return atom();
  if(!t||!/^\d/.test(t))throw Error('Número esperado');return Number(t);
 }
 function mul(){let v=atom();while(parts[i]==='*'||parts[i]==='/'){const op=parts[i++],n=atom();if(op==='/'&&n===0)throw Error('División entre cero');v=op==='*'?v*n:v/n}return v}
 function add(){let v=mul();while(parts[i]==='+'||parts[i]==='-'){const op=parts[i++],n=mul();v=op==='+'?v+n:v-n}return v}
 const answer=add();if(i!==parts.length||!Number.isFinite(answer))throw Error('Operación inválida');
 return String(Number(answer.toPrecision(12)));
}
function renderCalc(body){
 body.replaceChildren();
 const display=field(body,'','0');display.className='calc-display';display.setAttribute('aria-label','Calculadora');
 const grid=mk('div',undefined,'calc-grid');body.append(grid);
 for(const k of ['7','8','9','/','4','5','6','*','1','2','3','-','C','0','.','+','(',')','⌫','=']){
  const button=btn(k,()=>{
   if(k==='C')display.value='';
   else if(k==='⌫')display.value=display.value.slice(0,-1);
   else if(k==='='){try{display.value=arithmetic(display.value)}catch(e){toast(e.message)}}
   else if(display.value.length<125)display.value+=k;
  });if('+-*/='.includes(k))button.classList.add('op');grid.append(button);
 }
 display.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();try{display.value=arithmetic(display.value)}catch(err){toast(err.message)}}};
 para(body,'Motor matemático local, sin eval ni ejecución de código.','hint');
}
function renderTerminal(body){
 body.replaceChildren();para(body,'Comandos de demostración; esta consola no da acceso al sistema operativo de Apple.');
 const output=mk('div','NEXUS WINDOWS '+edition+' LITE WEB SHELL\nEscribe help para comandos disponibles.\n\n','terminal-output');body.append(output);
 const input=field(body,'','> help');input.setAttribute('aria-label','Comando de terminal');
 const run=()=>{
  const command=input.value.trim().slice(0,300);input.value='';if(!command)return;
  if(command==='cls'||command==='clear'){output.textContent='';return}
  const op=command.split(/\s+/)[0].toLowerCase();let response='';
  switch(op){
   case 'help':response='help, dir, ver, echo TEXTO, date, time, systeminfo, cls';break;
   case 'dir':response=profile.files.map(f=>f.name).join('\n');break;
   case 'ver':response=label;break;
   case 'echo':response=command.substring(5);break;
   case 'date':response=new Date().toLocaleDateString('es-US');break;
   case 'time':response=new Date().toLocaleTimeString('es-US');break;
   case 'systeminfo':response='Entorno web independiente\nCPU lógica: '+(navigator.hardwareConcurrency||'desconocida')+'\nWebAssembly: '+(typeof WebAssembly==='object'?'Sí':'No')+'\nRAM real no disponible mediante Safari';break;
   default:response='Comando no disponible. Escribe help.';
  }
  output.textContent+='> '+command+'\n'+response+'\n';output.scrollTop=output.scrollHeight;
 };
 input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();run()}};
 row(body).append(btn('Ejecutar',run),btn('Limpiar',()=>output.textContent=''));
}
function renderPerformance(body){
 body.replaceChildren();
 para(body,'Estas pruebas utilizan recursos reales del navegador del teléfono, no Windows emulado ni acceso a procesos iOS.');
 const info=mk('div',undefined,'card');
 info.append(mk('strong','Hardware visible'),mk('div','CPU lógica: '+(navigator.hardwareConcurrency||'no expuesta')+' · WebAssembly: '+(typeof WebAssembly==='object'?'Sí':'No')));
 body.append(info);
 const result=mk('div','FPS y CPU aún sin medir.','card metric');body.append(result);
 const tools=row(body);
 const fpsBtn=btn('Medir FPS (3 s)',()=>{
  fpsBtn.disabled=true;let start=0,frames=0;
  const tick=ts=>{if(!start)start=ts;if(ts-start>3000){result.textContent=Math.round(frames*1000/(ts-start))+' FPS (promedio de requestAnimationFrame)';fpsBtn.disabled=false;return}
   frames++;requestAnimationFrame(tick)};
  requestAnimationFrame(tick);
 });
 const cpuBtn=btn('Probar CPU del navegador',()=>{
  cpuBtn.disabled=true;result.textContent='Procesando fuera del hilo visual…';
  if(typeof Worker==='undefined'){result.textContent='Workers no disponibles';cpuBtn.disabled=false;return}
  const worker=new Worker('./worker.js');let done=false;
  const timeout=setTimeout(()=>{if(!done){worker.terminate();result.textContent='Prueba interrumpida por límite de 8 segundos';cpuBtn.disabled=false}},8000);
  worker.onmessage=e=>{done=true;clearTimeout(timeout);worker.terminate();result.textContent='Worker CPU: '+e.data.ms+' ms / '+e.data.iterations.toLocaleString()+' iteraciones (prueba sintética)';cpuBtn.disabled=false};
  worker.onerror=()=>{done=true;clearTimeout(timeout);worker.terminate();result.textContent='Error del Worker';cpuBtn.disabled=false};
  worker.postMessage({iterations:800000});
 });
 tools.append(fpsBtn,cpuBtn);
 if(navigator.gpu&&typeof navigator.gpu.requestAdapter==='function')
  navigator.gpu.requestAdapter().then(a=>para(body,'WebGPU: '+(a?'Adaptador disponible':'No disponible'))).catch(()=>para(body,'WebGPU: error de acceso'));
 else para(body,'WebGPU: API no disponible en este navegador.');
}
function renderSettings(body){
 body.replaceChildren();para(body,'Ajustes exclusivos de Windows '+edition+' Lite. No modifican iOS.');
 const card=mk('div',undefined,'card');card.append(mk('strong','Fondo de pantalla'));
 const picker=mk('select');for(const [value,label] of [['default','Original'],['aurora','Aurora'],['minimal','Minimalista']])picker.add(new Option(label,value));
 picker.value=profile.wallpaper;picker.onchange=()=>{profile.wallpaper=picker.value;$('desktop').dataset.wallpaper=profile.wallpaper;persist()};card.append(picker);body.append(card);
 const tools=row(body);tools.append(btn('Exportar perfil',exportProfile),btn('Restaurar perfil',()=>$('backupPicker').click()));
}
function renderAbout(body){
 body.replaceChildren();body.append(mk('h2',label));
 para(body,'Escritorio original de DEXTER NEXUS, inspirado en la experiencia clásica de Windows. No es Microsoft Windows 7 ni Windows 10, no contiene sus archivos de sistema y no puede instalar programas .exe.');
 para(body,'Tiene ventanas, notas, archivos .txt virtuales, calculadora, consola limitada y herramientas de rendimiento. Todo funciona en Safari o navegadores compatibles.');
 row(body).append(btn('Ir a NEXUS Arcade',()=>jump('arcade')),btn('Salir al launcher',()=>jump('home')));
}
function renderApp(id,body){
 const funcs={files:renderFiles,notes:renderNotes,calc:renderCalc,terminal:renderTerminal,performance:renderPerformance,settings:renderSettings,about:renderAbout};
 funcs[id](body);
}
$('filePicker').onchange=async()=>{
 const f=$('filePicker').files?.[0];if(!f)return;
 if(f.size>45000){toast('Solo .txt menores de 45 KB');return}
 try{const name=validName(f.name);if(!name.toLowerCase().endsWith('.txt'))throw Error('Requiere .txt');
   if(saveFile(name,await f.text())){toast('Archivo importado');if(windows.has('files'))renderFiles(windows.get('files').querySelector('.win-body'))}
 }catch(e){toast(e.message)}finally{$('filePicker').value=''}
};
$('backupPicker').onchange=async()=>{
 const f=$('backupPicker').files?.[0];if(!f)return;
 try{
  if(f.size>350000)throw Error('Archivo de respaldo muy grande');
  const obj=JSON.parse(await f.text());
  if(obj.app!=='nexus-windows-lite'||obj.edition!==edition||!obj.profile||obj.profile.version!==2)throw Error('El respaldo no corresponde a esta edición');
  if(!confirm('¿Reemplazar el perfil local de Windows '+edition+' Lite con este respaldo?'))return;
  profile=normalize(obj.profile);persist();$('desktop').dataset.wallpaper=profile.wallpaper;for(const [id,w] of windows)renderApp(id,w.querySelector('.win-body'));toast('Perfil restaurado');
 }catch(e){toast('No se pudo restaurar: '+e.message)}finally{$('backupPicker').value=''}
};
taskbar();
