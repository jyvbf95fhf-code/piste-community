import test from 'node:test';
import assert from 'node:assert/strict';
import {createRemoteSession,reduceRemoteSession,joinRemoteSession,projectRemoteSession} from '../src/server/coaching-service.mjs';

const tracer={id:'11111111-1111-4111-8111-111111111111',name:'Traceur QA'};
const driver={id:'22222222-2222-4222-8222-222222222222',name:'Conducteur QA'};
const now=Date.now();
const fix={timestamp:now,coords:{latitude:48.58,longitude:7.75,accuracy:5}};
const create=mode=>createRemoteSession({id:'33333333-3333-4333-8333-333333333333',owner:tracer,role:'traceur',mode,dogName:'Chien QA',scenario:'connected_traceur',traceType:'direct',now});

for(const mode of ['normal','simple_blind','full_blind']){
 test(`Traceur starts before driver joins — ${mode}`,()=>{
  const initial=create(mode);
  assert.equal(initial.members.length,1);
  assert.equal(initial.search.phase,'PREPARATION');
  const laying=reduceRemoteSession(initial,{userId:tracer.id,type:'start-pose',payload:{fix,segmentId:'first'},now});
  assert.equal(laying.search.phase,'LAYING');
  assert.equal(laying.members.length,1);
  assert.ok(laying.tracer.gpsPose);
  assert.equal(initial.search.phase,'PREPARATION');
  assert.throws(()=>reduceRemoteSession(initial,{userId:driver.id,type:'start-pose',payload:{fix},now}),/Session inaccessible/);
  assert.throws(()=>reduceRemoteSession(laying,{userId:tracer.id,type:'start-pose',payload:{fix},now}),/Pose déjà commencée/);
 });
}
test('Conducteur remains unauthorized before accepting invitation',()=>{
 const s=create('normal');
 assert.throws(()=>projectRemoteSession(s,driver.id,now),/Session inaccessible/);
});
