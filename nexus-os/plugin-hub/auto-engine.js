'use strict';
// NEXUS Plugin Planner. Does not access ChatGPT account or install plugins.
// Provider references are illustrative; the ChatGPT plugin directory remains authoritative.
(function(root){
 const RULES=Object.freeze([
 {id:'github',label:'GitHub',emoji:'⌘',kind:'ChatGPT connector',
  hints:['github','git','repositorio','codigo','pull request','issues','commits','rama','branches','programar','proyecto web'],
  path:'direct',reason:'Gestionar repositorios mediante la integración oficial de GitHub. Requiere conexión autorizada.',
  browser:'https://github.com/',scope:'Repositorio y permisos de GitHub'},
 {id:'render',label:'Render',emoji:'☁',kind:'ChatGPT connector',
  hints:['render','desplegar','deploy','hosting','servidor','backend','api web','docker','servicio web'],
  path:'direct',reason:'Gestionar un backend real alojado en Render cuando la integración y sus permisos estén activos.',
  browser:'https://dashboard.render.com/',scope:'Servicios y recursos de Render'},
 {id:'drive',label:'Google Drive',emoji:'▤',kind:'Cloud connector',
  hints:['drive','google docs','archivo','documentos','compartir archivos','pdf online','nube','almacenar'],
  path:'direct',reason:'Los archivos pueden gestionarse desde servicios cloud; no se necesita Windows local.',
  browser:'https://drive.google.com/',scope:'Acceso a los archivos autorizados'},
 {id:'gmail',label:'Gmail',emoji:'✉',kind:'Cloud connector',
  hints:['gmail','correo','mail','emails','bandeja','enviar correo','mensajes de email'],
  path:'direct',reason:'El correo puede gestionarse desde una aplicación cloud conectada.',
  browser:'https://mail.google.com/',scope:'Buzón y permisos autorizados'},
 {id:'calendar',label:'Google Calendar',emoji:'▦',kind:'Cloud connector',
  hints:['calendario','calendar','eventos','reuniones','citas','agenda','recordatorios'],
  path:'direct',reason:'Gestiona calendarios mediante una cuenta autorizada desde el teléfono.',
  browser:'https://calendar.google.com/',scope:'Calendarios autorizados'},
 {id:'youtube',label:'YouTube / creator tools',emoji:'▶',kind:'Mobile/cloud workflow',
  hints:['youtube','video','guion','miniatura','shorts','canal','publicar videos','creador'],
  path:'review',reason:'La preparación se puede hacer en la nube y móvil; subir videos y acceder a cuentas requiere las herramientas y permisos correspondientes.',
  browser:'https://studio.youtube.com/',scope:'Canal, publicación y permisos requeridos'},
 {id:'adobe',label:'Adobe Creative Cloud',emoji:'◈',kind:'Cloud or desktop capability',
  hints:['adobe','photoshop','lightroom','illustrator','pdf adobe','editar fotos','express'],
  path:'review',reason:'Algunas acciones funcionan en la nube o desde ChatGPT; otras requieren aplicación nativa de escritorio.',
  browser:'https://www.adobe.com/express/',scope:'Función concreta y licencia Adobe'},
 {id:'browser',label:'NEXUS Remote PC',emoji:'▣',kind:'Hosted Chromium (pending)',
  hints:['pc','escritorio remoto','navegador de pc','chromium','chrome pc','navegar como computadora','computadora virtual'],
  path:'server',reason:'Un navegador remoto real requiere un servidor privado desplegado. No reemplaza la app ChatGPT Desktop ni habilita plugins Desktop only.',
  browser:'',scope:'Autenticación y alojamiento del servidor'},
 {id:'runtime',label:'NEXUS Cloud Runtime',emoji:'⚙',kind:'Custom backend option',
  hints:['python','node','javascript','scripts','terminal','cli','pip','npm','ejecutar comandos','automatizar archivos'],
  path:'server',reason:'Un entorno de ejecución Node/Python puede alojarse en un backend controlado; un plugin móvil solo envía tareas autorizadas.',
  browser:'',scope:'Servidor, controles de acceso y ejecución acotada'},
 {id:'desktop',label:'Desktop-only app',emoji:'⊞',kind:'Requires vendor review',
  hints:['windows','exe','msi','windows 10','windows 11','programa windows','software escritorio','chatgpt desktop'],
  path:'review',reason:'Si una función exige Windows o ChatGPT Desktop, Safari no la convierte en móvil. Puede existir una API alternativa o una PC remota independiente.',
  browser:'',scope:'Programa, licencia y compatibilidad'},
 {id:'skills',label:'ChatGPT skills / plugins',emoji:'✳',kind:'ChatGPT-native workflow',
  hints:['plugin','plugins','skill','skills','instalar herramienta','extension','conector','integracion','mcp'],
  path:'direct',reason:'Usa el directorio y el gestor nativo de plugins. La autorización de una aplicación sigue siendo independiente.',
  browser:'https://chatgpt.com/plugins',scope:'Compatibilidad de plan, dispositivo y cuenta'}
 ]);
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ\s+./-]/g,' ').replace(/\s+/g,' ').trim();
 function analyze(query){
  const clean=normalize(query).slice(0,480);
  if(clean.length<3)return [];
  const words=clean.split(' ').filter(w=>w.length>2);
  return RULES.map(rule=>{
   let score=0;const matches=[];
   rule.hints.forEach(h=>{const hint=normalize(h);if(clean.includes(hint)){score+=Math.max(5,Math.ceil(hint.length/2));matches.push(h)}
   else if(hint.split(' ').length===1 && words.some(w=>w===hint)){score+=4;matches.push(h)}});
   if(clean.includes(normalize(rule.label)))score+=9;
   return {...rule,score,matches};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4);
 }
 function prompt(query,rules){
  const targets=rules.map(r=>r.label).join(', ')||'mejor plugin compatible';
  return 'Usa Mobile Plugin Manager para resolver esta necesidad desde mi iPhone: '+query.trim()+'. '+
   'Candidatos preliminares de NEXUS OS: '+targets+'. '+
   'Busca plugins oficiales con las herramientas disponibles de Plugin Management; comprueba si ya están instalados o pendientes, compatibilidad iOS y si exigen ChatGPT Desktop, permisos y dependencias. '+
   'Si existe uno ya instalado, úsalo. Si falta, prepara su instalación y presenta la opción de instalar o conectar mediante el flujo oficial y mis autorizaciones requeridas. '+
   'Si solo existe una versión Desktop only, busca una alternativa móvil basada en API/cloud o explica el requisito concreto. '+
   'No afirmes que la conexión se realizó hasta confirmarlo el proveedor. Si una ruta está bloqueada, completa todas las etapas permitidas y explica el siguiente paso.';
 }
 const KEY='nexus_plugin_jobs_v1';
 function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.id==='string'&&typeof x.query==='string'&&x.query.length<=480).slice(0,25):[]}catch{return []}}
 function save(jobs){try{localStorage.setItem(KEY,JSON.stringify(jobs.slice(0,25)));return true}catch{return false}}
 root.NEXUS_PLUGIN_ENGINE={RULES,analyze,prompt,read,save,normalize};
})(window);
