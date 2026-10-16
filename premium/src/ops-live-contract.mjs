import {validGpsPose} from './coaching-gps-model.mjs';
const eventTypes=new Set(['Départ','Rupture','Reprise','Indice','Objet trouvé','Zone particulière','Changement notable','Fin de piste']);
const text=value=>typeof value==='string'?value.slice(0,160):null;
const nonnegative=value=>Number.isFinite(value)&&value>=0?value:null;
const point=p=>p&&(!p.space||p.space==='wgs84')&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180?{latitude:p.latitude,longitude:p.longitude,space:'wgs84'}:null;
const safeEvents=events=>Array.isArray(events)?events.filter(e=>eventTypes.has(e?.type)).map(e=>({id:text(e.id),type:e.type,...(nonnegative(e.elapsedMs)!==null?{elapsedMs:e.elapsedMs}:{}),...(point(e.point)?{point:point(e.point)}:{})})):[];
const safeTrack=t=>t?{version:1,provenance:'device-geolocation',phase:t.phase,startedAt:t.startedAt,endedAt:t.endedAt,elapsedMs:t.elapsedMs,distanceM:t.distanceM,gap:t.gap,segments:t.segments.map(s=>s.map(p=>({latitude:p.latitude,longitude:p.longitude,accuracy:p.accuracy,timestamp:p.timestamp,receivedAt:p.receivedAt})))}:null;
export function projectOpsGpsLive(mission,policy={}, {now=Date.now()}={}){
 if(!mission||mission.kind!=='operational'||!mission.id||policy.share_live!==true)return null;
 const t=mission.gpsTrack||null;
 if(t&&!validGpsPose(t,'ops:'+mission.id,mission.gpsOwnerId))throw Error('GPS OPS invalide.');
 const options=policy.projectionOptions||{},gpsTrack=safeTrack(t),elapsed=nonnegative(mission.trackingElapsedMs);
 const state=['À compléter','Terminée','Archivée'].includes(mission.status)||mission.trackingState==='stopped'?'Fin de piste':mission.status==='En cours'?(mission.trackingState==='paused'?'Pause':'En cours'):'Prêt';
 return {sessionId:String(mission.id),sessionType:'ops',role:'ops_trace_observer',readOnly:true,canAct:false,state,gpsTrack,distance:gpsTrack?.distanceM??null,trackingSeconds:elapsed===null?null:Math.floor(elapsed/1000),interruptions:Math.max(0,(gpsTrack?.segments.length||0)-1),lastPositionAt:gpsTrack?.segments.at(-1)?.at(-1)?.timestamp??null,dogName:options.showDog===true?text(mission.dog?.name):null,handlerName:options.showHandler===true?text(mission.handler?.name):null,events:options.showEvents===true?safeEvents(mission.events):[],trackAge:options.showTrackAge===true?text(mission.time?.trackAgeAtStart?.label):null,corridor:null};
}
// Validate and re-project a wire frame: never trust extra fields or client flags.
export function sanitizeOpsLiveFrame(frame){
 if(!frame||frame.sessionType!=='ops'||!frame.sessionId||!['Prêt','En cours','Pause','Fin de piste'].includes(frame.state))throw Error('Projection OPS invalide.');
 const t=frame.gpsTrack;
 if(t&&!validGpsPose({...t,sessionId:'wire',actorId:'wire'},'wire','wire'))throw Error('GPS OPS invalide.');
 if(frame.trackingSeconds!==null&&(!Number.isSafeInteger(frame.trackingSeconds)||frame.trackingSeconds<0))throw Error('Durée OPS invalide.');
 return {sessionId:String(frame.sessionId),sessionType:'ops',role:'ops_trace_observer',readOnly:true,canAct:false,state:frame.state,gpsTrack:safeTrack(t),distance:t?.distanceM??null,trackingSeconds:frame.trackingSeconds,interruptions:Math.max(0,(t?.segments.length||0)-1),lastPositionAt:t?.segments.at(-1)?.at(-1)?.timestamp??null,dogName:text(frame.dogName),handlerName:text(frame.handlerName),events:safeEvents(frame.events),trackAge:text(frame.trackAge),corridor:null};
}
export function opsLiveFreshness(projection,now=Date.now(),staleAfterMs=15000){
 const last=projection?.lastPositionAt;
 return {position:!projection?'unavailable':projection.state==='Fin de piste'?'ended':!Number.isFinite(last)?'unavailable':!Number.isFinite(now)||last>now+5000||now-last>staleAfterMs?'stale':'fresh',lastPositionAt:Number.isFinite(last)?last:null};
}
