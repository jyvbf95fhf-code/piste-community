import {isExitClosure} from './coaching-session-control.mjs';
import {simulate,preparationView} from './coaching-preparation.mjs';
import {searchView} from './coaching-search.mjs';
// Whitelist projection: interruption never acquires normal debrief disclosure rights.
export function coachingClosureView(record,viewerId=record?.preparationState?.viewerId){
 if(!isExitClosure(record?.searchState?.phase)||!record?.session?.control?.closure||!record.preparationState.team.some(m=>m.id===viewerId))return null;
 const p=simulate(record.preparationState,{viewerId,layers:false,positionsPresent:false}),v=preparationView(p),closure=record.session.control.closure;
 const previous={...record.searchState,phase:closure.previousPhase,simulatedPhase:false,fixturePose:false};
 const map=searchView(previous,p),poseAllowed=!v.referenceHidden;
 const paths=map.paths.filter(path=>path.kind!=='reference');
 const author=v.team.find(m=>m.id===closure.authorParticipantId);
 return {id:record.session.id,title:record.session.title||`Session ${record.session.code||record.session.id}`,status:record.searchState.phase==='CANCELLED'?'Annulée':'Interrompue',phase:record.searchState.phase,readonly:true,readOnly:true,canResume:false,partial:true,mode:v.modeLabel,dog:v.dog,
  closure:{type:closure.type,previousPhase:closure.previousPhase,authorName:author?.name||'Auteur indisponible',occurredAt:closure.occurredAt,reason:closure.reason||''},
  participants:v.team.map(m=>({name:m.name,role:m.roleLabel,status:m.status})),
  gpsPose:record.tracerState.gpsPose&&(poseAllowed||record.tracerState.gpsPose.actorId===viewerId)?structuredClone(record.tracerState.gpsPose):null,
  poseDistance:poseAllowed?record.tracerState.distance:null,poseSeconds:poseAllowed?record.tracerState.seconds:null,searchDistance:map.distance,searchSeconds:map.seconds,
  map:{...map,paths,markers:[],orientation:null,arrival:null},canReplay:paths.length>0,poseAvailable:paths.some(p=>p.kind==='pose'),searchAvailable:paths.some(p=>p.kind==='search'),
  temporal:{trackAgeAtSearchStart:map.trackAgeAtSearchStart??null,searchStartedAt:map.searchStartedAt??null},events:[],observations:[]};
}
