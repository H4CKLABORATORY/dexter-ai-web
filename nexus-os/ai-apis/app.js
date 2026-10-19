'use strict';
// DEXTER NEXUS API HUB — public catalog, never stores or transmits API keys.
const $=id=>document.getElementById(id);
const SOURCE='https://raw.githubusercontent.com/open-free-llm-api/awesome-freellm-apis/main/README.md';
const EXTERNAL='https://freellm.net/models/';
let catalog={providers:[],models:[]}, activeFilter='all', query='', selectedCode='';
const readFavorites=()=>{try{const v=JSON.parse(localStorage.getItem('nexus-ai-api-favorites-v1')||'[]');return new Set(Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,60):[])}catch{return new Set()}};
let favorites=readFavorites();
const saveFavorites=()=>{try{localStorage.setItem('nexus-ai-api-favorites-v1',JSON.stringify([...favorites]))}catch{}};
const linkValue=s=>{const match=String(s||'').match(/href="([^"]+)"/);return match&&/^https:\/\//.test(match[1])?match[1]:''};
const clean=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/`/g,'').trim();
const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}};
const section=(text,from,to)=>text.split(from)[1]?.split(to)[0]||'';
function tableRows(value){
 return value.split('\n').map(row=>row.trim()).filter(row=>row.startsWith('|')&&!/^\|\s*[-:]+\s*\|/.test(row)&&!/^\|\s*(Provider|Model)\s*\|/.test(row))
   .map(row=>row.slice(1,-1).split('|').map(v=>v.trim()));
}
function parseRemote(text){
 if(typeof text!=='string'||text.length<1000)throw Error('Datos no válidos');
 const summary=tableRows(section(text,'<!-- BEGIN_PERMANENT_FREE -->','<!-- END_PERMANENT_FREE -->'))
 .filter(r=>r.length>=6).map(r=>({name:clean(r[0]),freeModels:Number(clean(r[1]))||0,requirements:clean(r[2]),context:clean(r[3]),modalities:clean(r[4]).split(',').map(x=>x.trim()),keyUrl:linkValue(r[5]),category:'permanent'}));
 summary.push(...tableRows(section(text,'<!-- BEGIN_RENEWABLE -->','<!-- END_RENEWABLE -->'))
 .filter(r=>r.length>=6).map(r=>({name:clean(r[0]),freeModels:Number(clean(r[1]))||0,requirements:clean(r[2]),context:clean(r[3]),modalities:clean(r[4]).split(',').map(x=>x.trim()),keyUrl:linkValue(r[5]),category:'renewable'})));
 const lookup=new Map(summary.map(p=>[p.name,p]));
 for(const r of tableRows(section(text,'<!-- BEGIN_QUICK_REF -->','<!-- END_QUICK_REF -->'))){
  const p=lookup.get(clean(r[0]));if(!p)continue;
  p.baseURL=clean(r[1]);p.keyUrl=linkValue(r[2])||p.keyUrl;
 }
 let current='',models=[];
 for(const r of tableRows(section(text,'<!-- BEGIN_BEST_MODELS -->','<!-- END_BEST_MODELS -->'))){
  if(clean(r[0]))current=clean(r[0]);
  if(r.length<5||!lookup.has(current)||!clean(r[2]))continue;
  models.push({provider:current,name:clean(r[1]),id:clean(r[2]),context:clean(r[3]),limits:clean(r[4]),detailUrl:linkValue(r[1])});
 }
 if(summary.length<15||models.length<20)throw Error('Catálogo incompleto');
 return {schema:1,source:'https://github.com/open-free-llm-api/awesome-freellm-apis',fullDirectory:EXTERNAL,providers:summary,models};
}
function h(tag,text,cls){
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=String(text);
 if(cls)el.className=cls;
 return el;
}
function anchor(label,url){
 const a=h('a',label);const safe=safeURL(url);
 if(!safe){a.textContent='Página no disponible';a.removeAttribute('href');return a;}
 a.href=safe;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function status(text){$('sourceStatus').textContent=text;}
async function loadCatalog(){
 try{
  const response=await fetch('./catalog.json');
  if(!response.ok)throw Error('HTTP '+response.status);
  const json=await response.json();
  if(!Array.isArray(json.providers)||!Array.isArray(json.models))throw Error('Formato inesperado');
  catalog=json;render();status('Instantánea incluida · Actualizando…');
 }catch(err){status('No se pudo abrir la instantánea');$('results').textContent='No se encontró el catálogo local.';}
 await refreshCatalog(true);
}
async function refreshCatalog(silent=false){
 const btn=$('refreshBtn');btn.disabled=true;
 if(!silent)status('Consultando repositorio público…');
 const ctrl=new AbortController();
 const t=setTimeout(()=>ctrl.abort(),12000);
 try{
  const response=await fetch(SOURCE,{signal:ctrl.signal,cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const remote=parseRemote(await response.text());
  catalog=remote;
  render();status('Datos consultados desde GitHub · No se comprobaron claves');
 }catch(err){
  status(catalog.providers?.length?'Catálogo guardado · Actualización remota no disponible':'No se pudo cargar el catálogo');
 }finally{clearTimeout(t);btn.disabled=false}
}
const lower=s=>String(s||'').toLocaleLowerCase('es');
function matches(provider,models){
 const terms=[provider.name,provider.baseURL,provider.requirements,...provider.modalities,...models.flatMap(m=>[m.name,m.id,m.context])].map(lower).join(' ');
 const q=lower(query);
 if(q&&!terms.includes(q))return false;
 if(activeFilter==='permanent'&&provider.category!=='permanent')return false;
 if(activeFilter==='renewable'&&provider.category!=='renewable')return false;
 if(activeFilter==='nocard'&&provider.requirements!=='No')return false;
 if(activeFilter==='saved'&&!favorites.has(provider.name))return false;
 return true;
}
function render(){
 const providers=Array.isArray(catalog.providers)?catalog.providers:[];
 const models=Array.isArray(catalog.models)?catalog.models:[];
 $('providerCount').textContent=String(providers.length);
 $('modelCount').textContent=String(models.length);
 const root=$('results');root.replaceChildren();
 let visible=0;
 for(const p of providers){
  const all=models.filter(m=>m.provider===p.name);
  if(!matches(p,all))continue;
  visible++;
  const card=h('article',undefined,'provider');
  const head=h('div',undefined,'provider-head');const block=h('div');
  block.append(h('h3',p.name),h('small',p.category==='renewable'?'Créditos o cuota renovable':'Plan gratuito indicado'));
  const fav=h('button',favorites.has(p.name)?'★':'☆','fav'+(favorites.has(p.name)?' active':''));
  fav.type='button';fav.setAttribute('aria-label','Guardar '+p.name+' en favoritos');fav.setAttribute('aria-pressed',String(favorites.has(p.name)));
  fav.addEventListener('click',()=>{
   if(favorites.has(p.name))favorites.delete(p.name);else favorites.add(p.name);
   saveFavorites();render();
  });
  head.append(block,fav);card.append(head);
  card.append(h('div',p.baseURL||'Endpoint específico: consultar documentación','endpoint'));
  card.append(h('small','Acceso: '+(p.requirements||'Consultar proveedor')+' · '+(p.context||'?')+' contexto · '+p.freeModels+' modelos listados en fuente'));
  const list=h('div',undefined,'models');
  const matchesList=all.filter(m=>!query||lower([p.name,m.name,m.id].join(' ')).includes(lower(query))||lower(p.baseURL).includes(lower(query)));
  for(const m of (matchesList.length?matchesList:all).slice(0,4)){
   const line=h('div',undefined,'model');const info=h('div');info.append(h('div',m.name||m.id,'model-name'),h('small',m.context+' · '+(m.limits||'Consultar límites')));
   const choose=h('button','Configurar');choose.type='button';choose.addEventListener('click',()=>selectModel(p,m));
   line.append(info,choose);list.append(line);
  }
  if(!all.length)list.append(h('small','Abre el directorio para ver modelos disponibles.'));
  card.append(list);
  const foot=h('div',undefined,'provider-foot');
  foot.append(anchor('Solicitar API key ↗',p.keyUrl||EXTERNAL));
  foot.append(h('span',all.length+' modelos destacados'));
  card.append(foot);root.append(card);
 }
 if(!visible)root.append(h('div','No hay resultados para esta búsqueda. Prueba otro filtro.','empty'));
}
const compatibleSet=new Set(['NVIDIA NIM','ModelScope','OpenRouter','Groq','Mistral AI','Cerebras','Hugging Face','SambaNova','SiliconFlow','Aion Labs','Z AI (Zhipu AI)','OVHcloud AI Endpoints','LLM7.io']);
function selectModel(p,m){
 const label=$('selected'),panel=$('codePanel');
 $('setup').scrollIntoView({behavior:'smooth',block:'start'});
 if(!compatibleSet.has(p.name)||!safeURL(p.baseURL)||p.baseURL.includes('{')){
  selectedCode='';panel.hidden=true;
  label.textContent=p.name+' · '+m.name+': esta API requiere una integración específica. Abre la documentación del proveedor; no generamos una plantilla incompatible.';
  return;
 }
 const id='nexus-'+p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const config={$schema:'https://opencode.ai/config.json',provider:{[id]:{npm:'@ai-sdk/openai-compatible',name:p.name,options:{baseURL:p.baseURL},models:{[m.id]:{name:m.name||m.id}}}}};
 selectedCode=JSON.stringify(config,null,2);
 label.textContent='Seleccionado: '+p.name+' / '+m.name+' · Provider ID: '+id+' · Conecta la clave de tu cuenta con /connect → Other → '+id+'.';
 $('configText').textContent=selectedCode;panel.hidden=false;
}
async function copyText(value){
 try{await navigator.clipboard.writeText(value);status('Copiado al portapapeles.');return true}
 catch{status('No se pudo copiar. Selecciona el texto manualmente.');return false}
}
$('refreshBtn').addEventListener('click',()=>refreshCatalog());
$('search').addEventListener('input',e=>{query=e.target.value.trim().slice(0,150);$('clearSearch').hidden=!query;render()});
$('clearSearch').addEventListener('click',()=>{query='';$('search').value='';$('clearSearch').hidden=true;render();$('search').focus()});
document.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{
 activeFilter=b.dataset.filter;
 document.querySelectorAll('.chip').forEach(c=>{const chosen=c===b;c.classList.toggle('active',chosen);c.setAttribute('aria-pressed',String(chosen))});
 render();
}));
$('copyConfig').addEventListener('click',()=>selectedCode&&copyText(selectedCode));
$('copyConnect').addEventListener('click',()=>copyText('/connect'));
$('downloadConfig').addEventListener('click',()=>{
 if(!selectedCode)return;
 const blob=new Blob([selectedCode+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='opencode.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
});
loadCatalog();
