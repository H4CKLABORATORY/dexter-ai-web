'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sw=fs.readFileSync('nexus-os/sw.js','utf8');
assert(sw.includes("'./ai-apis/index.html'"));
assert(sw.includes("'./ai-apis/catalog.json'"));
assert(sw.includes("'./powershell-mobile/index.html'"));
console.log('Offline cache assets present');
