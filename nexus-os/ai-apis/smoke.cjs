'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('nexus-os/ai-apis/catalog.json','utf8'));
const ui=fs.readFileSync('nexus-os/ai-apis/index.html','utf8');
const script=fs.readFileSync('nexus-os/ai-apis/app.js','utf8');
const home=fs.readFileSync('nexus-os/index.html','utf8');
const sw=fs.readFileSync('nexus-os/sw.js','utf8');
assert(sw.includes("'./ai-apis/catalog.json'"),'AI catalog must be cached offline');
assert(sw.includes("'./ai-apis/index.html'"),'AI page must be cached offline');
assert(sw.includes("u.pathname.split('/').includes('ai-apis')"),'AI route must have its own offline fallback');

assert.equal(data.schema,1);
assert(data.providers.length>=20,'Expected public free provider directory');
assert(data.models.length>=40,'Expected featured public models');
const names=new Set();
for(const p of data.providers){
 assert(p.name&&typeof p.name==='string');
 assert(!names.has(p.name),'Duplicate provider '+p.name);names.add(p.name);
 assert(['permanent','renewable'].includes(p.category));
 if(p.baseURL&&!p.baseURL.includes('{'))assert(new URL(p.baseURL).protocol==='https:');
 if(p.keyUrl)assert.equal(new URL(p.keyUrl).protocol,'https:');
 assert(!('apiKey' in p)&&!('token' in p),'Public dataset must not include secrets');
}
for(const m of data.models){
 assert(names.has(m.provider),'Model provider unknown: '+m.provider);
 assert(m.id&&m.name);
}
for(const path of ['./app.js','./style.css','./catalog.json']) {
 assert(fs.existsSync('nexus-os/ai-apis/'+path.replace('./','')),'Missing app asset '+path);
}
assert(ui.includes('src="./app.js"')&&ui.includes('href="./style.css"'));
assert(home.includes('href="./ai-apis/"'),'NEXUS launcher missing API HUB');
assert(script.includes('navigator.clipboard.writeText')&&script.includes('parseRemote'));
assert(!script.includes('localStorage.setItem(\'apiKey\''),'Never persist API keys');
new vm.Script(script,{filename:'ai-apis/app.js'});

// Exercise the real browser catalog parser with a complete synthetic upstream README.
const elements = new Map();
const context=vm.createContext({
  URL,console,JSON,Set,Map,RegExp,Number,String,
  localStorage:{getItem:()=>null,setItem:()=>{}},
  navigator:{clipboard:{writeText:async()=>{}}},
  document:{
    getElementById(id){if(!elements.has(id))elements.set(id,{addEventListener(){},textContent:'',hidden:false,replaceChildren(){}});return elements.get(id)},
    querySelectorAll(){return []}
  },
  setTimeout,clearTimeout
});
vm.runInContext(script.replace(/loadCatalog\(\);\s*$/, ''),context,{filename:'ai-apis/app.js'});
const table=(header,rows)=>header+'\n'+rows.map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n';
const a=(url,text)=>'<a href="'+url+'">'+text+'</a>';
const permanent=data.providers.filter(p=>p.category==='permanent');
const renewable=data.providers.filter(p=>p.category==='renewable');
const providerRow=p=>[p.name,String(p.freeModels),p.requirements,p.context,p.modalities.join(', '),a(p.keyUrl||'https://freellm.net/', 'Key')];
const renewableRow=p=>[p.name,String(p.freeModels),'Free tier',p.context,p.modalities.join(', '),a(p.keyUrl||'https://freellm.net/','Key')];
const quickRow=p=>[p.name,'`'+(p.baseURL||'')+'`',a(p.keyUrl||'https://freellm.net/','Key'),p.requirements];
let prev='';
const modelRows=data.models.map(m=>{const row=[m.provider===prev?'':m.provider,a(m.detailUrl||'https://freellm.net/models/',m.name),'`'+m.id+'`',m.context,m.limits];prev=m.provider;return row});
const markdown=[
  '<!-- BEGIN_PERMANENT_FREE -->',table('| Provider | Free Models | Credit Card? | Max Context | Modalities | Get API Key |',permanent.map(providerRow)),'<!-- END_PERMANENT_FREE -->',
  '<!-- BEGIN_RENEWABLE -->',table('| Provider | Free Models | Credit Model | Max Context | Modalities | Get API Key |',renewable.map(renewableRow)),'<!-- END_RENEWABLE -->',
  '<!-- BEGIN_QUICK_REF -->',table('| Provider | Base URL | Get API Key | Credit Card? |',data.providers.map(quickRow)),'<!-- END_QUICK_REF -->',
  '<!-- BEGIN_BEST_MODELS -->',table('| Provider | Best Free Model | Model ID | Max Context | Rate Limit |',modelRows),'<!-- END_BEST_MODELS -->',
].join('\n');
context.fixture=markdown;
const rebuilt=vm.runInContext('parseRemote(fixture)',context);
assert.equal(rebuilt.providers.length,data.providers.length,'Remote provider parser');
assert.equal(rebuilt.models.length,data.models.length,'Remote featured model parser');
assert.deepEqual(new Set(rebuilt.providers.map(x=>x.name)),names);
console.log('NEXUS AI API HUB static checks OK:',data.providers.length,'providers,',data.models.length,'featured models');
