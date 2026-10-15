// DEXTER AI API — Ollama Local / Ollama Cloud
// Configure OLLAMA_API_KEY on Render to enable hosted inference.
const http = require('node:http');
const PORT = Number(process.env.PORT || 3001);
const key = process.env.OLLAMA_API_KEY || '';
const cloud = !!key;
const HOST = (process.env.OLLAMA_URL || (cloud ? 'https://ollama.com' : 'http://127.0.0.1:11434')).replace(/\/$/, '');
const ORIGIN = process.env.ALLOWED_ORIGIN || 'https://h4cklaboratory.github.io';
const LIMIT = 25;
const REQUIRED_MODEL = process.env.REQUIRED_MODEL || 'Godmoded/llama3-lexi-uncensored';
const upstreamKey = process.env.OLLAMA_UPSTREAM_TOKEN || '';
const visitors = new Map();
const RUNPOD_ID = process.env.RUNPOD_ENDPOINT_ID || '';
const RUNPOD_KEY = process.env.RUNPOD_API_KEY || '';
const runpodReady = Boolean(RUNPOD_ID && RUNPOD_KEY);
async function runpodChat(messages) {
  const url='https://api.runpod.ai/v2/'+encodeURIComponent(RUNPOD_ID)+'/runsync';
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+RUNPOD_KEY},body:JSON.stringify({input:{model:REQUIRED_MODEL,messages}}),signal:AbortSignal.timeout(110000)});
  const data=await r.json();
  if (!r.ok) throw Error(data.error || 'Error Runpod HTTP '+r.status);
  if(data.status!=='COMPLETED') throw Error('Runpod no terminó la inferencia: '+(data.status||'desconocido')+'. Usa workers activos o aumenta el timeout.');
  if(data.output?.error)throw Error(data.output.error);
  if(typeof data.output?.message?.content!=='string')throw Error('Respuesta Runpod inválida');
  return data.output.message;
}
const modelIsExact = n => typeof n==='string' && (n.toLowerCase()===REQUIRED_MODEL.toLowerCase() || n.toLowerCase()===REQUIRED_MODEL.toLowerCase()+':latest');
const send = (res, status, data) => {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store'});
  res.end(JSON.stringify(data));
};
function authorizedHeaders() {
  return {'Content-Type':'application/json', ...(upstreamKey ? {Authorization:'Bearer '+upstreamKey} : key ? {Authorization:'Bearer '+key} : {})};
}
http.createServer(async (req,res)=>{
  if(req.method==='OPTIONS') return send(res,204,{});
  if(req.method==='POST' && req.url==='/api/chat' && req.headers.origin !== ORIGIN) return send(res,403,{error:'Origen no autorizado'});
  if(req.url==='/health' || req.url==='/api/status') return send(res,200,{ok:true,engine:runpodReady?'runpod-serverless':cloud?'ollama-cloud':process.env.OLLAMA_URL?'remote-ollama':'unconfigured',configured:runpodReady || cloud || !!process.env.OLLAMA_URL,model:REQUIRED_MODEL});
  if(req.method==='POST' && req.url==='/api/chat') {
    if(!runpodReady && !cloud && !process.env.OLLAMA_URL) return send(res,503,{error:'El administrador debe configurar OLLAMA_API_KEY en Render para activar la IA.'});
    const ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').toString().split(',')[0];
    const now=Date.now();const v=visitors.get(ip)||{until:now+3600000, count:0};if(now>=v.until){v.until=now+3600000;v.count=0}v.count++;visitors.set(ip,v);
    if(v.count>LIMIT) return send(res,429,{error:'Límite horario de solicitudes alcanzado.'});
    if(visitors.size>2000)for(const [k,value] of visitors)if(value.until<now)visitors.delete(k);
  }
  try {
    if(req.method==='GET'&&req.url==='/api/models'){
      if(runpodReady)return send(res,200,{models:[{name:REQUIRED_MODEL}],configured:true,requiredModel:REQUIRED_MODEL});
      if(!cloud && !process.env.OLLAMA_URL) return send(res,200,{models:[],configured:false});
      const upstream=await fetch(HOST+'/api/tags',{headers:authorizedHeaders(),signal:AbortSignal.timeout(15000)});
      const data=await upstream.json();
      if(!upstream.ok) return send(res,502,{error:data.error||'No se pueden listar modelos'});
      const models=(data.models||[]).filter(m=>modelIsExact(m.name)).map(m=>({name:m.name}));
      return send(res,200,{models,configured:models.length>0,requiredModel:REQUIRED_MODEL});
    }
    if(req.method==='POST'&&req.url==='/api/chat') {
      let body='';for await (const chunk of req){body+=chunk;if(body.length>150000)return send(res,413,{error:'Solicitud demasiado grande'})}
      let obj=JSON.parse(body);
      if(typeof obj.model!=='string'||!modelIsExact(obj.model)||!Array.isArray(obj.messages)||obj.messages.length>60)return send(res,400,{error:'Solicitud inválida'});
      const messages=obj.messages.filter(m=>['user','assistant','system'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=10000).map(m=>({role:m.role,content:m.content}));
      if(!messages.length)return send(res,400,{error:'Faltan mensajes'});
      if(runpodReady)return send(res,200,{message:await runpodChat(messages)});
      const upstream=await fetch(HOST+'/api/chat',{method:'POST',headers:authorizedHeaders(),body:JSON.stringify({model:obj.model,messages,stream:false}),signal:AbortSignal.timeout(115000)});
      let result=await upstream.json();
      if(!upstream.ok)return send(res,502,{error:result.error||'El proveedor de IA rechazó la solicitud'});
      return send(res,200,{message:result.message});
    }
    return send(res,404,{error:'Ruta no encontrada'});
  }catch(e){return send(res,502,{error:e.message||'Error del proveedor'})}
}).listen(PORT,'0.0.0.0',()=>console.log('DEXTER AI API lista en puerto '+PORT));
