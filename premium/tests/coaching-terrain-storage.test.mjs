import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as coaching from '../src/coaching.mjs';
import * as preparation from '../src/coaching-preparation.mjs';
import * as tracer from '../src/coaching-tracer.mjs';
import * as search from '../src/coaching-search.mjs';
import {syncSession,advanceSessionSearch,markExternalTraceurInPlace,returnSelfTraceToStart} from '../src/coaching-session-flow.mjs';
import * as storageModule from '../src/coaching-preparation-storage.mjs';
import {CoachingScreen} from '../src/coaching-screen.mjs';
import {createReferenceAssignmentState,applyReferenceAssignmentAction,getReferenceAssignment} from '../src/coaching-reference-assignment.mjs';
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
let sequence=0;
function snapshot(mode='normal',scenario='connected_traceur'){
 let draft=coaching.updateDraft(coaching.createDraft({user_id:'owner',name:'Owner'},[{id:'nox',name:'Nox'}]),{mode,traceType:'direct'});
 draft=coaching.setTrackingScenario(draft,scenario);
 draft=coaching.createSession(draft,{actionId:`terrain-${++sequence}`,type:'session-creation',author:{userId:'owner',participantId:'self',source:'mock-auth',assurance:'local-simulation'},occurredAt:'2026-10-12T16:00:00.000Z',origin:'simulation:test',sessionId:null,referenceId:null,beneficiaryParticipantId:null});
 const p=preparation.simulate(preparation.createPreparation(draft.session),{gps:'fresh',...(['connected_traceur','self_trace'].includes(scenario)?{viewerRole:'traceur'}:{})});
 return {draft,preparationState:p,tracerState:tracer.createTracer(),searchState:search.createSearch(),referenceAssignment:null,terrainOpen:false,searchLocked:false};
}
function terrain(phase='LAYING',mode='normal',scenario='connected_traceur',{declareExternal=true}={}){
 const r=snapshot(mode,scenario);let p=r.preparationState,t=r.tracerState,s=r.searchState;
 if(scenario!=='external_traceur'){
  if(scenario!=='external_driver_recorded')p=preparation.transition(p,'ready');
  t=tracer.advanceTracer(t,p,'start');t=tracer.advanceTracer(t,p,'progress');s=syncSession(s,p,t,{now:()=>Date.parse('2026-10-12T16:01:00.000Z')});
  if(phase!=='LAYING'){t=tracer.advanceTracer(t,p,'finish');s=syncSession(s,p,t,{now:()=>Date.parse('2026-10-12T16:02:00.000Z')});}
  if(!['LAYING','TRACK_FINISHED'].includes(phase)){
   t=tracer.advanceTracer(t,p,'in-place');s=syncSession(s,p,t);
   if(scenario==='self_trace'&&phase!=='LAYING_WAIT'){t=returnSelfTraceToStart(t,p);p=preparation.simulate(p,{viewerFunction:'driver'});s=syncSession(s,p,t);}
  }
 }
 if(declareExternal&&scenario.startsWith('external')&&phase!=='LAYING'){p=markExternalTraceurInPlace(p,t);s=syncSession(s,p,t);}
 if(['SEARCH_RUNNING','PAUSED','DEBRIEF','ARCHIVED'].includes(phase)){
  p=preparation.simulate(p,{viewerRole:'driver'});s=advanceSessionSearch(s,p,'start',{now:()=>Date.parse('2026-10-12T16:05:00.000Z')});s=advanceSessionSearch(s,p,'progress');
  if(phase==='PAUSED')s=advanceSessionSearch(s,p,'pause',{now:()=>Date.parse('2026-10-12T16:06:00.000Z')});
  if(['DEBRIEF','ARCHIVED'].includes(phase)){s=advanceSessionSearch(s,p,'finish');if(phase==='ARCHIVED')s.phase='ARCHIVED';}
 }
 return {...r,preparationState:p,tracerState:t,searchState:s,terrainOpen:['LAYING','TRACK_FINISHED','LAYING_WAIT'].includes(phase)};
}
function api(disk){assert.equal(typeof storageModule.createCoachingSessionStorage,'function','terrain recovery is not implemented');return storageModule.createCoachingSessionStorage(disk);}
function reload(record){const disk=memory(),a=api(disk);a.load('owner');assert.equal(a.save('owner',record).ok,true);const loaded=api(disk).load('owner');assert.equal(loaded.ok,true);return loaded.snapshot;}
for(const mode of ['normal','simple_blind','full_blind'])for(const phase of ['LAYING','TRACK_FINISHED','SEARCH_READY','SEARCH_RUNNING','PAUSED'])test(`reload preserves ${phase} in ${mode}`,()=>{
 const r=terrain(phase,mode),loaded=reload(r);
 assert.equal(loaded.draft.session.id,r.draft.session.id);assert.deepEqual(loaded.draft.session.roles,r.draft.session.roles);assert.equal(loaded.searchState.phase,r.searchState.phase);assert.equal(loaded.tracerState.phase,r.tracerState.phase);
 for(const name of ['searchState','tracerState'])for(const field of ['seconds','distance','cursor','segments'])assert.deepEqual(loaded[name][field],r[name][field]);
 assert.deepEqual(loaded.searchState.events,r.searchState.events);assert.deepEqual(loaded.searchState.searchPauseIntervals,r.searchState.searchPauseIntervals);assert.equal(loaded.searchState.searchTrackingState,r.searchState.searchTrackingState);assert.equal(loaded.preparationState.gps,'acquiring');
 assert.deepEqual(search.searchView(loaded.searchState,loaded.preparationState).reference,search.searchView(r.searchState,r.preparationState).reference);
});
for(const scenario of ['self_trace','external_traceur','external_driver_recorded'])for(const phase of ['SEARCH_READY','SEARCH_RUNNING','PAUSED'])test(`reload preserves ${scenario}/${phase}`,()=>{const r=terrain(phase,'normal',scenario),loaded=reload(r);assert.equal(loaded.searchState.phase,r.searchState.phase);assert.deepEqual(loaded.searchState.layingSegments,r.searchState.layingSegments);assert.equal(loaded.preparationState.productScenario,scenario);});
test('self trace waiting for return remains waiting after reload',()=>{const r=terrain('LAYING_WAIT','normal','self_trace'),loaded=reload(r);assert.equal(loaded.searchState.phase,'LAYING_WAIT');assert.equal(loaded.tracerState.returnedToStart,undefined);});
test('pose resumes with a separate segment and no added distance across reload',()=>{const r=terrain(),loaded=reload(r);assert.equal(loaded.tracerState.gap,true);const p=preparation.simulate(loaded.preparationState,{gps:'fresh'}),next=tracer.advanceTracer(loaded.tracerState,p,'progress');assert.equal(next.segments.length,r.tracerState.segments.length+1);assert.deepEqual(next.segments[0],r.tracerState.segments[0]);assert.equal(next.distance,r.tracerState.distance);});
test('search resumes with a separate segment and no bridge across reload',()=>{const r=terrain('SEARCH_RUNNING'),loaded=reload(r);assert.equal(loaded.searchState.gap,true);const p=preparation.simulate(loaded.preparationState,{gps:'fresh'}),next=advanceSessionSearch(loaded.searchState,p,'progress');assert.equal(next.segments.length,r.searchState.segments.length+1);assert.deepEqual(next.segments[0],r.searchState.segments[0]);assert.equal(next.distance,r.searchState.distance);});
test('pause and active counters survive reload without automatic resume',()=>{const r=terrain('PAUSED');r.searchLocked=true;const loaded=reload(r);assert.equal(loaded.searchLocked,true);assert.equal(loaded.searchState.searchPausedAt,r.searchState.searchPausedAt);assert.equal(loaded.searchState.searchTotalPausedMs,r.searchState.searchTotalPausedMs);assert.throws(()=>advanceSessionSearch(loaded.searchState,loaded.preparationState,'progress'),/pause/);const resumed=advanceSessionSearch(loaded.searchState,loaded.preparationState,'resume',{now:()=>Date.parse('2026-10-12T16:08:00.000Z')});assert.equal(resumed.searchTotalPausedMs,120000);assert.equal(resumed.seconds,r.searchState.seconds);});
test('existing interruptions and pause segments stay separate across several reloads',()=>{const r=terrain('PAUSED');r.searchState=advanceSessionSearch(r.searchState,r.preparationState,'record-pause');const loaded=reload(r),second=reload(loaded);assert.deepEqual(second.searchState.segments,r.searchState.segments);assert.deepEqual(second.searchState.segmentTrackingStates,r.searchState.segmentTrackingStates);assert.deepEqual(second.searchState.searchPauseIntervals,r.searchState.searchPauseIntervals);});
test('terminal history cannot be saved as an active terrain snapshot',()=>{const a=api(memory());a.load('owner');for(const phase of ['DEBRIEF','ARCHIVED'])assert.equal(a.save('owner',terrain(phase)).ok,false);});
test('stale tab cannot overwrite or remove newer terrain',()=>{const disk=memory(),a=api(disk),b=api(disk);a.load('owner');b.load('owner');const r=terrain();assert.equal(a.save('owner',r).ok,true);assert.deepEqual(b.save('owner',terrain('SEARCH_RUNNING')),{ok:false,reason:'conflict'});assert.deepEqual(b.clear('owner'),{ok:false,reason:'conflict'});assert.equal(api(disk).load('owner').snapshot.draft.session.id,r.draft.session.id);});
test('foreign owner, impossible phase, non-finite points and counter corruption are refused',()=>{const a=api(memory());a.load('owner');assert.equal(a.save('other',terrain()).ok,false);for(const alter of [r=>r.searchState.phase='SEARCH_RUNNING',r=>r.tracerState.segments[0][0].x=Infinity,r=>r.searchState.seconds=-1,r=>r.searchState.simulatedPhase=true,r=>r.preparationState.team[0].functions.push('traceur')]){const r=terrain();alter(r);assert.equal(a.save('owner',r).ok,false);}});
test('prepared snapshot saved by the previous version is still recovered',()=>{const disk=memory(),legacy=storageModule.createCoachingPreparationStorage(disk),r=snapshot();delete r.searchLocked;r.preparationState=preparation.createPreparation(r.draft.session);legacy.load('owner');assert.equal(legacy.save('owner',r).ok,true);assert.deepEqual(api(disk).load('owner').snapshot,r);});
test('created screen no longer limits recovery to preparation before terrain',()=>{const html=CoachingScreen(snapshot().draft);assert.equal(html.includes('avant la pose ou la recherche'),false);assert.match(html,/session terrain.*cet appareil/i);});
test('external recorded pose retains in-place cockpit before the explicit external ready declaration',()=>{const r=terrain('SEARCH_READY','normal','external_driver_recorded',{declareExternal:false});assert.equal(r.preparationState.phase,'created');assert.equal(r.tracerState.phase,'in_place');assert.equal(r.searchState.phase,'SEARCH_READY');r.terrainOpen=true;const loaded=reload(r);assert.equal(loaded.preparationState.phase,'created');assert.equal(loaded.terrainOpen,true);assert.equal(loaded.tracerState.phase,'in_place');});
test('pause survives millisecond drift between the two existing pause clock reads',()=>{const r=terrain('SEARCH_RUNNING');let clock=Date.parse('2026-10-12T16:06:00.000Z');r.searchState=advanceSessionSearch(r.searchState,r.preparationState,'pause',{now:()=>clock++});assert.notEqual(r.searchState.searchPausedAt,r.searchState.searchPauseIntervals.at(-1).pausedAt);const loaded=reload(r);assert.equal(loaded.searchState.searchPausedAt,r.searchState.searchPausedAt);assert.deepEqual(loaded.searchState.searchPauseIntervals,r.searchState.searchPauseIntervals);assert.equal(loaded.searchState.searchTrackingState,'paused');});
for(const traceType of ['prepared','gpx'])test(`active pose keeps accepted ${traceType} reference and its action history`,()=>{
 let d=coaching.selectCreatorRole(coaching.updateDraft(coaching.createDraft({user_id:'owner',name:'Owner'},[{id:'nox',name:'Nox'}]),{mode:'full_blind',traceType}),'traceur');
 d=coaching.selectPreparation(d,{id:'reference',name:'Reference',source:traceType==='gpx'?'gpx':'draw',start:{x:100,y:120,space:'mock-map'}});
 d=coaching.createSession(d,{actionId:`reference-${++sequence}`,type:'session-creation',author:{userId:'owner',participantId:'self',source:'mock-auth',assurance:'local-simulation'},occurredAt:'2026-10-12T16:00:00.000Z',origin:'simulation:test',sessionId:null,referenceId:'reference',beneficiaryParticipantId:null});
 const context={sessionId:d.session.id,creatorParticipantId:'self',assignmentAuthority:'coach-role',participants:d.session.participants.map(person=>({id:person.id,functions:[...['driver','traceur','coach'].filter(role=>d.session.roles[role]===person.id),...(d.session.roles.observers.includes(person.id)?['observer']:[])]})),references:[{id:'reference',layingStarted:false}],delegations:[]};
 const assign={actionId:'assign',type:'assign',sessionId:d.session.id,referenceId:'reference',authorParticipantId:'self',beneficiaryParticipantId:'self',assignmentId:'assignment',expectedRevision:0,delegationId:null,occurredAt:'2026-10-12T16:00:00.000Z',origin:'simulation:test',assurance:'local-simulation'};
 let state=applyReferenceAssignmentAction(createReferenceAssignmentState(context),context,assign);state=applyReferenceAssignmentAction(state,context,{...assign,type:'accept',actionId:'accept',expectedRevision:1});
 let p=preparation.simulate(preparation.createPreparation(d.session),{gps:'fresh'}),t=tracer.createTracer();p=preparation.transition(p,'approach');t=tracer.advanceTracer(t,p,'approach');t=tracer.advanceTracer(t,p,'arrive');p=preparation.simulate(p,{phase:'arrived'});p=preparation.transition(p,'ready');t=tracer.advanceTracer(t,p,'ready');t=tracer.advanceTracer(t,p,'start');t=tracer.advanceTracer(t,p,'progress');
 const r={draft:d,preparationState:p,tracerState:t,searchState:syncSession(search.createSearch(),p,t),referenceAssignment:{context,state},terrainOpen:true,searchLocked:false};const loaded=reload(r);
 assert.deepEqual(loaded.referenceAssignment,r.referenceAssignment);assert.equal(getReferenceAssignment(loaded.referenceAssignment.state,'reference').status,'accepted');assert.deepEqual(loaded.draft.session.preparation,r.draft.session.preparation);assert.equal(loaded.tracerState.phase,'active');
});
for(const [mode,scenario] of [['normal','connected_traceur'],['simple_blind','connected_traceur'],['full_blind','connected_traceur'],['normal','self_trace'],['normal','external_driver_recorded']])test(`pose without first fix survives reload ${mode}/${scenario}`,()=>{
 const r=snapshot(mode,scenario);r.preparationState=preparation.simulate(r.preparationState,{gps:'acquiring'});if(scenario!=='external_driver_recorded')r.preparationState=preparation.transition(r.preparationState,'ready');r.tracerState=tracer.advanceTracer(r.tracerState,r.preparationState,'start');r.searchState=syncSession(r.searchState,r.preparationState,r.tracerState);r.terrainOpen=true;
 const loaded=reload(r);assert.equal(loaded.tracerState.phase,'active');assert.equal(loaded.tracerState.origin,null);assert.deepEqual(loaded.tracerState.segments,[]);assert.equal(loaded.tracerState.distance,0);assert.equal(loaded.searchState.phase,'LAYING');
 const p=preparation.simulate(loaded.preparationState,{gps:'fresh'}),first=tracer.advanceTracer(loaded.tracerState,p,'progress');const own=p.points[p.viewerId];assert.deepEqual(first.segments,[[{x:own.x,y:own.y}]]);assert.equal(first.distance,0);assert.equal(first.phase,'active');
 const next={...loaded,preparationState:p,tracerState:first,searchState:syncSession(loaded.searchState,p,first)};assert.deepEqual(reload(next).tracerState.segments,first.segments);
});
test('pose ending without GPS also survives reload without fabricating a trace',()=>{const r=snapshot();r.preparationState=preparation.transition(preparation.simulate(r.preparationState,{gps:'acquiring'}),'ready');r.tracerState=tracer.advanceTracer(r.tracerState,r.preparationState,'start');r.tracerState=tracer.advanceTracer(r.tracerState,r.preparationState,'finish');r.searchState=syncSession(r.searchState,r.preparationState,r.tracerState);const loaded=reload(r);assert.equal(loaded.tracerState.phase,'finished');assert.equal(loaded.searchState.phase,'TRACK_FINISHED');assert.deepEqual(loaded.tracerState.segments,[]);});
