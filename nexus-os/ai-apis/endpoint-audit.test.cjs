'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {inspectEndpoint, auditCatalog} = require('./endpoint-audit.cjs');
test('accepts standard HTTPS API URLs', () => {
  assert.equal(inspectEndpoint('https://api.groq.com/openai/v1').status, 'valid');
});
test('rejects local, non-HTTPS, and credential-bearing URLs', () => {
  for (const value of ['http://api.example.com/v1', 'https://localhost/v1', 'https://127.0.0.1/v1', 'https://user:pass@api.example.com/v1', 'https://api.example.com/v1?x=1']) {
    assert.equal(inspectEndpoint(value).status, 'invalid', value);
  }
});
test('does not treat templates as usable endpoints', () => {
  assert.equal(inspectEndpoint('https://api.example.com/{account_id}').status, 'template');
});
test('rejects unexpected catalog credential fields', () => {
  const result = auditCatalog({providers:[{name:'Example',baseURL:'https://api.example.com/v1',token:'placeholder'}],models:[]});
  assert.equal(result.ok, false);
});
test('bundled catalog passes', () => {
  const data = require('./catalog.json');
  const result = auditCatalog(data);
  assert.equal(result.ok, true, result.problems.join('; '));
});
