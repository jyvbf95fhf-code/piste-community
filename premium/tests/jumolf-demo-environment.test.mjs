import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJumolfDemoEnvironment} from '../src/jumolf-demo-environment.mjs';
import {buildRealJumolfLearning,buildJumolfDemoLearning} from '../src/jumolf-real-learning.mjs';
import {buildRealJumolfProfile,buildJumolfDemoProfile} from '../src/jumolf-real-science.mjs';
import {JumolfDemoHistoryScreen} from '../src/jumolf-demo-history-screen.mjs';
const consents={gps:true,weather:true,dog_history:true,ai_analysis:true,session_comparison:true};
test('isolated demo calculates a dated varied history with unknown values and evidence-linked Lot A/B outputs',()=>{
 const d=buildJumolfDemoEnvironment();
 assert.equal(d.sessions.length,40);assert.equal(new Set(d.sessions.map(s=>s.id)).size,40);
 assert.ok(d.sessions.every(s=>s.dataOrigin==='demo'&&s.demo&&s.synthetic&&s.dogId===d.dog.id));
 assert.equal(new Set(d.sessions.map(s=>s.startedAt)).size,40);
 assert.ok(new Set(d.sessions.map(s=>s.terrain)).size>=3);
 assert.ok(new Set(d.sessions.map(s=>s.trackAge?.seconds)).size>=3);
 assert.ok(new Set(d.sessions.map(s=>s.mode)).size>=3);
 assert.equal(d.learning.history.length,40);
 assert.ok(d.learning.profile.trends.length>=6);
 assert.ok(d.learning.progress.comparable.length>0);
 assert.ok(d.learning.progress.incomparable.length>0);
 assert.ok(d.learning.recommendations.length>=4);
 assert.ok(d.learning.recommendations.every(r=>r.dataOrigin==='demo'&&r.synthetic&&r.evidence.length));
 const missing=d.learning.history.filter(s=>s.metrics.ruptures.value===null);
 assert.ok(missing.length>0);assert.ok(d.learning.history.some(s=>s.metrics.ruptures.value===0));
 assert.ok(d.learning.history.some(s=>s.metrics.reference_point_mean_m.value===null));
 const ids=new Set(d.sessions.map(s=>s.id));
 assert.ok(d.learning.recommendations.every(r=>r.evidence.every(e=>ids.has(e.sessionId))));
 const first=d.sessions.find(s=>s.metrics?.distanceM>0),analysis=d.learning.history.find(h=>h.id===first.id);
 assert.equal(analysis.metrics.traveled_distance_m.value,first.metrics.distanceM);
 assert.equal(analysis.metrics.ruptures.value,first.events.filter(e=>e.type==='Rupture').length);
 const fresh=buildJumolfDemoEnvironment();d.sessions[0].title='mutated';assert.notEqual(fresh.sessions[0].title,'mutated');
});
test('demo and real Lot A/B paths reject cross-origin or arbitrary identifiers',()=>{
 const d=buildJumolfDemoEnvironment(),bad={...d.sessions[0],id:'arbitrary',dataOrigin:'account',synthetic:false,demo:false};
 assert.equal(buildRealJumolfLearning(d.dog.id,d.sessions,{consents}).history.length,0);
 assert.equal(buildRealJumolfProfile(d.dog.id,d.sessions,{consents}).sessionCount,0);
 assert.equal(buildJumolfDemoLearning(d.dog.id,[bad],{consents}).history.length,0);
 assert.equal(buildJumolfDemoProfile(d.dog.id,[{...d.sessions[0],id:'arbitrary'}],{consents}).sessionCount,0);
 for(const patch of [{id:'arbitrary'},{synthetic:false},{demo:false},{dataOrigin:'account'},{status:'SEARCH'},{dogId:'different',dog:{id:'different'}}]){
  const source={...d.sessions[0],...patch};
  assert.equal(buildJumolfDemoLearning(d.dog.id,[source],{consents}).history.length,0);
  assert.equal(buildJumolfDemoProfile(d.dog.id,[source],{consents}).sessionCount,0);
 }
});
test('demo screen exposes computed charts, source details and suggested exercises without write actions',()=>{
 const html=JumolfDemoHistoryScreen('/jumolf/demo-history?metric=ruptures&session=3');
 assert.match(html,/DÉMONSTRATION/);assert.match(html,/40/);assert.match(html,/data-demo-history-chart/);
 assert.match(html,/Naya/);assert.match(html,/Rupture/);assert.match(html,/Données manquantes/);
 assert.match(html,/data-demo-session-detail/);assert.match(html,/Exercices suggérés/);
 assert.doesNotMatch(html,/data-jumolf-action|data-coaching|localStorage|supabase|<form/);
});

test('demo computations require no account, browser storage or network access and fallback suggestions remain fictional',()=>{
 const priorFetch=globalThis.fetch;
 globalThis.fetch=()=>{throw Error('Unexpected network call');};
 try{
  const d=buildJumolfDemoEnvironment();
  const fallback=buildJumolfDemoLearning(d.dog.id,[],{consents,skill:'continuity'});
  assert.ok(fallback.recommendations.every(r=>r.synthetic===true&&r.dataOrigin==='demo'));
  assert.equal(d.learning.longitudinal.storage,'demo-memory');
  assert.doesNotMatch(d.learning.reason,/réelles|autorisées/);
 }finally{globalThis.fetch=priorFetch;}
});
