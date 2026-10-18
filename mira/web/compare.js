/* Métricas descriptivas A/B: texto y criterios literales; no evalúan veracidad. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MiraCompare = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const words = text => String(text ?? '').trim().match(/[^\s]+/gu) || [];
  const tokens = text => (String(text ?? '').toLocaleLowerCase('es').match(/[\p{L}\p{N}]+/gu) || []);
  const normalize = text => String(text ?? '').normalize('NFD').replace(/\p{M}/gu,'')
    .toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
  function parseCriteria(input) {
    const lines = Array.isArray(input) ? input : String(input ?? '').split(/\r?\n/);
    if (lines.length > 100) throw Error('Demasiadas líneas de criterios (máximo 100).');
    const unique = new Set(), criteria = [];
    for (const line of lines) {
      const raw = String(line).trim();
      if (!raw) continue;
      if (raw.length > 120) throw Error('Cada criterio debe tener 120 caracteres o menos.');
      const key = normalize(raw);
      if (!key || unique.has(key)) continue;
      unique.add(key);
      criteria.push(raw);
      if (criteria.length > 20) throw Error('Se permiten hasta 20 criterios únicos.');
    }
    return criteria;
  }
  function coverage(response, criteria) {
    const normalized = ' ' + normalize(response) + ' ';
    const matched = [], missing = [];
    for (const criterion of criteria) {
      const key = normalize(criterion);
      (normalized.includes(' ' + key + ' ') ? matched : missing).push(criterion);
    }
    return {matched, missing, count: matched.length, total: criteria.length,
      percent: criteria.length ? Math.round(1000 * matched.length / criteria.length) / 10 : null};
  }
  function measure(text) {
    const raw = String(text ?? '');
    return {characters: [...raw].length, words: words(raw).length, lines: raw ? raw.split(/\r?\n/).length : 0};
  }
  function compare(a, b, required = []) {
    const A = measure(a), B = measure(b);
    const x = new Set(tokens(a)), y = new Set(tokens(b));
    const union = new Set([...x, ...y]);
    const common = [...x].filter(v => y.has(v)).length;
    const similarity = union.size ? Math.round(1000 * common / union.size) / 10 : 100;
    const criteria = parseCriteria(required);
    const coverageA = coverage(a, criteria), coverageB = coverage(b, criteria);
    return {a: A, b: B, wordDifference: B.words - A.words,
      lexicalOverlapPercent: similarity, identical: String(a ?? '') === String(b ?? ''),
      criteria, coverageA, coverageB,
      coverageDifferencePoints: criteria.length ? Math.round(10 * (coverageB.percent - coverageA.percent)) / 10 : null,
      explanation: 'Jaccard de palabras únicas y presencia literal de criterios; no miden calidad ni veracidad.'};
  }
  return {measure, compare, parseCriteria, coverage, normalize};
});
