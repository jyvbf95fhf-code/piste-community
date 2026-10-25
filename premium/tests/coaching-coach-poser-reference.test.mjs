import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,updateDraft,assignRole,selectCreatorRole,setObservers,selectPreparation,createSession,validateDraft,canSeeReference,roleCapabilities} from '../src/coaching.mjs';
import {createPreparation,simulate,preparationView} from '../src/coaching-preparation.mjs';
import {createSearch,searchView} from '../src/coaching-search.mjs';
import {advanceSessionSearch,sessionView,archiveSession} from '../src/coaching-session-flow.mjs';
import {createTracer,advanceTracer} from '../src/coaching-tracer.mjs';
import {ObserverScreen} from '../src/coaching-session-screen.mjs';

// Only actual model APIs are exercised. Coordinates are local drawing fixtures, not GPS.
// P03 gap: replyMock has no sender/participant argument and always labels the sender
// Traceur; it cannot honestly exercise an Observer's collective-message permission.
// P04 gap: no delegation field/command exists. No invented delegation is supplied.
// Command-author identity is not represented: existing events store role source only.
const selectedStart={x:41,y:137,space:'mock-map'};
function draft(mode='normal',creator='driver'){
 return setObservers(selectCreatorRole(updateDraft(createDraft({name:'Creator contract'},[{id:'contract-dog',name:'Contract dog'}]),{mode,traceType:'direct'}),creator),['lea','hugo']);
}
function state(d=draft()){
 assert.deepEqual(validateDraft(d),[],'Fixture must be a configuration admitted by the actual model');
 const p=simulate(createPreparation(createSession(d).session),{gps:'fresh',layers:true});
 for(const [i,person] of p.team.entries())p.points[person.id]={x:53+i*37,y:79+i*23};
 return p;
}
const perspective=(p,role)=>simulate(p,{viewerRole:role,gps:'fresh'});
function running(p){return advanceSessionSearch({...createSearch(),phase:'SEARCH_READY'},perspective(p,'driver'),'start',{now:0});}
function poser(coachLays){
 let d=selectCreatorRole(updateDraft(createDraft({name:'Poser contract'},[{id:'dog',name:'Dog'}]),{mode:'full_blind',traceType:'prepared'}),'traceur');
 if(coachLays)d=assignRole(d,'coach','self');
 d=setObservers(d,['lea','hugo']);
 d=selectPreparation(d,{id:'protected-contract-reference',name:'Protected reference',source:'mock',ownerId:'self',start:selectedStart});
 const p=state(d),tracer=simulate(p,{viewerRole:'traceur',phase:'ready'});
 let t=advanceTracer(createTracer(),tracer,'start');t=advanceTracer(t,tracer,'progress');
 return {p,t,s:{...createSearch(),phase:'LAYING',layingSegments:structuredClone(t.segments)}};
}


for(const projection of ['preparation','search','session'])test(`Coach poser receives only own reference in ${projection}`,()=>{
 const {p,t,s}=poser(true),q=perspective(p,'coach'),v=projection==='preparation'?preparationView(q):projection==='search'?searchView(s,q):sessionView(s,q,t).map;
 assert.ok(v);assert.ok(v.paths.some(x=>x.kind==='reference'));assert.ok(v.paths.every(x=>x.kind==='reference'));assert.ok(v.markers.every(x=>x.id===q.viewerId));assert.equal(v.arrival,null);
 if(projection==='preparation')assert.deepEqual(v.actions,[]);else assert.equal(v.reference.id,p.session.preparation.id);
});
test('Coach poser receives no recording metrics or command rights',()=>{const {p,t,s}=poser(true),q=perspective(p,'coach'),v=sessionView(s,q,t);assert.ok(v.map);assert.equal(v.laying,null);assert.equal(v.search,null);assert.equal(v.canAct,false);assert.equal(v.map.seconds,null);assert.equal(v.map.distance,null);assert.equal(v.map.action,null);});
for(const role of ['driver','observer'])test(`switch to ${role} does not retain Coach poser reference`,()=>{const {p,t,s}=poser(true);let q;if(role==='observer'){const copy=structuredClone(p);copy.team.find(x=>x.id===copy.session.roles.traceur).functions.push('observer');q=simulate(copy,{viewerId:copy.session.roles.traceur,viewerFunction:'observer'});}else q=perspective(p,'driver');assert.equal(preparationView(q).preparation,null);assert.equal(searchView(s,q).reference,null);if(role==='observer')assert.equal(sessionView(s,q,t).map,null);});
test('external simulated Traceur does not gain Coach poser exception',()=>{const {p,s}=poser(true),q=simulate(perspective(p,'coach'),{traceurKind:'external'});assert.equal(preparationView(q).preparation,null);assert.equal(searchView(s,q).reference,null);});
test('identity with Conducteur function retains blind restriction even acting as Coach',()=>{const {p,s}=poser(true);const q=perspective(p,'coach');q.team.find(x=>x.id===q.viewerId).functions.push('driver');assert.equal(preparationView(q).preparation,null);assert.equal(searchView(s,q).reference,null);});
test('no reference means no new map exception for blind Coach poser',()=>{const {p,t,s}=poser(true),q=perspective(p,'coach');q.session.preparation=null;q.session.traceType='direct';assert.equal(sessionView(s,q,t).map,null);});
test('GPX reference remains readable without other spatial data',()=>{const {p,t,s}=poser(true),q=perspective(p,'coach');q.session.traceType='gpx';q.session.preparation={...q.session.preparation,source:'gpx',fileName:'own-reference.gpx'};const v=sessionView(s,q,t);assert.equal(v.map.reference.fileName,'own-reference.gpx');assert.ok(v.map.paths.every(x=>x.kind==='reference'));});
test('Coach screen preserves own reference permissions without plotting mock drawing geometry',async()=>{const {CoachScreen}=await import('../src/coaching-session-screen.mjs');const {p,t,s}=poser(true),q=perspective(p,'coach');const html=CoachScreen(s,q,t,{});assert.match(html,/data-real-map-reader/);assert.match(html,/Fond de carte de contexte uniquement/);assert.doesNotMatch(html,/data-map-path=|protected-contract-reference|41[, ]137/);assert.ok(sessionView(s,q,t).map.paths.some(path=>path.kind==='reference'));assert.doesNotMatch(html,/data-map-path="(?:pose|search|releve)"|data-search="(?:start|pause|resume|finish)"/);});
