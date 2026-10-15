'use strict';
(function(){
 const engine=window.NEXUS_PLUGIN_ENGINE;
 if(!engine)return;
 const by=id=>document.getElementById(id);
 const input=by('need'),matches=by('matches'),feedback=by('planStatus'),saved=by('savedJobs');
 const planBtn=by('createPlan'),copyBtn=by('copyRequest'),queueBtn=by('saveRequest');
 let selected=[], currentPrompt='', debounce=0;
 function setStatus(msg){feedback.textContent=msg}
 function addText(tag,cls,s,parent){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=s;parent.append(el);return el}
 function update(){
  const query=input.value.trim().slice(0,480);
  selected=engine.analyze(query);currentPrompt=query.length>=3?engine.prompt(query,selected):'';
  matches.replaceChildren();
  copyBtn.disabled=queueBtn.disabled=!currentPrompt;
  if(!query){addText('p','muted','Describe una tarea para encontrar la mejor ruta móvil y su alternativa.',matches);return}
  if(!selected.length){addText('p','muted','No se encontró una coincidencia local. ChatGPT puede buscar en su directorio cuando pegues la solicitud.',matches)}
  selected.forEach((r,i)=>{
   const item=addText('div','result',r.emoji+'  '+r.label,matches);
   const label=addText('span','pill',r.path==='direct'?'Conector o flujo móvil':r.path==='server'?'Requiere backend':'Verificar compatibilidad',item);
   label.setAttribute('aria-label','Clasificación preliminar');
   addText('p','muted',r.reason,item);
  });
  setStatus('Análisis local completado. La disponibilidad y el estado de instalación se verifican dentro de ChatGPT, no desde esta web.');
 }
 function renderJobs(){
  saved.replaceChildren();const jobs=engine.read();
  if(!jobs.length){addText('p','muted','Todavía no tienes solicitudes preparadas.',saved);return}
  jobs.forEach((j,i)=>{
   const wrap=addText('div','history',j.query,saved);
   addText('small','muted','Solicitud preparada · No equivale a plugin instalado',wrap);
   const actions=addText('div','actions','',wrap);
   const use=addText('button','button secondary','Cargar',actions);use.type='button';use.onclick=()=>{input.value=j.query;update();scrollTo({top:0,behavior:'smooth'})};
   const del=addText('button','button secondary','Eliminar',actions);del.type='button';del.onclick=()=>{const all=engine.read();engine.save(all.filter(x=>x.id!==j.id));renderJobs()};
  });
 }
 function makeJob(){
  const q=input.value.trim().slice(0,480);
  if(q.length<3){setStatus('Escribe una necesidad concreta.');return}
  const all=engine.read();
  if(all.some(x=>engine.normalize(x.query)===engine.normalize(q))){setStatus('Esta solicitud ya aparece en tu historial; no se duplicó.');return}
  const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  const savedOK=engine.save([{id,query:q,createdAt:new Date().toISOString(),status:'prepared'},...all]);
  setStatus(savedOK?'Solicitud preparada en este dispositivo. No se ha instalado ningún plugin.':'Safari no permitió guardar el historial local.');
  renderJobs();
 }
 async function copyPrompt(){
  if(!currentPrompt){setStatus('Describe primero la tarea.');return}
  try{
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(currentPrompt);}
   else{const field=document.createElement('textarea');field.value=currentPrompt;field.style.cssText='position:fixed;left:-9999px';document.body.append(field);field.select();const ok=document.execCommand('copy');field.remove();if(!ok)throw Error('Copia manual requerida')}
   setStatus('Orden copiada. Ábrela en ChatGPT y pégala para usar su gestor de plugins.');
  }catch{by('preparedPrompt').value=currentPrompt;by('preparedPrompt').hidden=false;by('preparedPrompt').focus();by('preparedPrompt').select();setStatus('Selecciona y copia el texto de abajo manualmente.')}
 }
 function exportJobs(){
  const jobs=engine.read();
  const file=new Blob([JSON.stringify({schema:'nexus.mobile-plugin-jobs.v1',exportedAt:new Date().toISOString(),jobs},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download='nexus-plugin-requests.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setStatus('Historial exportado. No incluye contraseñas ni sesiones.');
 }
 input.addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(update,130)});
 by('createPlan').addEventListener('click',update);
 copyBtn.addEventListener('click',copyPrompt);
 queueBtn.addEventListener('click',makeJob);
 by('exportJobs').addEventListener('click',exportJobs);
 for(const b of document.querySelectorAll('[data-example]'))b.addEventListener('click',()=>{input.value=b.dataset.example;update()});
 renderJobs();update();
})();
