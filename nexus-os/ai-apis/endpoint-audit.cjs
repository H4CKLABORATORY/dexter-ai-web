'use strict';
// Offline audit only: never contacts providers or handles user credentials.
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

function inspectEndpoint(value) {
  if (value === '' || value == null) return {status: 'missing'};
  if (typeof value !== 'string') return {status: 'invalid', reason: 'not a string'};
  if (value.includes('{') || value.includes('}')) return {status: 'template'};
  let url;
  try { url = new URL(value); }
  catch { return {status: 'invalid', reason: 'malformed URL'}; }
  if (url.protocol !== 'https:') return {status: 'invalid', reason: 'HTTPS required'};
  if (url.username || url.password) return {status: 'invalid', reason: 'embedded credentials'};
  if (url.search || url.hash) return {status: 'invalid', reason: 'query or fragment'};
  if (url.port) return {status: 'invalid', reason: 'nonstandard port'};
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || net.isIP(host) ||
      !/^[a-z0-9.-]+$/.test(host) || !host.includes('.') ||
      host.endsWith('.local') || host.endsWith('.internal')) {
    return {status: 'invalid', reason: 'local or invalid host'};
  }
  return {status: 'valid', host};
}

function auditCatalog(data) {
  if (!data || !Array.isArray(data.providers) || !Array.isArray(data.models)) {
    throw new Error('Catalog structure invalid');
  }
  const seen = new Set();
  const problems = [];
  const summary = {valid: 0, missing: 0, template: 0, invalid: 0};
  for (const provider of data.providers) {
    if (!provider || typeof provider.name !== 'string' || !provider.name.trim()) {
      problems.push('Unnamed provider');
      continue;
    }
    if (seen.has(provider.name)) problems.push('Duplicate provider: ' + provider.name);
    seen.add(provider.name);
    if ('apiKey' in provider || 'api_key' in provider || 'token' in provider) {
      problems.push('Credential field in provider: ' + provider.name);
    }
    const result = inspectEndpoint(provider.baseURL);
    summary[result.status]++;
    if (result.status === 'invalid') {
      problems.push(provider.name + ': ' + result.reason);
    }
  }
  for (const model of data.models) {
    if (!seen.has(model.provider)) problems.push('Unknown model provider: ' + String(model.provider));
  }
  return {ok: problems.length === 0, problems, summary};
}

if (require.main === module) {
  const file = path.join(__dirname, 'catalog.json');
  const result = auditCatalog(JSON.parse(fs.readFileSync(file, 'utf8')));
  console.log('Endpoint audit:', JSON.stringify(result.summary));
  if (!result.ok) {
    for (const problem of result.problems) console.error('FAIL:', problem);
    process.exitCode = 1;
  }
}

module.exports = {inspectEndpoint, auditCatalog};
