/* MIRA Neural Prompt Studio — v2.4. The visual simulation never claims to measure model IQ. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const keys=['role','objective','context','roles','rules'];
 const phases=[...keys,'review','start'];
 const names={role:'ROLE',objective:'OBJECTIVE',context:'CONTEXT',roles:'ROLES',rules:'RULES',review:'REVIEW',start:'START'};
 const verbs={role:'define · guide · direct',objective:'focus · measure · deliver',context:'ground · cite · understand',roles:'assign · review · verify',rules:'verify · ask · keep · report',review:'audit · compare · improve',start:'launch · observe · report'};
 const hints={role:'Indica qué función desempeña la IA y sus límites.',objective:'Especifica el resultado esperado y cómo verificarlo.',context:'Da información relevante, audiencia, recursos y restricciones.',roles:'Define responsabilidades de los diferentes revisores o especialistas.',rules:'Escribe reglas de formato, comprobación y cuándo debe preguntar.'};
 const demo={role:'Actúa como analista y editor responsable de un informe verificable.',objective:'Revisar el borrador, identificar afirmaciones sin evidencia y entregar un reporte con correcciones.',context:'Antes de publicar, el equipo necesita distinguir hechos, opiniones y autorizaciones. Trabaja con documentos proporcionados y no inventes datos.',roles:'Editor: corrige claridad. Verificador: distingue evidencia de suposiciones. Responsable: decide las aprobaciones.',rules:'Verifica cada afirmación antes de reportar. Pregunta cuando falte una aprobación. Conserva referencias importantes. No afirmes que un borrador fue publicado si no sucedió.'};
 function saved(){try{return JSON.parse(localStorage.getItem('mira-atlas-v2')||'null')}catch{return null}}
 const old=(()=>{try{return JSON.parse(localStorage.getItem('omega-v1')||'{}')}catch{return {}}})();
 const persisted=saved();
 const storedBaseline=(()=>{try{return localStorage.getItem('mira-baseline-v1')||''}catch{return ''}})();
 const state={phase:'rules',fields:{...demo,...(old.role?Object.fromEntries(keys.filter(k=>old[k]).map(k=>[k,old[k]])):{}) ,...(persisted?.fields||{})},mode:persisted?.mode||'local',model:persisted?.model||'llama3.2',temperature:persisted?.temperature??.4,baseline:storedBaseline,dataset:null,report:null,response:'',lastReport:null,tab:'editor'};
 const visual=new window.MiraVisual($('cosmos'));
 let lastAudit=MiraAudit.evaluate(state.fields);
 const words=s=>String(s||'').trim().match(/\S+/gu)||[];
 const count=s=>words(s).length;
 const save=()=>{try{localStorage.setItem('mira-atlas-v2',JSON.stringify({fields:state.fields,mode:state.mode,model:state.model,temperature:state.temperature}))}catch{}}
 const format=(s,n)=>String(s).padStart(n,'0');
 const clear=(el)=>{while(el.firstChild)el.removeChild(el.firstChild)};
 const node=(tag,text,cls)=>{let e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e};
 const appendText=(where,tag,text,cls)=>{let e=node(tag,text,cls);where.appendChild(e);return e};
 const hasFields=()=>keys.some(k=>Boolean(state.fields[k]?.trim()));
 const core=()=>keys.map(k=>`## ${names[k]}\n${state.fields[k]?.trim()||''}`).filter(x=>!x.endsWith('\n')).join('\n\n')+'\n\n## VERIFICACIÓN\nReporta solo resultados comprobados y señala limitaciones.';
 const metric=()=>{let lens=keys.map(k=>count(state.fields[k]));let coverage=lens.map(v=>Math.min(1,v/12));const flags=keys.filter(k=>count(state.fields[k])<5).length+( !/verific|comprob|prueb|valid|evidenc|fuente/i.test(state.fields.rules)?1:0)+( !/entreg|informe|reporte|formato|archivo|lista|json/i.test(state.fields.objective)?1:0);let score=Math.round(coverage.reduce((v,x)=>v+x,0)*14+(flags===0?22:Math.max(0,22-flags*5))+8);return {lens,coverage,flags,score:Math.min(100,Math.max(0,score))};};
 let toastHandle=null;
 let activeAB=null, abRevision=0; // Cambios del usuario invalidan cualquier comparación en curso.
 function toast(s){const el=$('toast');el.textContent=s;el.classList.add('visible');clearTimeout(toastHandle);toastHandle=setTimeout(()=>el.classList.remove('visible'),3200)}
 function compile(){const text=core();$('compiledPrompt').textContent=text;return text;}
 function setPhase(phase){if(!phases.includes(phase))return;state.phase=phase;visual.setPhase(phase);document.querySelectorAll('.steps button').forEach(btn=>{const yes=btn.dataset.phase===phase;btn.classList.toggle('active',yes);btn.setAttribute('aria-current',yes?'step':'false')});let idx=phases.indexOf(phase)+1;$('stageTitle').textContent=format(idx,2)+' '+names[phase];$('stageTag').textContent=verbs[phase];$('coreMode').textContent=phase;$('drawerTitle').textContent=format(idx,2)+' // '+names[phase];$('fieldLabel').textContent=names[phase]+' / SPECIFICATION';$('fieldHint').textContent=hints[phase]||'Revisa la estructura antes de ejecutar el prompt.';$('fieldEditor').disabled=!keys.includes(phase);$('fieldEditor').value=keys.includes(phase)?state.fields[phase]:phase==='review'?reviewText():'Abre MOTOR IA o LAB A/B para realizar una ejecución.';renderField();renderLabels();}
 function renderField(){$('fieldWordCount').textContent=count(state.fields[state.phase]||'')+' words';compile();}
 function reviewText(){const r=MiraAudit.evaluate(state.fields);const lines=[`Índice estructural: ${r.score}/100 (heurística, no calidad).`,`Alertas: ${r.issues.length}`, ...r.sections.map(s=>`${s.label}: ${s.words} palabras.`),...r.issues.map(x=>'- '+x.title+': '+x.advice)];return lines.join('\n');}
 function renderLabels(){
  // La disposición sigue la captura; el vocabulario refleja los campos editados.
  const stop=new Set('como para antes sobre desde entre hasta deben debe eres actúa cada cuando esto esta este estas estos donde solo toda todos pero porque están puede tener debe pueden necesita necesita entregue entregar verifique verificar información resultado siempre nunca redacta sean sean ellos ellas con que los las por del una uno unos unas son que sus más sus los las entre'.split(' '));
  const original=keys.every(k=>state.fields[k]===demo[k]);
  const labels=[['role','role'],['objective','Report'],['context','they'],['roles','claims · clear'],['rules','Ask before approval'],['rules','Keep'],['review','publishing · approvals']];
  document.querySelectorAll('.map-labels [data-focus]').forEach((el,i)=>{
    const info=labels[i];if(!info)return;
    el.classList.toggle('selected',info[0]===state.phase);
    if(original){el.textContent=info[1];return}
    let source=state.fields[info[0]]||state.fields.rules;
    const terms=[...new Set((source.toLocaleLowerCase('es').match(/[\p{L}\p{N}]{4,}/gu)||[]).filter(t=>!stop.has(t)))];
    el.textContent=i===0?names[state.phase].toLowerCase():terms.length?terms.slice((i*2)%terms.length,(i*2)%terms.length+2).join(' · '):info[1];
  });
}
 function render(){const m=metric();lastAudit=MiraAudit.evaluate(state.fields);visual.setSemanticGraph(lastAudit);const wordTotal=count(core()),lin=core().split('\n').length;$('statLines').textContent=lin;$('statLinks').textContent=lastAudit.sections.reduce((n,x)=>n+x.terms.length,0);$('statWords').textContent=format(wordTotal,3);$('statNodeLinks').textContent=lastAudit.edges.reduce((n,x)=>n+x.weight,0);$('statFlags').textContent=lastAudit.issues.length;$('wordHeatTotal').textContent=wordTotal;$('signalLabel').textContent=lastAudit.score+'%';$('gauge').style.setProperty('--gauge',lastAudit.score);$('gaugeNumber').textContent=lastAudit.score;$('gaugeFlags').textContent=lastAudit.issues.length;$('readWords').textContent=wordTotal;$('linkedWords').textContent=lastAudit.edges.reduce((n,x)=>n+x.weight,0);$('flagWords').textContent=lastAudit.issues.length;$('claimCount').textContent=Math.min(99,count(state.fields.objective));$('ownerCount').textContent=Math.min(99,count(state.fields.roles));$('approvalCount').textContent=Math.min(99,count(state.fields.rules));$('teleWordsPerMin').textContent=Math.ceil(wordTotal*60/200);
  const sections=$('sectionLines');clear(sections);phases.forEach((p,i)=>{const v=keys.includes(p)?count(state.fields[p]):p==='review'?Math.max(0,7-m.flags)*2:state.response?14:0;let color=['#d8d7df','#56d5fc','#ff6c94','#ffd265','#77f6da','#a8adb8','#f68e74'][i];let wrap=appendText(sections,'div',null,'section-line');let top=appendText(wrap,'div',null,'line-top');appendText(top,'span',p);appendText(top,'span',`${v}/${[25,25,35,42,25,17,14][i]}`);let track=appendText(wrap,'div',null,'line-track');let bar=node('i');bar.style.width=Math.min(100,v/[25,25,35,42,25,17,14][i]*100)+'%';bar.style.background=color;bar.style.color=color;track.appendChild(bar)});
  const log=$('crawlLines');clear(log);const list=core().split(/\s+/).filter(Boolean);const selected=[...list].slice(-16);selected.forEach((w,i)=>{let div=appendText(log,'div',null,(i%9===0?'warn':''));appendText(div,'em','#'+format(Math.max(1,list.length-15+i),3));appendText(div,'span',i%5===0?'link ':'read ');appendText(div,'strong',w.replace(/[.#]/g,'').slice(0,16));});
  const heat=$('wordHeat');clear(heat);const vals=[m.lens[0],m.lens[1],m.lens[2],m.lens[3],m.lens[4],Math.max(0,7-m.flags),state.response?12:0];let labels=['ROL','OBJ','CTX','TEAM','RULE','REV','STA'];const colors=['#f5f5f5','#6fe1f7','#ff6f93','#ffd365','#76edcf','#90aaa9','#f58d7a'];vals.forEach((v,i)=>{let row=appendText(heat,'div',null,'heat-row');appendText(row,'span',labels[i]);for(let j=0;j<12;j++){let b=node('i');if(j<Math.min(12,Math.ceil(v/3))){b.className='active';b.style.color=colors[i]}row.appendChild(b)}});
  renderRadar(m.coverage,m.score);$('systemStatus').textContent=state.response?'MODEL // RESULT':'OFFLINE // AUDIT';compile();}
 function renderRadar(values,score){const grid=$('radarGrid'),lab=$('radarLabels');clear(grid);clear(lab);const svgNS='http://www.w3.org/2000/svg';const ang=i=>-Math.PI/2+i*2*Math.PI/7;const pt=(i,r)=>[115+Math.cos(ang(i))*r,90+Math.sin(ang(i))*r];for(let ring=1;ring<=4;ring++){let poly=document.createElementNS(svgNS,'polygon');poly.setAttribute('points',Array.from({length:7},(_,i)=>pt(i,ring*14).join(',')).join(' '));poly.setAttribute('fill','none');poly.setAttribute('stroke','#1d2d32');grid.appendChild(poly)};for(let i=0;i<7;i++){const [x,y]=pt(i,60);let line=document.createElementNS(svgNS,'line');line.setAttribute('x1',115);line.setAttribute('y1',90);line.setAttribute('x2',x);line.setAttribute('y2',y);line.setAttribute('stroke','#23383a');grid.appendChild(line);let text=document.createElementNS(svgNS,'text');const [xx,yy]=pt(i,76);text.setAttribute('x',xx);text.setAttribute('y',yy);text.setAttribute('text-anchor','middle');text.setAttribute('font-size','8');text.setAttribute('fill','#aab6b7');text.textContent=['ROLE','OBJ','CTX','TEAM','RULES','REV','START'][i];lab.appendChild(text)};const v=[...values,score/100,state.response?1:.18];$('radarPoly').setAttribute('points',v.map((n,i)=>pt(i,Math.max(2,n*55)).join(',')).join(' '));}
 const open=(tab='editor')=>{$('scrim').hidden=false;$('drawer').classList.add('open');$('drawer').setAttribute('aria-hidden','false');setTab(tab);$('closeDrawer').focus();};
 const close=()=>{$('drawer').classList.remove('open');$('drawer').setAttribute('aria-hidden','true');$('scrim').hidden=true;};
 function setTab(tab){state.tab=tab;document.querySelectorAll('.drawer-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));['editor','audit','compare','runtime','training'].forEach(t=>$(t+'Pane').hidden=(t!==tab));}
 function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);}
 async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copiado al portapapeles')}catch{toast('Copia no disponible. Usa EXPORTAR TXT.')}}
 function restoreBaseline(){const b=state.baseline;$('promptAStatus').textContent=b?'Prompt A guardado · '+count(b)+' palabras':'Sin prompt A guardado.';}
 function invalidateAB(){abRevision++;state.report=null;$('exportAB').disabled=true;$('compareResults').textContent='Cambios detectados. Vuelve a analizar las respuestas para exportar un informe vigente.';}
 function compareLocal(source='manual',run=null){
  const a=$('responseA').value,b=$('responseB').value;
  if(!a.trim()||!b.trim()){toast('Introduce ambas respuestas');return}
  let result;try{result=MiraCompare.compare(a,b,$('requiredCriteria').value)}catch(e){$('compareResults').textContent='Criterios inválidos: '+e.message;invalidateReportOnly();return}
  const promptA=run?.promptA??state.baseline??null,promptB=run?.promptB??core();
  const config=run?.config??{mode:state.mode,model:state.model,temperature:state.temperature};
  state.report={version:'2.4',created:new Date().toISOString(),source,
    promptA,promptB,responseA:a,responseB:b,model:config.model,mode:config.mode,temperature:config.temperature,
    execution:run?{a:run.a,b:run.b}:null,metrics:result};
  let coverageText='';
  if(result.criteria.length){
   const diff=result.coverageDifferencePoints;
   coverageText=`\nCRITERIOS LITERALES (${result.criteria.length}):\nA: ${result.coverageA.count}/${result.coverageA.total} (${result.coverageA.percent}%)\nB: ${result.coverageB.count}/${result.coverageB.total} (${result.coverageB.percent}%)\nΔ: ${diff>0?'+':''}${diff} puntos porcentuales\nFaltantes A: ${result.coverageA.missing.join(' · ')||'ninguno'}\nFaltantes B: ${result.coverageB.missing.join(' · ')||'ninguno'}\n`;
  }
  const runtime=run?`\nEJECUCIÓN COMPROBADA: A ${run.a.elapsedMs} ms · B ${run.b.elapsedMs} ms\nModelos devueltos: ${run.a.model} / ${run.b.model}\n`:'\nORIGEN: respuestas pegadas/manuales; no se verificó su procedencia.\n';
  $('compareResults').textContent=`A: ${result.a.words} palabras · ${result.a.characters} caracteres\nB: ${result.b.words} palabras · ${result.b.characters} caracteres\nΔ: ${result.wordDifference>0?'+':''}${result.wordDifference} palabras\nSolapamiento léxico: ${result.lexicalOverlapPercent}%\nRespuestas idénticas: ${result.identical?'Sí':'No'}\n${coverageText}${runtime}\nNo mide exactitud ni calidad; la presencia de frases no garantiza cumplimiento.`;
  $('exportAB').disabled=false;
 }
 function invalidateReportOnly(){abRevision++;state.report=null;$('exportAB').disabled=true;}
 function apiBase(){const url=$('apiBaseUrl').value.trim().replace(/\/+$/,'');if(!url)return '';const parsed=new URL(url);if(parsed.username||parsed.password||parsed.search||parsed.hash||!['https:','http:'].includes(parsed.protocol))throw Error('URL de servidor inválida.');if(parsed.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(parsed.hostname))throw Error('Para servidores externos usa HTTPS.');return parsed.origin;}
 async function api(path,method='GET',data,externalSignal){
  const headers={'Content-Type':'application/json'};
  const key=$('accessToken').value.trim();if(key)headers['X-Omega-Token']=key;
  const ctrl=new AbortController();
  const relay=()=>ctrl.abort();
  if(externalSignal?.aborted)ctrl.abort();
  else externalSignal?.addEventListener('abort',relay,{once:true});
  const timer=setTimeout(()=>ctrl.abort(),125000);
  try{
   const r=await fetch(apiBase()+path,{method,headers,body:data?JSON.stringify(data):undefined,signal:ctrl.signal});
   if(ctrl.signal.aborted)throw new DOMException('Solicitud cancelada','AbortError');
   const response=await r.json().catch(()=>({}));
   if(ctrl.signal.aborted)throw new DOMException('Solicitud cancelada','AbortError');
   if(!r.ok)throw Error(response.error||`HTTP ${r.status}`);
   return response;
  }finally{clearTimeout(timer);externalSignal?.removeEventListener('abort',relay)}
 }
 async function infer(prompt,config={mode:state.mode,model:state.model,temperature:state.temperature},signal){return api('/api/generate','POST',{...config,prompt},signal);}
 async function listModels(){let btn=$('listModels');btn.disabled=true;$('modelListStatus').textContent='Consultando Ollama…';try{const result=await api('/api/models');const dl=$('availableModels');clear(dl);for(const name of result.models||[]){let opt=document.createElement('option');opt.value=name;dl.appendChild(opt)}$('modelListStatus').textContent=result.models.length?result.models.join(' · '):'Ollama responde, pero no hay modelos descargados. Ejecuta ollama pull llama3.2 en la computadora.';if(result.models.length===1){state.model=result.models[0];$('modelName').value=state.model;save();}}catch(e){$('modelListStatus').textContent='Ollama no disponible: '+e.message}finally{btn.disabled=false}}
 async function runModel(){if(!hasFields())return toast('Falta prompt');let btn=$('runModel');btn.disabled=true;$('runStatus').textContent='Ejecutando con backend…';try{const r=await infer(core());state.response=r.text||'';$('modelOutput').textContent=state.response||'(Sin texto)';$('runStatus').textContent='Recibido del modelo '+r.model;render()}catch(e){$('runStatus').textContent='No se pudo ejecutar: '+e.message+' · Inicia server.py y el modelo autorizado.'}finally{btn.disabled=false}}
 function cancelAB(){
  if(!activeAB)return;
  activeAB.abort();
  $('compareStatus').textContent='Cancelando ejecución A/B…';
 }
 async function runAB(){
  if(activeAB)return;
  if(!hasFields())return toast('Completa primero el prompt B');
  if(!state.baseline)return toast('Guarda primero el prompt A');
  let criteria;
  try{criteria=MiraCompare.parseCriteria($('requiredCriteria').value)}
  catch(e){$('compareStatus').textContent='Corrige los criterios antes de usar el motor: '+e.message;return}
  const ctrl=new AbortController();activeAB=ctrl;
  const btn=$('runCompare'),cancel=$('cancelCompare');
  btn.disabled=true;cancel.disabled=false;
  $('responseA').readOnly=true;$('responseB').readOnly=true;$('requiredCriteria').readOnly=true;
  $('analyzeAB').disabled=true;
  invalidateReportOnly();
  // Evita mezclar una respuesta antigua con una ejecución nueva o cancelada.
  $('responseA').value='';$('responseB').value='';
  const revision=abRevision;
  const promptA=state.baseline,promptB=core();
  const config={mode:state.mode,model:state.model,temperature:state.temperature};
  const run={promptA,promptB,config};
  $('compareStatus').textContent='Ejecutando A y después B con la misma configuración…';
  try{
   const startedA=performance.now();const a=await infer(promptA,config,ctrl.signal);
   if(ctrl.signal.aborted)throw new DOMException('Cancelado','AbortError');
   run.a={elapsedMs:Math.round(performance.now()-startedA),model:a.model||config.model};
   $('responseA').value=a.text||'';
   $('compareStatus').textContent='Respuesta A recibida; ejecutando B…';
   const startedB=performance.now();const b=await infer(promptB,config,ctrl.signal);
   if(ctrl.signal.aborted)throw new DOMException('Cancelado','AbortError');
   run.b={elapsedMs:Math.round(performance.now()-startedB),model:b.model||config.model};
   $('responseB').value=b.text||'';
   if(abRevision!==revision){
    $('compareStatus').textContent='El prompt o la configuración cambió durante la ejecución. Revisa las respuestas y pulsa ANALIZAR para obtener un informe manual actualizado.';
    invalidateReportOnly();
   }else{
    compareLocal('model',run);
    $('compareStatus').textContent='A/B completado. Prompts y configuración congelados para esta ejecución; las respuestas pueden variar.';
   }
  }catch(e){
   invalidateReportOnly();
   $('compareStatus').textContent=ctrl.signal.aborted
    ?'Ejecución A/B cancelada desde el navegador. El servidor podría seguir procesando; no se exportará un informe incompleto.'
    :'Error de ejecución: '+e.message+' · Se conservan las respuestas recibidas. Puedes completar y analizar manualmente.';
  }finally{
   if(activeAB===ctrl)activeAB=null;
   btn.disabled=false;cancel.disabled=true;
   $('responseA').readOnly=false;$('responseB').readOnly=false;$('requiredCriteria').readOnly=false;
   $('analyzeAB').disabled=false;
  }
 }
 async function train(){if(!state.dataset){toast('Carga un dataset válido primero');return}if(!confirm('El entrenamiento real requiere GPU y puede consumir energía. ¿Enviar los ejemplos al servidor para QLoRA?'))return;let btn=$('startTraining');btn.disabled=true;try{const d=await api('/api/datasets','POST',{samples:state.dataset});const j=await api('/api/jobs','POST',{kind:'lora_train',config:{dataset:d.dataset,model:$('trainingModel').value.trim(),steps:Number($('trainingSteps').value)}});$('trainStatus').textContent='Trabajo '+j.id+' en cola persistente. No se afirma que haya finalizado.';refreshJobs()}catch(e){$('trainStatus').textContent='Error: '+e.message}finally{btn.disabled=false}}
 async function datasetSelected(file){if(!file)return;try{let raw=(await file.text()).trim(),arr;try{arr=JSON.parse(raw)}catch{arr=raw.split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l))};if(!Array.isArray(arr)||arr.length<2||arr.length>2000)throw Error('Se necesitan 2–2000 ejemplos.');arr=arr.map(s=>{if(typeof s.instruction==='string'&&typeof s.response==='string'&&s.instruction.trim()&&s.response.trim())return {instruction:s.instruction,response:s.response};if(Array.isArray(s.messages)){const u=s.messages.find(x=>x.role==='user'),a=s.messages.find(x=>x.role==='assistant');if(u&&a&&typeof u.content==='string'&&typeof a.content==='string')return {instruction:u.content,response:a.content}}throw Error('Ejemplo sin instruction/response válidos.')});state.dataset=arr;$('datasetStatus').textContent=`${arr.length} ejemplos validados localmente · ${file.name}`;}catch(e){state.dataset=null;$('datasetStatus').textContent='Error: '+e.message}}
 async function refreshJobs(){try{const r=await api('/api/jobs');$('trainingJobs').textContent=r.jobs.slice(0,5).map(j=>j.id+' | '+j.kind+' | '+j.status+(j.error?' | '+j.error:'')).join('\n')}catch{}}
 function audit(){const r=MiraAudit.evaluate(state.fields);lastAudit=r;const issues=r.issues.length?r.issues.map((x,i)=>`${i+1}. [${x.severity.toUpperCase()}] ${x.title}\n   → ${x.advice}`).join('\n\n'):'No se detectaron problemas estructurales con estas reglas.';$('auditResults').textContent=`COBERTURA: ${r.filled}/5 secciones\nÍNDICE ESTRUCTURAL: ${r.score}/100 (no mide inteligencia)\nPALABRAS: ${r.words}\nRELACIONES LÉXICAS: ${r.edges.reduce((a,b)=>a+b.weight,0)}\n\n${issues}`;$('enhancedPrompt').value=MiraAudit.improve(state.fields,r);render();return r;}
 async function importProject(file){if(!file)return;try{if(file.size>350000)throw Error('Archivo demasiado grande');const project=MiraAudit.importProject(JSON.parse(await file.text()));if(!confirm('¿Reemplazar las cinco secciones actuales con las del archivo?'))return;Object.assign(state.fields,project);invalidateAB();save();setPhase('role');audit();$('projectStatus').textContent='Proyecto importado correctamente.';}catch(e){$('projectStatus').textContent='No se pudo importar: '+e.message}}
 async function testConnection(){const btn=$('testConnection');btn.disabled=true;$('connectionStatus').textContent='Probando servidor…';try{const health=await api('/api/health');$('connectionStatus').textContent=`Servidor conectado. Modelo online: ${health.online_configured?'configurado':'sin configurar'}. Entrenamiento: ${health.training_enabled?'habilitado':'deshabilitado'}.`;$('systemStatus').textContent='API // READY';}catch(e){$('connectionStatus').textContent='Sin conexión al motor IA: '+e.message+'. La auditoría offline sigue funcionando.';$('systemStatus').textContent='OFFLINE // AUDIT';}finally{btn.disabled=false}}
 function setup(){
  document.querySelectorAll('.steps button').forEach(b=>b.addEventListener('click',()=>{setPhase(b.dataset.phase);if(['review','start'].includes(b.dataset.phase))open(b.dataset.phase==='review'?'editor':'runtime')}));
  document.querySelectorAll('.map-labels button').forEach(b=>b.addEventListener('click',()=>{setPhase(b.dataset.focus);open('editor')}));
  $('openEditor').onclick=()=>open('editor');$('openAudit').onclick=()=>{open('audit');audit()};$('runAudit').onclick=audit;$('copyEnhanced').onclick=()=>copy($('enhancedPrompt').value);$('exportAudit').onclick=()=>{const r=audit();download('MIRA_AUDITORIA.json',JSON.stringify({audit:r,enhancedPrompt:$('enhancedPrompt').value},null,2),'application/json')};$('exportProject').onclick=()=>download('MIRA_PROYECTO.json',JSON.stringify(MiraAudit.exportProject(state.fields),null,2),'application/json');$('importProjectButton').onclick=()=>$('importProject').click();$('importProject').onchange=e=>importProject(e.target.files?.[0]);$('testConnection').onclick=testConnection;$('listModels').onclick=listModels;$('viewCompare').onclick=()=>open('compare');$('settingsBtn').onclick=()=>open('runtime');$('scrim').onclick=close;$('closeDrawer').onclick=close;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('drawer').classList.contains('open'))close();if(e.key==='ArrowRight'&&!$('drawer').classList.contains('open'))setPhase(phases[(phases.indexOf(state.phase)+1)%phases.length]);if(e.key==='ArrowLeft'&&!$('drawer').classList.contains('open'))setPhase(phases[(phases.indexOf(state.phase)+6)%phases.length]);});
  document.querySelectorAll('.drawer-tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$('fieldEditor').addEventListener('input',e=>{if(!keys.includes(state.phase))return;state.fields[state.phase]=e.target.value;invalidateAB();save();renderField();renderLabels();render();});
  $('zoomIn').onclick=()=>visual.changeZoom(.16);$('zoomOut').onclick=()=>visual.changeZoom(-.16);$('resetView').onclick=()=>visual.center();$('pauseMotion').onclick=()=>{const paused=visual.togglePause();$('pauseMotion').textContent=paused?'▶':'Ⅱ';$('pauseMotion').setAttribute('aria-pressed',String(paused))};$('fullscreenBtn').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>toast('El navegador no permite pantalla completa aquí'))};
  $('copyPrompt').onclick=()=>copy(core());$('exportPrompt').onclick=()=>download('MIRA_PROMPT.txt',core(),'text/plain;charset=utf-8');$('loadExample').onclick=()=>{Object.assign(state.fields,demo);invalidateAB();save();setPhase(state.phase);render();toast('Demostración restaurada')};$('clearPrompt').onclick=()=>{if(!confirm('¿Borrar los campos?'))return;for(const k of keys)state.fields[k]='';invalidateAB();save();setPhase('role');render();toast('Campos vaciados')};
  $('savePromptA').onclick=()=>{state.baseline=core();invalidateAB();try{localStorage.setItem('mira-baseline-v1',state.baseline)}catch{}restoreBaseline();toast('Prompt A guardado')};$('analyzeAB').onclick=()=>compareLocal();$('runCompare').onclick=runAB;$('cancelCompare').onclick=cancelAB;$('exportAB').onclick=()=>{if(!state.report)return;if(!confirm('Se exportarán las respuestas y prompts completos. ¿Continuar?'))return;download('MIRA_AB_REPORT.json',JSON.stringify(state.report,null,2),'application/json')};for(const id of ['responseA','responseB','requiredCriteria'])$(id).addEventListener('input',()=>{invalidateReportOnly()});
  $('modelMode').value=state.mode;$('modelName').value=state.model;$('temperature').value=state.temperature;$('temperatureLabel').textContent=state.temperature;$('modelMode').onchange=e=>{state.mode=e.target.value;invalidateAB();save()};$('modelName').onchange=e=>{state.model=e.target.value.trim();invalidateAB();save()};$('temperature').oninput=e=>{state.temperature=Number(e.target.value);$('temperatureLabel').textContent=state.temperature;invalidateAB();save()};$('runModel').onclick=runModel;$('trainingDataset').onchange=e=>datasetSelected(e.target.files?.[0]);$('startTraining').onclick=train;
  restoreBaseline();setPhase('rules');render();
 }
 setup();
})();
