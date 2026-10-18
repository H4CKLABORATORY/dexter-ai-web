const assert=require('node:assert/strict');
const {compare,parseCriteria,coverage,normalize}=require('../web/compare.js');
assert.deepEqual(parseCriteria('Fuentes\nConclusión\nfuéntes\n'),['Fuentes','Conclusión']);
assert.equal(normalize('¡Árboles,  2026!'),'arboles 2026');
assert.deepEqual(coverage('Incluye FUENTES y conclusión.',['fuentes','CONCLUSION']).missing,[]);
assert.equal(coverage('La fuente original',['fuentes']).count,0); // not substring
assert.equal(coverage('Datos sin conclusión',['conclusion','referencias']).percent,50);
assert.equal(coverage('',['Fuentes']).percent,0);
assert.equal(coverage('sin criterios',[]).percent,null);
const result=compare('Tiene fuentes','Tiene FUENTES y CONCLUSIÓN','fuentes\nconclusión');
assert.equal(result.coverageA.percent,50);
assert.equal(result.coverageB.percent,100);
assert.equal(result.coverageDifferencePoints,50);
assert.deepEqual(result.coverageA.missing,['conclusión']);
assert.equal(compare('a','b').criteria.length,0);
assert.throws(()=>parseCriteria(Array.from({length:21},(_,i)=>'criterio '+i)),/20 criterios/);
assert.throws(()=>parseCriteria('x'.repeat(121)),/120 caracteres/);
console.log('14 pruebas nuevas de criterios literales A/B: OK');
