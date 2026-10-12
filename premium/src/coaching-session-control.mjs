// Local model policy only. Caller binds participant identity; DEV perspective is not authentication.
const clone=x=>structuredClone(x);
const id=x=>typeof x==='string'&&x.length>0&&x.trim()===x;
const phases=['PREPARATION','LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING','SEARCH_FINISHED','DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED'];
export const isCollectivelyClosed=phase=>['DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED'].includes(phase);
export const isExitClosure=phase=>['CANCELLED','INTERRUPTED'].includes(phase);
export function canParticipate(p,participantId){return !!p?.team?.some(person=>person.id===participantId)&&!p.session?.control?.closure&&!p.session?.control?.departures?.some(d=>d.participantId===participantId);}
export function assertParticipation(p){if(!canParticipate(p,p?.viewerId))throw Error('Participation arrêtée : cette commande n’est plus autorisée.');}
const empty=()=>({revision:0,actions:[],departures:[]});
function coherent(r){return !!r?.session?.id&&r.preparationState?.session?.id===r.session.id&&JSON.stringify(r.session)===JSON.stringify(r.preparationState.session)&&phases.includes(r.searchState?.phase);}
function started(r){return r.searchState.phase!=='PREPARATION'||['active','finished','in_place'].includes(r.tracerState?.phase)||r.tracerState?.recordingStoppedAt!=null||!!r.searchState.search_started_at;}
export function sessionControlView(r,actor){
 const control=r?.session?.control||empty(),member=coherent(r)&&id(actor?.participantId)&&r.session.participants.some(p=>p.id===actor.participantId)&&canParticipate(r.preparationState,actor.participantId),open=member&&!isCollectivelyClosed(r.searchState.phase),creator=member&&r.session.creatorParticipantId===actor.participantId;
 return {sessionId:r?.session?.id??null,revision:control.revision,phase:r?.searchState?.phase,canCancel:!!(open&&creator&&!started(r)),canInterrupt:!!(open&&creator&&started(r)),canLeave:!!(open&&!creator),canReturnHome:true};
}
export function applySessionControl(r,actor,c){
 if(!coherent(r)||!id(actor?.participantId)||!r.session.participants.some(p=>p.id===actor.participantId)||!id(c?.actionId)||!['cancel','interrupt','leave'].includes(c?.type)||c.sessionId!==r.session.id||!Number.isSafeInteger(c.expectedRevision)||c.expectedRevision<0||!Number.isFinite(Date.parse(c.occurredAt||''))||c.reason!==undefined&&(typeof c.reason!=='string'||c.reason.length>1000))throw Error('Sortie refusée : identité, session ou commande invalide.');
 const control=r.session.control||empty(),entry={...clone(c),authorParticipantId:actor.participantId},prior=control.actions.find(a=>a.actionId===c.actionId);
 if(prior){if(JSON.stringify(prior)!==JSON.stringify(entry))throw Error('Identifiant d’action déjà utilisé avec un autre contenu.');return clone(r);}
 const v=sessionControlView(r,actor);
 if(c.expectedRevision!==v.revision||c.expectedPhase!==v.phase||!v[{cancel:'canCancel',interrupt:'canInterrupt',leave:'canLeave'}[c.type]])throw Error('Sortie refusée : droits, phase ou confirmation périmés.');
 const next=clone(r),journal={...clone(control),revision:control.revision+1,actions:[...clone(control.actions),entry]};
 if(c.type==='leave')journal.departures=[...journal.departures,{participantId:actor.participantId,occurredAt:c.occurredAt,actionId:c.actionId}];
 else{journal.closure={type:c.type,previousPhase:r.searchState.phase,authorParticipantId:actor.participantId,occurredAt:c.occurredAt,...(c.reason!==undefined?{reason:c.reason}:{}),actionId:c.actionId};next.searchState.phase=c.type==='cancel'?'CANCELLED':'INTERRUPTED';}
 if(c.type==='interrupt'||c.type==='leave'){
  const collective=c.type==='interrupt',poser=next.session.scenario==='external_driver_recorded'?next.session.roles.driver:next.session.roles.traceur;
  if((collective||actor.participantId===poser)&&next.tracerState.phase==='active')next.tracerState={...next.tracerState,recordingStoppedAt:c.occurredAt,gap:true,resumed:false};
  if((collective||actor.participantId===next.session.roles.driver)&&['active','paused'].includes(next.searchState.searchTrackingState))next.searchState={...closeSearchPause(next.searchState,c.occurredAt),searchTrackingState:'stopped',recordingStoppedAt:c.occurredAt,gap:true,resumed:false};
 }
 if(c.type==='leave')next.preparationState.missingActors=[...new Set([...(next.preparationState.missingActors||[]),actor.participantId])];
 next.session={...next.session,control:journal};next.preparationState.session=clone(next.session);if(next.draft)next.draft.session=clone(next.session);
 return next;
}

export function closeSearchPause(s,at){
 const intervals=clone(s.searchPauseIntervals||[]),index=intervals.findLastIndex(i=>i.resumedAt===null);
 if(index<0)return {...s,searchPausedAt:null};
 const durationMs=Math.max(0,Date.parse(at)-Date.parse(intervals[index].pausedAt));
 intervals[index]={...intervals[index],resumedAt:at,durationMs};
 return {...s,searchPauseIntervals:intervals,searchPausedAt:null,searchTotalPausedMs:(s.searchTotalPausedMs||0)+durationMs};
}
// Validate serialized control metadata; it grants no identity or network authority.
export function validSessionControl(session,phase){
 const c=session?.control;if(c===undefined)return !isExitClosure(phase);
 try{
  if(!Number.isSafeInteger(c.revision)||c.revision<0||!Array.isArray(c.actions)||c.actions.length!==c.revision||!Array.isArray(c.departures))return false;
  const members=new Set(session.participants.map(m=>m.id)),ids=new Set(),departures=[];let closure;
  for(let i=0;i<c.actions.length;i++){
   const a=c.actions[i];
   if(!id(a.actionId)||ids.has(a.actionId)||a.sessionId!==session.id||a.expectedRevision!==i||!phases.includes(a.expectedPhase)||isCollectivelyClosed(a.expectedPhase)||!members.has(a.authorParticipantId)||!Number.isFinite(Date.parse(a.occurredAt||''))||a.reason!==undefined&&(typeof a.reason!=='string'||a.reason.length>1000)||closure||departures.some(d=>d.participantId===a.authorParticipantId))return false;
   ids.add(a.actionId);
   if(a.type==='leave'){if(a.authorParticipantId===session.creatorParticipantId)return false;departures.push({participantId:a.authorParticipantId,occurredAt:a.occurredAt,actionId:a.actionId});}
   else if(['cancel','interrupt'].includes(a.type)){
    if(a.authorParticipantId!==session.creatorParticipantId||a.type==='cancel'&&a.expectedPhase!=='PREPARATION')return false;
    closure={type:a.type,previousPhase:a.expectedPhase,authorParticipantId:a.authorParticipantId,occurredAt:a.occurredAt,...(a.reason!==undefined?{reason:a.reason}:{}),actionId:a.actionId};
   }else return false;
  }
  return JSON.stringify(c.departures)===JSON.stringify(departures)&&JSON.stringify(c.closure)===JSON.stringify(closure)&&(!closure?!isExitClosure(phase):phase===(closure.type==='cancel'?'CANCELLED':'INTERRUPTED'));
 }catch{return false;}
}
