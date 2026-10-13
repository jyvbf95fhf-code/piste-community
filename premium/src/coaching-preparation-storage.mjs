import {isExitClosure,validSessionControl} from './coaching-session-control.mjs';
import {validGpsSearch} from './coaching-driver-gps-model.mjs';
import {validGpsTracer,gapGpsPose} from './coaching-gps-model.mjs';
// Device-local Coaching recovery. Never an authenticated remote session.
import {validateDraft} from './coaching.mjs';
import {createPreparation,preparationView} from './coaching-preparation.mjs';
import {createSearch,searchView} from './coaching-search.mjs';
import {createReferenceAssignmentState,applyReferenceAssignmentAction} from './coaching-reference-assignment.mjs';
const ownerValid=id=>typeof id==='string'&&id.length>0&&id.trim()===id;
const keyFor=id=>`piste.v2.coaching-preparation.v1:${encodeURIComponent(id)}`;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function isRecoverableCoachingPreparation(snapshot){
 const p=snapshot?.preparationState,t=snapshot?.tracerState,s=snapshot?.searchState;
 return !!p&&['created','preparing','ready','approaching','arrived'].includes(p.phase)&&!p.physicalLaid&&['before','approaching','arrived'].includes(t?.phase)&&s?.phase==='PREPARATION';
}
const terrainPhases=['LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING','SEARCH_FINISHED'];
export function isRecoverableCoachingSession(snapshot){
 return !isExitClosure(snapshot?.searchState?.phase)&&(isRecoverableCoachingPreparation(snapshot)||terrainPhases.includes(snapshot?.searchState?.phase));
}
function validContext(ownerId,snapshot){
 try{
  const {draft,preparationState:p,referenceAssignment:entry,terrainOpen}=snapshot;
  const session=draft.session,identity=draft.identityContext,creation=draft.sessionCreation;
  if(!validGpsSearch(snapshot.searchState,p)||!validGpsTracer(snapshot.tracerState,p,snapshot.searchState.phase))return false;
  if(identity?.userId!==ownerId||identity.source!=='mock-auth'||identity.assurance!=='local-simulation'||identity.participantId!=='self'||creation?.creatorUserId!==ownerId||creation.creatorParticipantId!==identity.participantId||creation.sessionId!==session?.id||!/^mock-coaching-[1-9]\d*(?:-.+)?$/.test(session.id)||session.creatorParticipantId!==identity.participantId||validateDraft(draft).length)return false;
  if(!validSessionControl(session,snapshot.searchState.phase))return false;
  if(!same(session,p.session)||!same(session.roles,draft.roles)||session.mode!==draft.mode||session.traceType!==draft.traceType||session.scenario!==draft.trackingScenario||session.creatorRole!==draft.creatorRole||!same(session.preparation,draft.preparationTrack)||typeof terrainOpen!=='boolean')return false;
  if(!same(session.dog,draft.dogs.find(d=>d.id===draft.dogId)))return false;
  const roles=session.roles,ids=[roles.driver,roles.traceur,roles.coach,...roles.observers].filter(Boolean);
  const members=draft.participants.filter(person=>ids.includes(person.id));
  if(!same(session.participants,members)||new Set(session.participants.map(person=>person.id)).size!==session.participants.length)return false;
  const expected=createPreparation(session);
  if(p.scenario!==expected.scenario||p.productScenario!==expected.productScenario||p.traceurKind!==expected.traceurKind||p.team.length!==expected.team.length||!p.team.some(person=>person.id===p.viewerId))return false;
  for(let i=0;i<p.team.length;i++){
   const actual=p.team[i],canonical=expected.team[i];
   if(actual.id!==canonical.id||!same(actual.functions,canonical.functions)||!actual.functions.includes(actual.activeFunction))return false;
  }
  if(!['acquiring','fresh','stale','unavailable'].includes(p.gps)||!Array.isArray(p.missingActors)||p.missingActors.some(id=>!p.team.some(person=>person.id===id)))return false;
  preparationView(p);
  if(snapshot.searchLocked!==undefined&&typeof snapshot.searchLocked!=='boolean')return false;
  if(entry!==null){
   const context={sessionId:session.id,creatorParticipantId:creation.creatorParticipantId,assignmentAuthority:'coach-role',participants:session.participants.map(person=>({id:person.id,functions:[...['driver','traceur','coach'].filter(role=>roles[role]===person.id),...(roles.observers.includes(person.id)?['observer']:[])]})),references:[{id:session.preparation?.id,layingStarted:false}],delegations:[]};
   if(!same(entry.context,context))return false;
   let rebuilt=createReferenceAssignmentState(context);
   for(const action of entry.state.actions)rebuilt=applyReferenceAssignmentAction(rebuilt,context,action);
   if(!same(rebuilt,entry.state))return false;
  }
  return true;
 }catch{return false;}
}
function validSnapshot(ownerId,snapshot){
 try{
  if(!isRecoverableCoachingPreparation(snapshot)||!validContext(ownerId,snapshot))return false;
  const {draft,preparationState:p,tracerState:t,searchState:s}=snapshot;
  const {scenario:searchScenario,...waitingSearch}=s;
  if(searchScenario!==undefined&&searchScenario!==draft.session.scenario)return false;
  if(!same(waitingSearch,createSearch())||t.seconds!==0||t.distance!==0||t.cursor!==0||!Array.isArray(t.segments)||t.segments.length||!Array.isArray(t.messages)||!Number.isSafeInteger(t.messageSequence)||t.messageSequence<0)return false;
  return t.phase==='before'||t.phase===p.phase&&p.traceurKind==='internal'&&!!draft.session.preparation?.start;
 }catch{return false;}
}
const nonnegative=value=>Number.isFinite(value)&&value>=0;
const point=value=>Number.isFinite(value?.x)&&Number.isFinite(value?.y);
const segments=value=>Array.isArray(value)&&value.every(segment=>Array.isArray(segment)&&segment.length>0&&segment.every(point));
const time=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
function validTerrainSnapshot(ownerId,snapshot,closed=false){
 try{
  const actual=snapshot?.searchState?.phase,prior=closed?snapshot.draft.session.control.closure.previousPhase:actual;
  if(!terrainPhases.includes(prior)||!validContext(ownerId,snapshot))return false;
  const {draft,preparationState:p,tracerState:t}=snapshot,s={...snapshot.searchState,phase:prior};
  const stopped=closed||!!s.recordingStoppedAt;
  const scenario=draft.session.scenario;
  if(s.simulatedPhase!==false||s.fixturePose!==false||s.scenario!==scenario||!['created','preparing','ready','approaching','arrived','external_ready'].includes(p.phase))return false;
  for(const state of [s,t]){
   if(!nonnegative(state.seconds)||!nonnegative(state.distance)||!Number.isSafeInteger(state.cursor)||state.cursor<0||!segments(state.segments)||typeof state.gap!=='boolean'||typeof state.resumed!=='boolean')return false;
   if(state.origin!==undefined&&state.origin!==null&&!point(state.origin))return false;
  }
  if(s.cursor>7||t.cursor>8||!Array.isArray(t.messages)||!Number.isSafeInteger(t.messageSequence)||t.messageSequence<0||!['before','active','finished','in_place'].includes(t.phase))return false;
  if(scenario==='external_traceur'&&(t.phase!=='before'||t.segments.length||t.distance||t.seconds))return false;
  if(scenario!=='external_traceur'){
   if(t.segments.length?!point(t.origin):t.origin!==null||t.originSource!==null||t.distance!==0)return false;
   if(t.originCursor!==undefined&&t.originCursor!==null&&(!Number.isSafeInteger(t.originCursor)||t.originCursor<0||t.originCursor>t.cursor))return false;
  }
  if(!same(s.layingSegments,t.segments)||!Array.isArray(s.events)||s.events.some(event=>!event||!Number.isSafeInteger(event.id)||typeof event.type!=='string'||event.at!==undefined&&!time(event.at)))return false;
  if(s.phase==='LAYING'&&t.phase!=='active'||s.phase==='TRACK_FINISHED'&&t.phase!=='finished'||s.phase==='LAYING_WAIT'&&(scenario!=='self_trace'||t.phase!=='in_place'||t.returnedToStart))return false;
  if(['SEARCH_READY','SEARCH_RUNNING','SEARCH_FINISHED'].includes(s.phase)){
   if(scenario==='external_traceur'?p.phase!=='external_ready':t.phase!=='in_place')return false;
   if(scenario==='self_trace'&&!t.returnedToStart||scenario==='external_driver_recorded'&&s.phase!=='SEARCH_READY'&&p.phase!=='external_ready')return false;
  }
  if(!['stopped','active','paused'].includes(s.searchTrackingState)||!Array.isArray(s.searchPauseIntervals)||!nonnegative(s.searchTotalPausedMs))return false;
  if(s.phase==='SEARCH_RUNNING'){
   if(!(stopped?s.searchTrackingState==='stopped':['active','paused'].includes(s.searchTrackingState))||s.actorId!==draft.session.roles.driver||!time(s.search_started_at))return false;
  }else if(s.searchTrackingState!=='stopped')return false;
  if(!Array.isArray(s.segmentTrackingStates)||s.segmentTrackingStates.length!==s.segments.length)return false;
  let closedPauseMs=0,open=0;
  for(const interval of s.searchPauseIntervals){
   if(!time(interval.pausedAt))return false;
   // The existing flow timestamps the interval and UI pause in separate reads.
   if(interval.resumedAt===null){open++;if(interval.durationMs!==null||!time(s.searchPausedAt)||Date.parse(s.searchPausedAt)<Date.parse(interval.pausedAt))return false;}
   else{if(!time(interval.resumedAt)||!nonnegative(interval.durationMs)||interval.durationMs!==Math.max(0,Date.parse(interval.resumedAt)-Date.parse(interval.pausedAt)))return false;closedPauseMs+=interval.durationMs;}
  }
  if(closedPauseMs!==s.searchTotalPausedMs||open!==(s.searchTrackingState==='paused'?1:0)||s.searchTrackingState!=='paused'&&s.searchPausedAt!==null)return false;
  for(const state of s.segmentTrackingStates)if(!['active','paused'].includes(state.trackingState)||state.trackingState==='active'&&state.pauseIntervalIndex!==null||state.trackingState==='paused'&&(!Number.isSafeInteger(state.pauseIntervalIndex)||!s.searchPauseIntervals[state.pauseIntervalIndex]))return false;
  if(s.recordingStoppedAt!==undefined&&(!time(s.recordingStoppedAt)||!closed&&!draft.session.control?.departures.some(d=>d.participantId===draft.session.roles.driver&&d.occurredAt===s.recordingStoppedAt)))return false;
  if(t.recordingStoppedAt!==undefined&&(!time(t.recordingStoppedAt)||!closed&&!draft.session.control?.departures.some(d=>d.participantId===(scenario==='external_driver_recorded'?draft.session.roles.driver:draft.session.roles.traceur)&&d.occurredAt===t.recordingStoppedAt)))return false;
  if(s.track_finished_at!==undefined&&!time(s.track_finished_at))return false;
  for(const field of ['trackAgeAtSearchStart','searchDuration','searchDurationMs','searchActiveDuration','searchActiveDurationMs','searchPausedDuration','searchPauseCount'])if(s[field]!==undefined&&s[field]!==null&&!nonnegative(s[field]))return false;
  searchView(s,p);
  return true;
 }catch{return false;}
}
function validClosedSnapshot(ownerId,snapshot){
 if(!isExitClosure(snapshot?.searchState?.phase)||!validContext(ownerId,snapshot))return false;
 if(snapshot.searchState.phase==='INTERRUPTED')return validTerrainSnapshot(ownerId,snapshot,true)&&snapshot.searchState.searchTrackingState==='stopped';
 const restored=structuredClone(snapshot);restored.searchState.phase='PREPARATION';delete restored.draft.session.control;delete restored.preparationState.session.control;
 return validSnapshot(ownerId,restored);
}
function createSnapshotStorage(storage,validate,terrainRecovery=false){
 const observed=new Map();
 function write(ownerId,snapshot){
  if(!ownerValid(ownerId)||typeof storage?.getItem!=='function'||typeof storage?.setItem!=='function'||typeof storage?.removeItem!=='function'||!observed.has(ownerId))return {ok:false};
  try{
   const key=keyFor(ownerId),current=storage.getItem(key);
   if(current!==observed.get(ownerId))return {ok:false,reason:'conflict'};
   const raw=snapshot===null?null:JSON.stringify({version:1,ownerId,snapshot});
   if(current!==raw){if(raw===null)storage.removeItem(key);else storage.setItem(key,raw);}
   observed.set(ownerId,raw);return {ok:true};
  }catch{return {ok:false};}
 }
 return Object.freeze({
  load(ownerId){
   if(!ownerValid(ownerId)||typeof storage?.getItem!=='function')return {ok:false,snapshot:null};
   try{
    const raw=storage.getItem(keyFor(ownerId));
    if(raw===null){observed.set(ownerId,null);return {ok:true,snapshot:null};}
    const payload=JSON.parse(raw);
    if(payload.version!==1||payload.ownerId!==ownerId||!validate(ownerId,payload.snapshot))return {ok:false,snapshot:null};
    observed.set(ownerId,raw);
    const snapshot=structuredClone(payload.snapshot);
    // A position available before closing the page is no longer current.
    snapshot.preparationState.gps='acquiring';
    // Preserve every recorded point and mark the unobserved interval as a gap.
    if(terrainRecovery&&snapshot.tracerState.phase==='active'){snapshot.tracerState.gap=true;snapshot.tracerState.resumed=false;}
    if(snapshot.searchState.gpsSearch)snapshot.searchState.gpsSearch=gapGpsPose(snapshot.searchState.gpsSearch);
    if(snapshot.tracerState.gpsPose)snapshot.tracerState.gpsPose=gapGpsPose(snapshot.tracerState.gpsPose);
    if(terrainRecovery&&snapshot.searchState.phase==='SEARCH_RUNNING'){snapshot.searchState.gap=true;snapshot.searchState.resumed=false;}
    return {ok:true,snapshot};
   }catch{return {ok:false,snapshot:null};}
  },
  save(ownerId,snapshot){return validate(ownerId,snapshot)?write(ownerId,snapshot):{ok:false};},
  clear(ownerId){return write(ownerId,null);}
 });
}
export function createCoachingPreparationStorage(storage){return createSnapshotStorage(storage,validSnapshot);}
export function createCoachingSessionStorage(storage){return createSnapshotStorage(storage,(ownerId,snapshot)=>validSnapshot(ownerId,snapshot)||validTerrainSnapshot(ownerId,snapshot)||validClosedSnapshot(ownerId,snapshot),true);}
