/* MIRA Audit Engine v2.1 — deterministic, offline, explainable structural analysis.
   This is NOT an LLM, a neural activation reader, or a truth verifier. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MiraAudit=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const keys=['role','objective','context','roles','rules'];
 const labels={role:'ROL',objective:'OBJETIVO',context:'CONTEXTO',roles:'RESPONSABLES',rules:'REGLAS'};
 const stop=new Set(('de del la las el los un una unas unos y o e a al en por con para desde como que quien cuando donde como sus se son es ser esta este estos estas este mi tu su lo le les nos ya si no mas muy tan ' +
 'and the a an of on for to with as is be from at or if not these those this that we they you your it will can should must than has have by into').split(/\s+/));
 const accent=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 function tokenize(text){return (accent(String(text||'').toLocaleLowerCase('es')).match(/[a-z0-9ñ]{3,}/g)||[]).filter(t=>!stop.has(t));}
 function wordCount(text){return (String(text||'').trim().match(/\S+/g)||[]).length;}
 function evaluate(fields){const f=Object.fromEntries(keys.map(k=>[k,String(fields?.[k]||'').trim()]));const issues=[];
  const flag=(id,severity,title,advice)=>issues.push({id,severity,title,advice});
  for(const k of keys){if(!f[k])flag('empty-'+k,'high','Falta '+labels[k].toLowerCase(),`Completa la sección ${labels[k]} antes de ejecutar.`);}
  if(f.objective&&wordCount(f.objective)<10)flag('objective-short','medium','Objetivo poco detallado','Especifica resultado, público y condición de éxito observable.');
  if(f.objective&&!/entreg|resultado|archivo|tabla|lista|informe|codigo|código|resumen|document|formato|output|json|ejemplo|respuesta|reporte|plan|modelo|interfaz|funcion|aplicacion|aplicación/i.test(f.objective))flag('deliverable','medium','No se reconoce el entregable','Indica qué artefacto o respuesta exacta debe producir la IA.');
  const all=Object.values(f).join(' ');
  if(all&&!/si no|sin datos|cuando falte|no invent|supuest|inciert|limitaci|pregunt|incertid|unknown|uncertain|missing|cannot|no dispong|no tiene|no hay/i.test(all))flag('uncertainty','medium','Falta protocolo de incertidumbre','Añade qué hacer cuando falten datos: preguntar, señalar límites y no inventar.');
  if(f.rules&&!/verific|prueb|comprob|test|evalu|valid|evidenc|fuente|revis|confirm|control de calidad|auditor/i.test(f.rules))flag('verification','medium','Sin criterio de verificación','Agrega pasos verificables y qué evidencias deben reportarse.');
  if(all&&/\b(mejor|perfecto|rapido|rápido|impresionante|excelente|espectacular|ideal|optimo|óptimo)\b/i.test(all)&&!/\b(medid|segundo|milisegundo|%|porcentaj|cifras|prueba|metrica|métrica|criterio|tiempo límite)\b/i.test(all))flag('vague','low','Objetivos cualitativos sin métricas','Aporta criterios observables en vez de adjetivos como «mejor».');
  const sections=keys.map(k=>({id:k,label:labels[k],words:wordCount(f[k]),terms:[...new Set(tokenize(f[k]))]}));
  let edges=[];for(let i=0;i<sections.length;i++)for(let j=i+1;j<sections.length;j++){
    const common=sections[i].terms.filter(w=>sections[j].terms.includes(w));if(common.length)edges.push({from:sections[i].id,to:sections[j].id,weight:common.length,terms:common.slice(0,6)});
  }
  // Score counts observable structure only; it is not answer quality or model intelligence.
  const filled=sections.filter(s=>s.words>0).length;
  const score=Math.max(0,Math.min(100,Math.round(100*(filled/5)-issues.filter(x=>x.severity==='high').length*8-issues.filter(x=>x.severity==='medium').length*9-issues.filter(x=>x.severity==='low').length*4)));
  return {version:'2.1',score,issues,sections,edges,words:wordCount(all),filled,notes:'Heurística estructural sin llamadas a IA. No mide veracidad ni inteligencia.'};
 }
 function improve(fields,report=evaluate(fields)){
  const f=Object.fromEntries(keys.map(k=>[k,String(fields?.[k]||'').trim()]));
  const chunks=['# ESPECIFICACIÓN DE LA TAREA'];
  for(const k of keys){chunks.push('\n## '+labels[k]);chunks.push(f[k]||'[POR DEFINIR: completa '+labels[k].toLowerCase()+']');}
  chunks.push('\n## CRITERIOS DE ACEPTACIÓN');
  chunks.push('1. Entrega exactamente el resultado solicitado; separa lo comprobado de lo supuesto.');
  chunks.push('2. Antes de afirmar que ejecutaste una acción, incluye una prueba o indícalo como pendiente.');
  chunks.push('3. Si faltan datos esenciales, formula la pregunta mínima necesaria. No inventes hechos.');
  if(report.issues.length){chunks.push('\n## PUNTOS QUE DEBES PRECISAR (NO SUPONER)');for(const issue of report.issues)chunks.push('- '+issue.advice);}
  return chunks.join('\n').trim()+'\n';
 }
 function exportProject(fields){return {format:'mira-prompt-project',version:2,fields:Object.fromEntries(keys.map(k=>[k,String(fields?.[k]||'')]))};}
 function importProject(payload){if(!payload||payload.format!=='mira-prompt-project'||!([1,2].includes(payload.version))||!payload.fields||typeof payload.fields!=='object')throw Error('Archivo de proyecto MIRA inválido.');const result={};for(const k of keys){if(typeof payload.fields[k]!=='string'||payload.fields[k].length>50000)throw Error('Sección inválida: '+k);result[k]=payload.fields[k];}return result;}
 return {keys,tokenize,wordCount,evaluate,improve,exportProject,importProject};
});
