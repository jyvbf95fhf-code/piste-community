import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoachingQa} from '../src/coaching-qa.mjs';
import {projectCoachingLiveForObserver} from '../src/coaching-live-projection.mjs';

for(const mode of ['normal','simple_blind','full_blind'])test(`Live Observer projection preserves ${mode} visibility and is read-only`,()=>{
 const qa=createCoachingQa(mode,{name:'Owner'},[{id:'nox',name:'Nox'}]);
 qa.preparation.session.privateSentinel='private-session-field';
 qa.tracer.secretSentinel='private-tracer-field';
 qa.tracer.segments=[[{x:10,y:20},{x:30,y:40,secret:'private-position-field'}]];
 const view=projectCoachingLiveForObserver({session:qa.preparation.session,searchState:qa.search,preparationState:qa.preparation,tracerState:qa.tracer,viewerId:'alex-live'});
 assert.equal(view.role,'observer');
 assert.equal(view.readOnly,true);
 assert.equal(view.canAct,false);
 assert.equal(view.sessionId,qa.preparation.session.id);
 assert.equal(JSON.stringify(view).includes('private-session-field'),false);
 assert.equal(JSON.stringify(view).includes('private-tracer-field'),false);
 assert.equal(JSON.stringify(view).includes('private-position-field'),false);
 if(mode==='full_blind'){
  assert.equal(view.map,null);
  assert.equal(JSON.stringify(view).includes('Alex'),false);
 }
});

test('Coaching projection rejects mismatched or unavailable session context',()=>{
 const qa=createCoachingQa('normal',{name:'Owner'},[{id:'nox',name:'Nox'}]);
 assert.equal(projectCoachingLiveForObserver({session:{id:'other'},searchState:qa.search,preparationState:qa.preparation,tracerState:qa.tracer,viewerId:'alex'}),null);
 assert.equal(projectCoachingLiveForObserver({session:null,searchState:qa.search,preparationState:null,tracerState:qa.tracer,viewerId:'alex'}),null);
});
