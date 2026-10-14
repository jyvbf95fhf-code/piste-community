import {test} from 'node:test';import assert from 'node:assert/strict';
import {fixture} from './coaching-exit-fixtures.mjs';
import {canUseTracerGps,createTracerGpsController} from '../src/coaching-gps-controller.mjs';
import {canUseDriverGps} from '../src/coaching-driver-gps-controller.mjs';
import {advanceTracer} from '../src/coaching-tracer.mjs';
import {TracerScreen} from '../src/coaching-tracer-screen.mjs';
import {syncSession,markExternalTraceurInPlace,debriefView} from '../src/coaching-session-flow.mjs';
const at=Date.parse('2026-10-14T10:00:00Z');
function context(){const r=fixture({role:'driver',scenario:'external_driver_recorded'});return {draft:r.draft,preparation:r.preparationState,tracer:r.tracerState,search:r.searchState,user:{user_id:'owner'},qa:false};}
test('external pose GPS requires the local designated driver, normal mode and recorded scenario',()=>{
 const c=context();assert.equal(canUseTracerGps(c),true);
 for(const changed of [{qa:true},{user:{user_id:'other'}},{preparation:{...c.preparation,viewerId:'other'}},{preparation:{...c.preparation,productScenario:'external_traceur'}},{search:{...c.search,phase:'SEARCH_RUNNING'}}])assert.equal(canUseTracerGps({...c,...changed}),false);
 for(const mode of ['simple_blind','full_blind'])assert.equal(canUseTracerGps({...c,preparation:{...c.preparation,session:{...c.preparation.session,mode}}}),false);
});
test('driver records real pose fixes, finishes, declares external ready and enters research with its pose preserved',()=>{
 const c=context();let fix,cleared=0,now=at;
 const controller=createTracerGpsController({getContext:()=>c,setTracer:t=>c.tracer=t,clock:()=>now,navigator:{geolocation:{watchPosition:fn=>{fix=fn;return 1;},clearWatch:()=>cleared++}},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}}});
 try{
  controller.activate();assert.equal(c.tracer.gpsPose.actorId,c.preparation.viewerId);
  assert.match(TracerScreen(c.tracer,c.preparation,{allowGps:true}),/data-tracer="start"[^>]*>/);
  c.tracer=advanceTracer(c.tracer,c.preparation,'start',{now:()=>now});c.search=syncSession(c.search,c.preparation,c.tracer,{now:()=>now});
  fix({timestamp:now,coords:{latitude:48.1,longitude:7,accuracy:5}});now+=5000;fix({timestamp:now,coords:{latitude:48.101,longitude:7,accuracy:5}});
  assert.ok(c.tracer.gpsPose.distanceM>100);assert.equal(c.tracer.segments.length,0);assert.throws(()=>advanceTracer(c.tracer,c.preparation,'progress'));
  now+=5000;c.tracer=advanceTracer(c.tracer,c.preparation,'finish',{now:()=>now});controller.reconcile();assert.ok(cleared>0);
  c.search=syncSession(c.search,c.preparation,c.tracer,{now:()=>now});assert.ok(c.search.track_finished_at);
  c.tracer=advanceTracer(c.tracer,c.preparation,'in-place');
  assert.match(TracerScreen(c.tracer,c.preparation,{allowGps:true}),/data-tracer="external-ready"/);
  c.preparation=markExternalTraceurInPlace(c.preparation,c.tracer);c.search=syncSession(c.search,c.preparation,c.tracer);
  assert.equal(c.search.phase,'SEARCH_READY');assert.equal(canUseDriverGps(c),true);
  const v=debriefView({...c.search,phase:'DEBRIEF'},c.preparation,c.tracer);
  assert.equal(v.summary.layingProvenance,'gps');assert.equal(v.summary.layingSeconds,10);assert.equal(v.map.gpsPose.actorId,c.preparation.viewerId);assert.match(v.map.poseRecorder,/Conducteur/);assert.equal(v.map.externalTraceurPosition,null);
 }finally{controller.destroy();}
});
