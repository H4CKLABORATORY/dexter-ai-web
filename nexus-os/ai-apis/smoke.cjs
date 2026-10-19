'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('nexus-os/ai-apis/catalog.json','utf8'));
const ui=fs.readFileSync('nexus-os/ai-apis/index.html','utf8');
const script=fs.readFileSync('nexus-os/ai-apis/app.js','utf8');
const home=fs.readFileSync('nexus-os/index.html','utf8');

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
console.log('NEXUS AI API HUB static checks OK:',data.providers.length,'providers,',data.models.length,'featured models');
