import {applySessionControl,isExitClosure} from './coaching-session-control.mjs';
// Two-store commit: durable closed envelope first; history next; recovery clear last.
export function persistSessionExit({snapshot,actor,command,ownerId,sessionStore,historyStorage,records}){
 const check=historyStorage.check(ownerId);if(!check.ok)return {ok:false,reason:check.reason,applied:false,snapshot};
 const candidate=applySessionControl(snapshot,actor,command),saved=sessionStore.save(ownerId,candidate);
 if(!saved.ok)return {ok:false,reason:saved.reason||'storage',applied:saved.reason!=='conflict',snapshot:saved.reason==='conflict'?snapshot:candidate};
 if(!isExitClosure(candidate.searchState.phase))return {ok:true,snapshot:candidate};
 const record={session:candidate.session,preparationState:candidate.preparationState,tracerState:candidate.tracerState,searchState:candidate.searchState};
 const history=historyStorage.save(ownerId,[...records.filter(r=>r.session.id!==candidate.session.id),record]);
 if(!history.ok)return {ok:false,reason:history.reason||'history',applied:true,snapshot:candidate};
 const cleared=sessionStore.clear(ownerId);
 return {ok:cleared.ok,applied:true,reason:cleared.ok?undefined:cleared.reason||'cleanup',snapshot:candidate};
}
export function resolveSessionExitActor(draft,user,{qa=false}={}){
 const identity=draft?.identityContext,creation=draft?.sessionCreation,session=draft?.session;
 if(qa||!user?.user_id||identity?.userId!==user.user_id||identity.source!=='mock-auth'||identity.assurance!=='local-simulation'||creation?.creatorUserId!==user.user_id||creation.creatorParticipantId!==identity.participantId||creation.sessionId!==session?.id||session.creatorParticipantId!==identity.participantId)return null;
 return {participantId:identity.participantId};
}
export function createExitConfirmation(snapshot,actor,type,epoch){return {snapshotFingerprint:JSON.stringify(snapshot),actorId:actor?.participantId,sessionId:snapshot.session.id,phase:snapshot.searchState.phase,revision:snapshot.session.control?.revision??0,type,epoch};}
export function confirmExitCommand(request,snapshot,actor,epoch,{actionId,occurredAt,reason}={}){
 if(request.epoch!==epoch||request.actorId!==actor?.participantId||request.snapshotFingerprint!==JSON.stringify(snapshot))throw Error('Confirmation périmée : la session ou son contexte a changé.');
 return {type:request.type,sessionId:request.sessionId,expectedPhase:request.phase,expectedRevision:request.revision,actionId,occurredAt,...(reason?{reason}:{})};
}
