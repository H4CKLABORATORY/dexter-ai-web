// DEXTER AI Web backend — Node.js 18+
// Set OLLAMA_URL and ALLOWED_ORIGIN in your hosting provider.
const http=require('node:http');
const OLLAMA=process.env.OLLAMA_URL||'http://127.0.0.1:11434';
const ORIGIN=process.env.ALLOWED_ORIGIN||'https://h4cklaboratory.github.io';
const PORT=Number(process.env.PORT||3001);
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS')return json(res,204,{});
  if(req.url==='/health')return json(res,200,{ok:true});
  try{
    if(req.method==='GET'&&req.url==='/api/models'){
      const r=await fetch(OLLAMA+'/api/tags',{signal:AbortSignal.timeout(10000)});
      if(!r.ok)throw new Error('Ollama devolvió '+r.status);
      const d=await r.json();return json(res,200,{models:(d.models||[]).map(x=>({name:x.name}))});
    }
    if(req.method==='POST'&&req.url==='/api/chat'){
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>200000){return json(res,413,{error:'Solicitud demasiado grande'})}}
      const body=JSON.parse(raw);
      if(typeof body.model!=='string'||!Array.isArray(body.messages)||body.messages.length>100)return json(res,400,{error:'Solicitud inválida'});
      const messages=body.messages.map(m=>({role:m.role,content:m.content})).filter(m=>['system','user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=20000);
      if(!messages.length)return json(res,400,{error:'Faltan mensajes'});
      const r=await fetch(OLLAMA+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:body.model,messages,stream:false}),signal:AbortSignal.timeout(120000)});
      const d=await r.json();if(!r.ok)return json(res,502,{error:d.error||'Error de Ollama'});return json(res,200,{message:d.message});
    }
    return json(res,404,{error:'Ruta no encontrada'});
  }catch(e){return json(res,502,{error:e.message||'Error interno'})}
}).listen(PORT,'0.0.0.0',()=>console.log('DEXTER AI backend en puerto '+PORT));
