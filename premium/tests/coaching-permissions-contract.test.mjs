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

// P01: pure capability and the actual projections are tested separately.
test('P01 capability permits Coach poser to read reference in Double blind',()=>assert.equal(canSeeReference('full_blind','coach',true),true));
test('P01 capability refuses reference to Coach non-poser and blind Conducteur',()=>{
 assert.equal(canSeeReference('full_blind','coach',false),false);
 assert.equal(canSeeReference('full_blind','driver',true),false);
});
for(const projection of ['preparation','search','session'])test(`P01 ${projection} preserves Coach poser's reference after active-function switch`,()=>{
 const {p,t,s}=poser(true),coach=perspective(p,'coach');
 assert.equal(coach.viewerId,p.session.roles.traceur,'Same person remains the poser');
 const v=projection==='preparation'?preparationView(coach):projection==='search'?searchView(s,coach):sessionView(s,coach,t).map;
 assert.ok(v,'Coach poser must receive an authorized map projection');
 assert.ok(v.paths.some(path=>path.kind==='reference'),'Own reference must remain available');
 assert.deepEqual(projection==='preparation'?v.preparation:v.reference,p.session.preparation);
});
test('P01 non-poser Coach does not receive reference or a live map',()=>{
 const {p,t,s}=poser(false),q=perspective(p,'coach');
 assert.equal(preparationView(q).preparation,null);assert.equal(sessionView(s,q,t).map,null);
 assert.ok(!searchView(s,q).paths.some(path=>path.kind==='reference'));
});
test('P01 blind Conducteur never receives Coach poser reference',()=>{
 const {p,s}=poser(true),v=searchView(s,perspective(p,'driver'));
 assert.equal(v.reference,null);assert.equal(v.arrival,null);
 assert.ok(!v.paths.some(path=>['reference','pose'].includes(path.kind)));
 assert.ok(!v.markers.some(marker=>marker.role==='traceur'));
});
test('P01 projection reads preserve original poser identity and geometry',()=>{
 const fixture=poser(true),before=structuredClone(fixture);
 preparationView(perspective(fixture.p,'coach'));searchView(fixture.s,perspective(fixture.p,'coach'));sessionView(fixture.s,perspective(fixture.p,'coach'),fixture.t);
 assert.deepEqual(fixture,before);
});

// P02: commands run through the shared session flow, not a visual simulator.
for(const action of ['pause','resume'])test(`P02 designated Conducteur can ${action} without changing recording actor`,()=>{
 const p=state();let s=running(p);if(action==='resume')s=advanceSessionSearch(s,perspective(p,'driver'),'pause',{now:1000});
 const before=structuredClone({p,s}),next=advanceSessionSearch(s,perspective(p,'driver'),action,{now:2000});
 assert.equal(next.searchTrackingState,action==='pause'?'paused':'active');assert.equal(next.actorId,p.session.roles.driver);
 assert.equal(next.events.at(-1).source,'driver');assert.deepEqual({p,s},before);
});
for(const action of ['pause','resume'])test(`P02 participant Coach can ${action} while Conducteur remains recording actor`,()=>{
 const p=state();let s=running(p);if(action==='resume')s=advanceSessionSearch(s,perspective(p,'driver'),'pause',{now:1000});
 const next=advanceSessionSearch(s,perspective(p,'coach'),action,{now:2000});
 assert.equal(next.searchTrackingState,action==='pause'?'paused':'active');assert.equal(next.actorId,p.session.roles.driver);
 assert.equal(p.session.roles.driver,'self');
});
for(const action of ['pause','resume'])test(`P02 Observer cannot ${action} and rejected command preserves originals`,()=>{
 const p=state();let s=running(p);if(action==='resume')s=advanceSessionSearch(s,perspective(p,'driver'),'pause',{now:1000});
 const before=structuredClone({p,s});assert.throws(()=>advanceSessionSearch(s,perspective(p,'observer'),action));assert.deepEqual({p,s},before);
});
for(const role of ['driver','coach'])test(`P02 ${role} cannot resume a completed search`,()=>{
 const p=state(),s=advanceSessionSearch(running(p),perspective(p,'driver'),'finish',{now:3000});
 assert.throws(()=>advanceSessionSearch(s,perspective(p,role),'resume'));
});

// P03: no fake Observer send API is introduced.
test('P03 Observer capability allows only authorized reading and denies track editing',()=>{
 for(const mode of ['normal','simple_blind','full_blind']){
  const v=roleCapabilities(mode,'observer');assert.equal(v.readReference,mode!=='full_blind');
  for(const key of ['prepare','edit','manage','create'])assert.equal(v[key],false);
 }
});
for(const action of ['start','finish'])test(`P03 Observer cannot ${action} a search recording`,()=>{
 const p=state(),s=action==='start'?{...createSearch(),phase:'SEARCH_READY'}:running(p);
 assert.throws(()=>advanceSessionSearch(s,perspective(p,'observer'),action));
});
for(const action of ['start','finish'])test(`P03 Observer cannot ${action} a laying recording`,()=>{
 const p=state(),q=simulate(p,{viewerRole:'traceur',phase:'ready'}),t=action==='start'?createTracer():advanceTracer(createTracer(),q,'start');
 assert.throws(()=>advanceTracer(t,perspective(p,'observer'),action));
});
for(const mode of ['simple_blind','full_blind'])test(`P03 Observer receives only ${mode} authorized projections and no business controls`,()=>{
 const p=state(draft(mode)),s=running(p),q=perspective(p,'observer'),v=sessionView(s,q,createTracer());
 assert.equal(v.canAct,false);assert.ok(v.team.some(member=>member.id===p.session.roles.driver));
 if(mode==='full_blind'){assert.equal(v.map,null);assert.equal(preparationView(q).preparation,null);}
 const html=ObserverScreen(s,q,createTracer());assert.doesNotMatch(html,/data-search=|data-tracer=|data-prep-action=|data-prep-sim=/);
});

// P04: 'archive' is the existing closure command, not a invented new API.
for(const creator of ['driver','coach','traceur'])test(`P04 creator in ${creator} function can close without source mutation`,()=>{
 const p=state(draft('normal',creator)),s={...createSearch(),phase:'DEBRIEF'},before=structuredClone({p,s});
 assert.equal(archiveSession(s,perspective(p,creator)).phase,'ARCHIVED');assert.deepEqual({p,s},before);
});
test('P04 creator retains closure right when currently Observer',()=>{
 const p=state(setObservers(draft(),['self','lea','hugo'])),q=simulate(p,{viewerId:'self',viewerFunction:'observer'});
 assert.equal(q.viewerId,p.session.roles[p.session.creatorRole]);assert.equal(preparationView(q).role,'observer');
 assert.equal(archiveSession({...createSearch(),phase:'DEBRIEF'},q).phase,'ARCHIVED');
});
test('P04 non-creator Coach without explicit delegation is refused',()=>{
 const p=state();assert.notEqual(p.session.roles.coach,p.session.roles[p.session.creatorRole]);
 assert.throws(()=>archiveSession({...createSearch(),phase:'DEBRIEF'},perspective(p,'coach')));
});
for(const role of ['driver','traceur','observer'])test(`P04 non-creator ${role} has no closure right from role alone`,()=>{
 const p=state(draft('normal','coach'));assert.notEqual(perspective(p,role).viewerId,p.session.roles.coach);
 assert.throws(()=>archiveSession({...createSearch(),phase:'DEBRIEF'},perspective(p,role)));
});
test('P04 archived session rejects repeated closure and recording changes without extra effects',()=>{
 const p=state(),s=archiveSession({...createSearch(),phase:'DEBRIEF'},perspective(p,'driver')),before=structuredClone(s);
 assert.throws(()=>archiveSession(s,perspective(p,'driver')));
 for(const action of ['start','pause','resume','finish'])assert.throws(()=>advanceSessionSearch(s,perspective(p,'driver'),action));
 assert.deepEqual(s,before);
});

// P05: admitted configurations go through validateDraft/createSession.
test('P05 Normal Conducteur plus Traceur keeps one identity across pose and search',()=>{
 const p=state(assignRole(draft(),'traceur','self')),q=simulate(p,{viewerFunction:'traceur',phase:'ready'});
 const t=advanceTracer(createTracer(),q,'start');assert.equal(t.phase,'active');
 const driver=simulate(q,{viewerFunction:'driver'}),s=advanceSessionSearch({...createSearch(),phase:'SEARCH_READY'},driver,'start',{now:0});
 assert.equal(s.actorId,q.viewerId);assert.equal(driver.session.roles.traceur,s.actorId);
});
for(const mode of ['simple_blind','full_blind'])test(`P05 ${mode} refuses Conducteur plus Traceur identity overlap`,()=>{
 const d=assignRole(draft(mode),'traceur','self');assert.ok(validateDraft(d).some(error=>error.code==='driver_knows_trace'));assert.throws(()=>createSession(d));
});
test('P05 Normal Coach plus Conducteur has active-function commands, not automatic union',()=>{
 const p=state(assignRole(draft(),'coach','self')),driver=simulate(p,{viewerId:'self',viewerFunction:'driver'}),coach=simulate(driver,{viewerFunction:'coach'});
 assert.equal(advanceSessionSearch({...createSearch(),phase:'SEARCH_READY'},driver,'start',{now:0}).actorId,'self');
 assert.throws(()=>advanceSessionSearch({...createSearch(),phase:'SEARCH_READY'},coach,'start'));
});
test('P05 Simple blind refuses Conducteur plus Coach and Conducteur plus Observer',()=>{
 for(const d of [assignRole(draft('simple_blind'),'coach','self'),setObservers(draft('simple_blind'),['self','lea'])]){
  assert.ok(validateDraft(d).some(error=>['driver_coach_conflict','driver_observer_conflict'].includes(error.code)));assert.throws(()=>createSession(d));
 }
});
test('P05 Observer plus Coach in Double blind gains no spatial access by switching function',()=>{
 const p=state(setObservers(draft('full_blind'),['camille','lea','hugo']));
 for(const viewerFunction of ['coach','observer']){
  const q=simulate(p,{viewerId:'camille',viewerFunction}),v=preparationView(q);
  assert.equal(v.preparation,null);assert.equal(v.arrival,null);assert.deepEqual(v.paths,[]);
  assert.ok(!v.markers.some(marker=>marker.id===p.session.roles.traceur));
 }
});
test('P05 multiple participant identities cannot impersonate the designated Conducteur',()=>{
 const p=state(),s=running(p),before=structuredClone(p);
 assert.equal(new Set(p.team.map(person=>person.id)).size,p.team.length);
 for(const role of ['traceur','coach','observer']){
  const q=perspective(p,role);assert.notEqual(q.viewerId,s.actorId);
  assert.throws(()=>advanceSessionSearch({...createSearch(),phase:'SEARCH_READY'},q,'start'));
 }
 assert.deepEqual(p,before);
});
