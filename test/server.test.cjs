const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const {spawn} = require('node:child_process');

const MODEL = 'Godmoded/llama3-lexi-uncensored';
const ORIGIN = 'https://h4cklaboratory.github.io';

async function openPort() {
  const s = net.createServer();
  await new Promise((resolve, reject) => s.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = s.address().port;
  await new Promise(resolve => s.close(resolve));
  return port;
}

async function environment({access='sample-test-token',provider=true}={}) {
  let upstream;
  if (provider) {
    upstream = http.createServer((req,res)=>{
      res.setHeader('Content-Type','application/json');
      if(req.url==='/api/tags') return res.end(JSON.stringify({models:[{name:MODEL+':latest'}]}));
      if(req.url==='/api/chat'){
        req.resume();
        return res.end(JSON.stringify({message:{role:'assistant',content:'Respuesta verificada de prueba'}}));
      }
      res.statusCode=404;res.end('{}');
    });
    await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  }
  const port=await openPort();
  const env={...process.env,PORT:String(port),ALLOWED_ORIGIN:ORIGIN,CHAT_ACCESS_TOKEN:access,
    OLLAMA_URL:provider?'http://127.0.0.1:'+upstream.address().port:''};
  delete env.OLLAMA_API_KEY;delete env.RUNPOD_ENDPOINT_ID;delete env.RUNPOD_API_KEY;
  const proc=spawn(process.execPath,['server.js'],{cwd:process.cwd(),env,stdio:['ignore','pipe','pipe']});
  const base='http://127.0.0.1:'+port;
  let ready=false;
  for(let i=0;i<70;i++){
    try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(300)});if(r.ok){ready=true;break}}catch{}
    await new Promise(resolve=>setTimeout(resolve,90));
  }
  if(!ready){proc.kill();if(upstream)upstream.close();throw Error('Server did not start')}
  return {base,close:async()=>{proc.kill();if(upstream)await new Promise(resolve=>upstream.close(resolve))}};
}
const post = (base, data, key, origin=ORIGIN) => fetch(base+'/api/chat',{
  method:'POST',headers:{'Origin':origin,'Content-Type':'application/json',...(key?{'Authorization':'Bearer '+key}:{})},
  body:typeof data==='string'?data:JSON.stringify(data)
});
const sample = {model:MODEL,messages:[{role:'user',content:'Hola'}]};

test('chat requires token, validates origin, model and payload',async()=>{
  const env=await environment();try{
    const before=await (await fetch(env.base+'/api/status')).json();
    assert.equal(before.ok,true);
    assert.equal(before.accessProtected,true);
    assert.equal(before.modelVerified,false);

    const listing=await (await fetch(env.base+'/api/models')).json();
    assert.equal(listing.models.length,1);
    assert.equal(listing.models[0].name,MODEL+':latest');

    assert.equal((await post(env.base,sample)).status,401);
    assert.equal((await post(env.base,sample,'bad-token')).status,401);
    assert.equal((await post(env.base,sample,'sample-test-token','https://other.example')).status,403);
    assert.equal((await post(env.base,{...sample,model:'other-model'},'sample-test-token')).status,400);
    assert.equal((await post(env.base,'{broken','sample-test-token')).status,400);

    const response=await post(env.base,sample,'sample-test-token');
    assert.equal(response.status,200);
    assert.equal((await response.json()).message.content,'Respuesta verificada de prueba');
    assert.equal((await (await fetch(env.base+'/api/status')).json()).modelVerified,true);
  }finally{await env.close()}
});

test('unconfigured access token fails closed',async()=>{
  const env=await environment({access:''});try{
    assert.equal((await post(env.base,sample)).status,503);
  }finally{await env.close()}
});

test('unconfigured inference is not falsely reported ready',async()=>{
  const env=await environment({provider:false});try{
    const status=await (await fetch(env.base+'/api/status')).json();
    assert.equal(status.configured,false);
    assert.equal((await post(env.base,sample,'sample-test-token')).status,503);
  }finally{await env.close()}
});
