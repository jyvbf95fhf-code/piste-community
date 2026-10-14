import {test} from 'node:test';import assert from 'node:assert/strict';
import {createDraft,updateDraft,selectPreparation,createSession,setObservers} from '../src/coaching.mjs';
import {createPreparation,simulate,preparationView,referenceStart,transition} from '../src/coaching-preparation.mjs';
import {createTracer,advanceTracer} from '../src/coaching-tracer.mjs';
import {canUseTracerGps} from '../src/coaching-gps-controller.mjs';
const api=await import('../src/coaching-geographic-reference.mjs').catch(()=>({}));
const points=[{id:'d',x:7.12345,y:48.12345,space:'wgs84',kind:'start',incomingMode:null},{id:'a',x:7.23456,y:48.23456,space:'wgs84',kind:'arrival',incomingMode:'free'}];
function state(){let d=updateDraft(createDraft({user_id:'u',name:'Sébastien'},[{id:'nox',name:'Nox'}]),{mode:'normal',traceType:'prepared'});d=selectPreparation(d,{id:'r',name:'Référence réelle',source:'draw',ownerId:'self',start:{latitude:48.12345,longitude:7.12345,space:'wgs84'},geometry:{points}});d=setObservers(d,['lea']);d=createSession(d);return {d,p:createPreparation(d.session)};}
test('real geographic reference has a known departure and follows the existing approach sequence',()=>{
 const {p}=state();assert.deepEqual(referenceStart(p.session),{latitude:48.12345,longitude:7.12345,space:'wgs84'});
 let s=simulate(p,{viewerRole:'traceur'}),t=createTracer();s=transition(s,'approach');t=advanceTracer(t,s,'approach');assert.equal(t.phase,'approaching');assert.equal(t.distance,0);assert.equal(t.seconds,0);assert.deepEqual(t.segments,[]);
});
test('reference adapter keeps geographic geometry, breaks and prepared provenance',()=>{
 assert.equal(typeof api.preparedReferenceGeometry,'function');const {p}=state(),r=api.preparedReferenceGeometry(p.session.preparation.geometry.points);assert.equal(r.provenance,'prepared-geographic');assert.equal(r.segments[0][0].longitude,7.12345);assert.equal(r.segments[0][0].timestamp,undefined);
});
test('visibility keeps the prepared route hidden while allowing the logistics departure for the driver',()=>{
 const {p}=state();for(const mode of ['normal','simple_blind','full_blind'])for(const role of ['traceur','driver','coach','observer']){const v=preparationView(simulate({...p,session:{...p.session,mode}},{viewerRole:role})),full=mode==='normal'||role==='traceur'||mode==='simple_blind'&&role!=='driver';assert.equal(JSON.stringify(v.geographicRoute).includes('7.23456'),full);if(role==='driver')assert.equal(v.geographicRoute[0].x,7.12345);}
});

import {createGpsPose,appendGpsFix,validGpsTracer} from '../src/coaching-gps-model.mjs';
import {TracerScreen} from '../src/coaching-tracer-screen.mjs';
import {visiblePreparedReference} from '../src/coaching-driver-gps-model.mjs';
import {gpxReferenceChoices} from '../src/track-library.mjs';
test('approach fixes never become recorded laying points; ready starts a separate real pose',()=>{
 let {p}=state();p=transition(simulate(p,{viewerRole:'traceur'}),'approach');let t=advanceTracer(createTracer(),p,'approach');t.gpsPose=createGpsPose(p.session.id,p.viewerId);
 t.gpsPose=appendGpsFix(t.gpsPose,{timestamp:1000,coords:{latitude:48,longitude:7,accuracy:5}},1000);
 assert.deepEqual(t.gpsPose.segments,[]);assert.equal(t.gpsPose.elapsedMs,0);
 t=advanceTracer(t,p,'arrive');p=simulate(p,{phase:'arrived'});p=transition(p,'ready');t=advanceTracer(t,p,'ready');assert.equal(validGpsTracer(t,p,'PREPARATION'),true);
 t=advanceTracer(t,p,'start',{now:()=>2000});assert.equal(t.gpsPose.startedAt,2000);assert.deepEqual(t.gpsPose.segments,[]);
});
test('real reference cockpit exposes GPS activation and explicit approach without simulated commands',()=>{
 let {p}=state();p=transition(simulate(p,{viewerRole:'traceur'}),'approach');const t=advanceTracer(createTracer(),p,'approach');const html=TracerScreen(t,p,{allowGps:true,gps:{}});
 assert.match(html,/Rejoindre le départ/);assert.match(html,/data-tracer="gps-enable"/);assert.match(html,/data-tracer="arrive"/);assert.doesNotMatch(html,/data-tracer="start"|data-tracer="progress"|180 m/);assert.match(html,/prepared-geographic/);
 assert.throws(()=>advanceTracer(createTracer(),simulate(p,{phase:'ready'}),'start'),/Activez le GPS/);
});
test('driver receives a departure-only planned overlay in blind modes',()=>{
 const {p}=state();const blind=simulate(p,{mode:'full_blind',viewerRole:'driver'}),r=visiblePreparedReference(blind);assert.equal(r.phase,'before');assert.equal(r.segments.flat().length,1);assert.doesNotMatch(JSON.stringify(r),/7.23456/);
});
test('GPX reference choices include actual imported tracks',()=>{const imported={id:'real',source:'gpx',name:'Imported'};assert.ok(gpxReferenceChoices([imported,{id:'draw',source:'draw'}]).some(t=>t.id==='real'));});
