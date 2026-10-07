import {sessionView} from './coaching-session-flow.mjs';

const MAP_FIELDS=Object.freeze([
 'phase','phaseLabel','dog','mode','modeLabel','traceLabel','team','external','knowledgeNotice',
 'markers','start','showStart','arrival','reference','paths','gps','gpsLabel','accuracy','orientation',
 'seconds','distance','resumed','progress','trackAgePreview','trackAgePreviewLabel',
 'trackAgeAtSearchStart','trackAgeAtSearchStartLabel','trackAgeAtSearchEnd','searchStartedAt'
]);

export function projectCoachingLiveForObserver({session,searchState,preparationState,tracerState,viewerId}){
 if(!session?.id||session.id!==preparationState?.session?.id||!searchState||!preparationState||!tracerState||!viewerId)return null;
 const observerId=`community-live-observer:${String(viewerId)}`;
 const observerState=structuredClone(preparationState);
 observerState.team=observerState.team.filter(person=>person.id!==observerId);
 observerState.team.push({id:observerId,name:'Observateur',functions:['observer'],activeFunction:'observer'});
 observerState.viewerId=observerId;
 const projected=sessionView(searchState,observerState,tracerState);
 const map=projected.map?Object.fromEntries(MAP_FIELDS.filter(field=>projected.map[field]!==undefined).map(field=>[field,structuredClone(projected.map[field])])):null;
 return {
  sessionId:String(session.id),
  role:'observer',roleLabel:'Observateur',readOnly:true,canAct:false,
  phase:projected.phase,mode:projected.mode,modeLabel:projected.modeLabel,
  dog:map?.dog||null,team:structuredClone(projected.team),map,
  laying:projected.laying?structuredClone(projected.laying):null,
  search:projected.search?structuredClone(projected.search):null,
  events:structuredClone(projected.events||[]),lastAction:projected.lastAction?structuredClone(projected.lastAction):null,
  notifications:structuredClone(projected.notifications||[])
 };
}
