import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCoachingQa,selectQaPerspective,nextQaAction} from '../src/coaching-qa.mjs';
import {preparationView,simulate,transition} from '../src/coaching-preparation.mjs';
import {sessionView,syncSession,advanceSessionSearch,archiveSession} from '../src/coaching-session-flow.mjs';
import {advanceTracer} from '../src/coaching-tracer.mjs';
import {debriefView} from '../src/coaching-session-flow.mjs';
import {CoachingQaPanel} from '../src/coaching-qa-screen.mjs';
import {BottomNavigation} from '../src/components.mjs';
import {resolveMockRoute} from '../src/mock-auth.mjs';

const user={name:'QA'};
const dogs=[{id:'nox',name:'Nox'}];
const make=(mode='normal')=>createCoachingQa(mode,user,dogs);

test('QA bootstraps a valid mock session using the normal draft/session/preparation pipeline',()=>{
 const qa=make();
 assert.equal(qa.search.phase,'PREPARATION');
 assert.equal(qa.preparation.phase,'created');
 assert.equal(qa.preparation.session.prototype,true);
 assert.equal(qa.preparation.session.traceType,'direct');
 assert.deepEqual(qa.preparation.session.roles.observers,['lea']);
 assert.deepEqual(qa.preparation.team.map(person=>person.activeFunction).sort(),['coach','driver','observer','traceur']);
});

test('view switching selects only an assigned participant and preserves the role assignments and phase',()=>{
 const qa=make(),roles=structuredClone(qa.preparation.session.roles);
 for(const role of ['traceur','driver','coach','observer']){
  const viewpoint=selectQaPerspective(qa.preparation,role);
  assert.equal(preparationView(viewpoint).role,role);
  assert.deepEqual(viewpoint.session.roles,roles);
  assert.equal(viewpoint.phase,'created');
 }
 assert.throws(()=>selectQaPerspective(qa.preparation,'unknown'));
});

test('QA action proxy offers only the real next control for the current function and shared phase',()=>{
 const qa=make();
 assert.equal(nextQaAction(qa.search,qa.preparation),null);
 assert.equal(nextQaAction(qa.search,simulate(qa.preparation,{viewerRole:'driver'})),null);
 assert.equal(nextQaAction(qa.search,selectQaPerspective(qa.preparation,'traceur')).id,'ready');
 const ready=transition(selectQaPerspective(qa.preparation,'traceur'),'ready');
 assert.equal(nextQaAction(qa.search,ready).id,'start-laying');
 let tracer=advanceTracer(qa.tracer,ready,'start');
 let search=syncSession(qa.search,ready,tracer);
 assert.equal(search.phase,'LAYING');
 assert.equal(nextQaAction(search,ready).id,'finish-laying');
 tracer=advanceTracer(tracer,ready,'finish'); search=syncSession(search,ready,tracer);
 assert.equal(search.phase,'TRACK_FINISHED');
 tracer=advanceTracer(tracer,ready,'in-place'); search=syncSession(search,ready,tracer);
 assert.equal(search.phase,'SEARCH_READY');
 assert.equal(nextQaAction(search,simulate(ready,{viewerRole:'driver'})).id,'start-search');
 let driver=simulate(ready,{viewerRole:'driver'});
 search=advanceSessionSearch(search,driver,'start');
 assert.equal(search.phase,'SEARCH_RUNNING');
 assert.equal(nextQaAction(search,driver).id,'finish-search');
 assert.equal(nextQaAction(search,driver,{confirmFinish:true}).id,'confirm-search');
 search=advanceSessionSearch(search,driver,'finish');
 assert.equal(search.phase,'DEBRIEF');
 assert.equal(search.events.at(-1).type,'DEBRIEF_ENTERED');
 assert.equal(nextQaAction(search,simulate(ready,{viewerRole:'coach'})).id,'archive');
 const archived=archiveSession(search,simulate(ready,{viewerRole:'coach'}));
 assert.equal(archived.phase,'ARCHIVED');
 assert.equal(nextQaAction(archived,simulate(ready,{viewerRole:'coach'})),null);
});

test('QA modes reuse the existing projections and preserve each visibility matrix',()=>{
 for(const mode of ['normal','simple_blind','full_blind']){
  const qa=make(mode),traceur=selectQaPerspective(qa.preparation,'traceur');
  assert.equal(preparationView(traceur).mode,mode);
  const ready=simulate(traceur,{phase:'ready',gps:'fresh'});
  let tracer=advanceTracer(qa.tracer,ready,'start');
  tracer=advanceTracer(tracer,ready,'progress');
  const laying=syncSession(qa.search,ready,tracer);
  for(const role of ['driver','coach','observer']){
   const p=selectQaPerspective(qa.preparation,role),v=sessionView(laying,p,tracer);
   if(mode==='full_blind'){
    assert.equal(v.laying,null);
    assert.equal(v.search,null);
    if(v.map){
     assert.equal(v.map.markers.some(marker=>marker.role==='traceur'),false);
     assert.equal(v.map.paths.some(path=>path.kind==='pose'),false);
    }else assert.ok(['coach','observer'].includes(role));
   }else if(mode==='simple_blind'&&role==='driver'){
    assert.equal(v.map.markers.some(marker=>marker.role==='traceur'),false);
    assert.equal(v.map.paths.some(path=>path.kind==='pose'),false);
   }else{
    assert.equal(v.map.markers.some(marker=>marker.role==='traceur'),true);
    assert.equal(v.map.paths.some(path=>path.kind==='pose'),true);
   }
  }
 }
});

test('debrief and archive views are produced by existing session flow projections',()=>{
 const qa=make('normal'),ready=transition(selectQaPerspective(qa.preparation,'traceur'),'ready');
 let tracer=advanceTracer(qa.tracer,ready,'start'),search=syncSession(qa.search,ready,tracer);
 tracer=advanceTracer(tracer,ready,'finish');search=syncSession(search,ready,tracer);
 tracer=advanceTracer(tracer,ready,'in-place');search=syncSession(search,ready,tracer);
 const driver=simulate(ready,{viewerRole:'driver'});
 search=advanceSessionSearch(search,driver,'start');search=advanceSessionSearch(search,driver,'finish');
 assert.equal(debriefView(search,driver,tracer).phase,'DEBRIEF');
 const archived=archiveSession(search,simulate(ready,{viewerRole:'coach'}));
 assert.equal(debriefView(archived,simulate(ready,{viewerRole:'observer'}),tracer).phase,'ARCHIVED');
});

test('QA route stays out of normal navigation, is mock-auth gated and exposes the real event journal',()=>{
 const qa=make(),html=CoachingQaPanel(qa.search,qa.preparation,qa.tracer);
 assert.equal(resolveMockRoute('/qa/coaching',{authenticated:false}),'/auth');
 assert.equal(resolveMockRoute('/qa/coaching',{authenticated:true}),'/qa/coaching');
 assert.doesNotMatch(BottomNavigation('/qa/coaching'),/qa\/coaching/i);
 for(const text of ['QA / DEV','data-qa-mode','data-qa-role','PREPARATION','Réinitialiser la session QA','Aucun événement'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/<option value="(?:traceur|driver|coach|observer)"/g)||[]).length,4);
});
