import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,updateDraft,setTrackingScenario,createSession,trackingScenarios,validateDraft,goToStep} from '../src/coaching.mjs';
import {createPreparation,preparationView,simulate} from '../src/coaching-preparation.mjs';
import {createTracer,advanceTracer} from '../src/coaching-tracer.mjs';
import {createSearch,advanceSearch,searchView} from '../src/coaching-search.mjs';
import {syncSession,markExternalTraceurInPlace,returnSelfTraceToStart,advanceSessionSearch,debriefView} from '../src/coaching-session-flow.mjs';
import {CoachingScreen} from '../src/coaching-screen.mjs';
import {createCoachingQa,qaScenarioOptions} from '../src/coaching-qa.mjs';

const user={name:'Sébastien'};
const dogs=[{id:'nox',name:'Nox'}];
const draftFor=(scenario='connected_traceur',mode='normal')=>{
 let draft=updateDraft(createDraft(user,dogs),{mode,traceType:'direct'});
 return setTrackingScenario(draft,scenario);
};
const created=(scenario,mode='normal')=>createSession(draftFor(scenario,mode));

test('the four explicit laying scenarios have clear labels and mode availability',()=>{
 assert.deepEqual(trackingScenarios.map(s=>s.id),['connected_traceur','self_trace','external_traceur','external_driver_recorded']);
 assert.match(trackingScenarios.find(s=>s.id==='self_trace').title,/Je trace pour moi-même/);
 assert.deepEqual(trackingScenarios.filter(s=>s.normalOnly).map(s=>s.id),['self_trace','external_driver_recorded']);
});

test('self_trace is a Normal-only product flow with the same user as pose and search actor',()=>{
 const result=created('self_trace');
 assert.equal(validateDraft(result).length,0);
 assert.equal(result.session.scenario,'self_trace');
 assert.equal(result.session.scentActor,'self');
 assert.equal(result.session.layingRecorder,'self');
 assert.equal(result.session.searchActor,'self');
 assert.equal(result.session.roles.traceur,'self');
 assert.equal(result.session.roles.driver,'self');
 for(const mode of ['simple_blind','full_blind']){
  const draft=createDraft(user,dogs);
  assert.throws(()=>setTrackingScenario(updateDraft(draft,{mode,traceType:'direct'}),'self_trace'),/Normal/);
  assert.throws(()=>updateDraft(setTrackingScenario(updateDraft(createDraft(user,dogs),{mode:'normal',traceType:'direct'}),'self_trace'),{mode}),/Normal/);
 }
 const html=CoachingScreen(goToStep(draftFor('self_trace'),'scenario'));
 assert.match(html,/Pose puis relève avec le même téléphone/);
});

test('self_trace requires declaration, return to start, then two distinct mock paths in the debrief',()=>{
 const session=created('self_trace').session;
 let p=simulate(createPreparation(session),{gps:'fresh'});
 p=simulate(p,{phase:'ready'});
 p=simulate(p,{viewerFunction:'traceur'});
 let t=createTracer(),s=createSearch();
 t=advanceTracer(t,p,'start');s=syncSession(s,p,t);
 t=advanceTracer(t,p,'progress');s=syncSession(s,p,t);
 t=advanceTracer(t,p,'finish');s=syncSession(s,p,t);
 t=advanceTracer(t,p,'in-place');s=syncSession(s,p,t);
 assert.equal(s.phase,'LAYING_WAIT');
 assert.throws(()=>advanceSessionSearch(s,simulate(p,{viewerFunction:'driver'}),'start'));
 t=returnSelfTraceToStart(t,p);s=syncSession(s,p,t);
 assert.equal(s.phase,'SEARCH_READY');
 const driver=simulate(p,{viewerFunction:'driver'});
 s=advanceSessionSearch(s,driver,'start');s=advanceSearch(s,driver,'progress');
 s=advanceSessionSearch(s,driver,'finish');
 const v=debriefView(s,driver,t);
 assert.deepEqual(v.map.paths.filter(x=>['pose','search'].includes(x.kind)).map(x=>x.kind),['pose','search']);
 assert.equal(v.map.poseRecorder,'Conducteur · même personne');
});

test('external traceur without app has no marker or pose and declared readiness unlocks SEARCH_READY',()=>{
 const session=created('external_traceur','simple_blind').session;
 let p=simulate(createPreparation(session),{gps:'fresh'}),s=createSearch(),t=createTracer();
 assert.equal(p.traceurKind,'external');
 assert.equal(preparationView(p).markers.some(m=>m.role==='traceur'),false);
 assert.equal(searchView(s,p).paths.some(x=>x.kind==='pose'),false);
 p=markExternalTraceurInPlace(p);
 s=syncSession(s,p,t);
 assert.equal(s.phase,'SEARCH_READY');
 assert.deepEqual(s.events.map(e=>e.type),['TRACEUR_IN_POSITION','SEARCH_READY']);
 const driver=simulate(p,{viewerFunction:'driver'});
 s=advanceSessionSearch(s,driver,'start');s=advanceSearch(s,driver,'progress');
 s=advanceSessionSearch(s,driver,'finish');
 const v=debriefView(s,driver,t);
 assert.equal(v.map.paths.some(x=>x.kind==='pose'),false);
 assert.equal(v.map.poseUnavailable,true);
 assert.equal(v.map.paths.some(x=>x.kind==='search'),true);
 assert.match(v.map.poseStatus,/Tracé de pose indisponible/);
 assert.equal(v.map.externalTraceurPosition,null);
});

test('external no-app supports every mode without creating an external location',()=>{
 for(const mode of ['normal','simple_blind','full_blind']){
  const p=createPreparation(created('external_traceur',mode).session);
  const v=preparationView(p);
  assert.equal(v.markers.some(m=>m.role==='traceur'),false,mode);
  assert.equal(v.externalPosition,null,mode);
 }
});

test('external traceur with Conducteur recorder stores two separately labelled paths only in Normal',()=>{
 const session=created('external_driver_recorded').session;
 assert.equal(session.scentActor,'external');
 assert.equal(session.layingRecorder,'driver');
 assert.equal(session.searchActor,'driver');
 let p=simulate(createPreparation(session),{gps:'fresh'}),t=createTracer(),s=createSearch();
 assert.equal(preparationView(p).markers.some(m=>m.role==='traceur'),false);
 t=advanceTracer(t,p,'start');s=syncSession(s,p,t);
 t=advanceTracer(t,p,'progress');s=syncSession(s,p,t);
 t=advanceTracer(t,p,'finish');s=syncSession(s,p,t);
 t=advanceTracer(t,p,'in-place');s=syncSession(s,p,t);
 p=markExternalTraceurInPlace(p,t);s=syncSession(s,p,t);
 assert.equal(s.phase,'SEARCH_READY');
 const driver=simulate(p,{viewerFunction:'driver'});
 s=advanceSessionSearch(s,driver,'start');s=advanceSearch(s,driver,'progress');
 s=advanceSessionSearch(s,driver,'finish');
 const v=debriefView(s,driver,t);
 assert.deepEqual(v.map.paths.filter(x=>['pose','search'].includes(x.kind)).map(x=>x.kind),['pose','search']);
 assert.equal(v.map.poseRecorder,'Conducteur · appareil d’enregistrement');
 assert.equal(v.map.scentActor,'Traceur externe · sans application');
 assert.match(v.map.paths.find(x=>x.kind==='pose').label,/enregistrée par le Conducteur/);
 for(const mode of ['simple_blind','full_blind'])assert.throws(()=>setTrackingScenario(updateDraft(createDraft(user,dogs),{mode,traceType:'direct'}),'external_driver_recorded'),/Normal/);
});

test('the five requested rapid QA presets exist and remain local mock sessions',()=>{
 assert.deepEqual(qaScenarioOptions.map(s=>`${s.scenario}:${s.mode}`),[
  'self_trace:normal','external_traceur:normal','external_traceur:simple_blind','external_traceur:full_blind','external_driver_recorded:normal'
 ]);
 for(const option of qaScenarioOptions){
  const qa=createCoachingQa(option.mode,user,dogs,option.scenario);
  assert.equal(qa.preparation.session.scenario,option.scenario);
  assert.equal(qa.search.phase,'PREPARATION');
 }
});
