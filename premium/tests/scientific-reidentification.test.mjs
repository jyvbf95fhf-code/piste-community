import test from 'node:test';
import assert from 'node:assert/strict';
import { assessReidentificationRisk } from '../src/scientific-reidentification.mjs';

test('small groups and precise rare OPS criteria are suppressed before display',()=>{
 const small=assessReidentificationRisk({sessionCount:4,dogCount:3});
 assert.equal(small.allowed,false);assert.equal(small.action,'suppress');
 assert.equal(small.reason,'Échantillon insuffisant pour afficher ce résultat.');
 const rareOps=assessReidentificationRisk({sessionCount:9,dogCount:6,opsRarity:true,timestampPrecision:'exact',locationPrecision:'exact'});
 assert.equal(rareOps.allowed,false);assert.equal(rareOps.action,'suppress');
 assert.equal(rareOps.reason,'Résultat masqué : groupe trop petit');
});

test('qualifying coarse groups pass, while sensitive precision is coarsened',()=>{
 assert.equal(assessReidentificationRisk({sessionCount:8,dogCount:4}).action,'show');
 const result=assessReidentificationRisk({sessionCount:8,dogCount:4,timestampPrecision:'hour',locationPrecision:'coarse',criterionPrecision:'medium'});
 assert.equal(result.action,'coarsen');
});
