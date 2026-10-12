// Device-local recovery before pose/search. Never an authenticated remote session.
import {validateDraft} from './coaching.mjs';
import {createPreparation,preparationView} from './coaching-preparation.mjs';
import {createSearch} from './coaching-search.mjs';
import {createReferenceAssignmentState,applyReferenceAssignmentAction} from './coaching-reference-assignment.mjs';
const ownerValid=id=>typeof id==='string'&&id.length>0&&id.trim()===id;
const keyFor=id=>`piste.v2.coaching-preparation.v1:${encodeURIComponent(id)}`;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function isRecoverableCoachingPreparation(snapshot){
 const p=snapshot?.preparationState,t=snapshot?.tracerState,s=snapshot?.searchState;
 return !!p&&['created','preparing','ready','approaching','arrived'].includes(p.phase)&&!p.physicalLaid&&['before','approaching','arrived'].includes(t?.phase)&&s?.phase==='PREPARATION';
}
function validSnapshot(ownerId,snapshot){
 try{
  if(!isRecoverableCoachingPreparation(snapshot))return false;
  const {draft,preparationState:p,tracerState:t,searchState:s,referenceAssignment:entry,terrainOpen}=snapshot;
  const session=draft.session,identity=draft.identityContext,creation=draft.sessionCreation;
  if(identity?.userId!==ownerId||identity.source!=='mock-auth'||identity.assurance!=='local-simulation'||identity.participantId!=='self'||creation?.creatorUserId!==ownerId||creation.creatorParticipantId!==identity.participantId||creation.sessionId!==session?.id||!/^mock-coaching-[1-9]\d*(?:-.+)?$/.test(session.id)||session.creatorParticipantId!==identity.participantId||validateDraft(draft).length)return false;
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
  const {scenario:searchScenario,...waitingSearch}=s;
  if(searchScenario!==undefined&&searchScenario!==session.scenario)return false;
  if(!same(waitingSearch,createSearch())||t.seconds!==0||t.distance!==0||t.cursor!==0||!Array.isArray(t.segments)||t.segments.length||!Array.isArray(t.messages)||!Number.isSafeInteger(t.messageSequence)||t.messageSequence<0)return false;
  if(t.phase!=='before'&&(t.phase!==p.phase||p.traceurKind!=='internal'||!session.preparation?.start))return false;
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
export function createCoachingPreparationStorage(storage){
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
    if(payload.version!==1||payload.ownerId!==ownerId||!validSnapshot(ownerId,payload.snapshot))return {ok:false,snapshot:null};
    observed.set(ownerId,raw);
    const snapshot=structuredClone(payload.snapshot);
    // A position available before closing the page is no longer current.
    snapshot.preparationState.gps='acquiring';
    return {ok:true,snapshot};
   }catch{return {ok:false,snapshot:null};}
  },
  save(ownerId,snapshot){return validSnapshot(ownerId,snapshot)?write(ownerId,snapshot):{ok:false};},
  clear(ownerId){return write(ownerId,null);}
 });
}
