import test from 'node:test';
import assert from 'node:assert/strict';
import {createScientificStore} from '../src/scientific-store.mjs';

const actor={name:'Sébastien',permissions:{research:true}},clock=()=> '2026-10-07T10:00:00.000Z';
test('scientific memory store rejects nonmembers and returns detached snapshots',()=>{
 assert.throws(()=>createScientificStore({actor:{name:'Camille'}}).createCohort({name:'x'}),/Accès scientifique refusé/);
 const store=createScientificStore({actor,clock}),snap=store.snapshot();snap.cohorts.push({id:'fake'});assert.equal(store.snapshot().cohorts.length,0);
});
test('cohorts can be created updated duplicated and deleted locally',()=>{
 const store=createScientificStore({actor,clock}),first=store.createCohort({name:'Rural',criteria:{environment:'rural'}}),updated=store.updateCohort(first.id,{name:'Rural confirmé'}),copy=store.duplicateCohort(first.id,'Copie');
 assert.equal(updated.name,'Rural confirmé');assert.equal(copy.criteria.environment,'rural');assert.notEqual(copy.id,first.id);assert.equal(store.deleteCohort(copy.id),true);assert.equal(store.snapshot().cohorts.length,1);
});
test('annotation edits append a new revision and preserve the original',()=>{
 const store=createScientificStore({actor,clock}),one=store.appendAnnotation({sessionId:'s1',text:'rupture',tags:['rupture']}),two=store.reviseAnnotation(one.id,{text:'rupture à revoir'}),rows=store.snapshot().annotations;
 assert.equal(rows.length,2);assert.equal(rows[0].text,'rupture');assert.equal(rows[1].revisionOf,one.id);assert.equal(two.text,'rupture à revoir');
});
