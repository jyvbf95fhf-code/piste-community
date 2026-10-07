// Session phase and event journal shared by every view; local memory only.
import {preparationView,simulate as simulatePreparation} from './coaching-preparation.mjs';
import {advanceSearch,searchView} from './coaching-search.mjs';
import {elapsedSeconds,formatElapsed,timestampFrom} from './coaching-time.mjs';
const definitions={LAYING_STARTED:['LAYING','Le traceur réalise la piste','traceur'],LAYING_FINISHED:['TRACK_FINISHED','La piste est terminée','traceur'],TRACEUR_IN_POSITION:['LAYING_WAIT','Le traceur est en place','traceur'],SEARCH_READY:['SEARCH_READY','La recherche est prête','session'],SEARCH_STARTED:['SEARCH_RUNNING','La relève a commencé','driver'],SEARCH_PAUSED:['SEARCH_RUNNING','La recherche est en pause','driver'],SEARCH_RESUMED:['SEARCH_RUNNING','La recherche a repris','driver'],SEARCH_FINISHED:['SEARCH_FINISHED','Recherche terminée','driver'],DEBRIEF_ENTERED:['DEBRIEF','Le débrief est accessible en lecture seule','session'],SESSION_ARCHIVED:['ARCHIVED','Session archivée','session']};
const elapsedMilliseconds=(start,end)=>{const from=Date.parse(start||''),to=Date.parse(end||'');return Number.isFinite(from)&&Number.isFinite(to)?Math.max(0,to-from):null;};
function emit(s,type,at=null){const [phase,text,source]=definitions[type],events=s.events||[];return {...s,phase,events:[...events,{id:events.length+1,type,phase,text,source,...(at?{at}:{})}]};}
export function syncSession(s,p,t,{now=Date.now}={}){
 // DEV phase selection is deliberately isolated from the actual terrain flow.
 if(s.simulatedPhase)return s;
 let next={...s,scenario:p?.productScenario||s.scenario||'connected_traceur',layingSegments:structuredClone(t?.segments||[])};
 if(['external_traceur','external_driver_recorded'].includes(next.scenario)&&p?.phase==='external_ready'&&!['SEARCH_READY','SEARCH_RUNNING','SEARCH_FINISHED','DEBRIEF','ARCHIVED'].includes(next.phase)){
  if(next.phase==='PREPARATION'||next.phase==='TRACK_FINISHED')next=emit(next,'TRACEUR_IN_POSITION');
  if(next.phase==='LAYING_WAIT')next=emit(next,'SEARCH_READY');
  return next;
 }
 if(['SEARCH_READY','SEARCH_RUNNING','SEARCH_FINISHED','DEBRIEF','ARCHIVED'].includes(s.phase))return next;
 const target=t?.phase==='active'?1:t?.phase==='finished'?2:t?.phase==='in_place'?3:0;
 if(target>=1&&next.phase==='PREPARATION')next=emit(next,'LAYING_STARTED');
 if(target>=2&&next.phase==='LAYING'){
  next=emit(next,'LAYING_FINISHED');
  if(next.scenario!=='external_traceur'&&t?.phase==='finished')next={...next,track_finished_at:timestampFrom(now)};
 }
 if(target>=3&&next.phase==='TRACK_FINISHED')next=emit(next,'TRACEUR_IN_POSITION');
 if(next.phase==='LAYING_WAIT'&&next.scenario==='self_trace'&&t?.returnedToStart)next=emit(next,'SEARCH_READY');
 if(next.phase==='LAYING_WAIT'&&target>=3&&next.scenario!=='self_trace')next=emit(next,'SEARCH_READY');
 // External readiness retains its existing explicit simulator declaration; no invented trace.
 if(p.traceurKind==='external'&&p.phase==='external_ready'&&next.phase==='PREPARATION')next={...next,phase:'LAYING_WAIT'};
 return next;
}
export function markExternalTraceurInPlace(p,t=null){
 if(!['external_traceur','external_driver_recorded'].includes(p?.productScenario))throw Error('Cette action est réservée aux parcours de Traceur externe.');
 if(p.productScenario==='external_driver_recorded'&&t?.phase!=='in_place')throw Error('Terminez la pose mock et déclarez-vous en place.');
 return {...p,phase:'external_ready',external:{...p.external,state:'En place · déclaré par le Conducteur'}};
}
export function returnSelfTraceToStart(t,p){
 if(p?.productScenario!=='self_trace'||t?.phase!=='in_place')throw Error('Le retour au départ suit la déclaration de mise en place en self_trace.');
 return {...t,returnedToStart:true};
}
export function advanceSessionSearch(s,p,action,{now=Date.now}={}){
 if(s.phase==='ARCHIVED')throw Error('La session archivée est en lecture seule.');
 const next=advanceSearch(s,p,action,{now}),type={start:'SEARCH_STARTED',pause:'SEARCH_PAUSED',resume:'SEARCH_RESUMED',finish:'SEARCH_FINISHED'}[action];
 if(!type)return next;
 const at=timestampFrom(now);
 let result=emit(next,type,action==='pause'||action==='resume'?at:null);
 if(action==='start')result={...result,search_started_at:at,trackAgeAtSearchStart:elapsedSeconds(s.track_finished_at,at)};
 if(action==='pause')result={...result,searchPausedAt:at};
 if(action==='finish'){
  const searchDurationMs=elapsedMilliseconds(s.search_started_at,at),searchDuration=searchDurationMs===null?null:Math.floor(searchDurationMs/1000),searchActiveDurationMs=searchDurationMs===null?null:Math.max(0,searchDurationMs-(next.searchTotalPausedMs||0));
  result={...result,search_finished_at:at,searchDuration,searchDurationMs,searchActiveDuration:searchActiveDurationMs===null?null:Math.floor(searchActiveDurationMs/1000),searchActiveDurationMs,searchPausedDuration:searchDurationMs===null?null:Math.floor((next.searchTotalPausedMs||0)/1000),searchPauseCount:(next.searchPauseIntervals||[]).length,searchPausedAt:null,trackAgeAtSearchEnd:elapsedSeconds(s.track_finished_at,at)};
 }
 if(action==='finish')result=emit(result,'DEBRIEF_ENTERED');
 return result;
}
export function archiveSession(s,p){
 if(s.phase!=='DEBRIEF')throw Error('Seul un débrief peut être clôturé.');
 const v=preparationView(p),creatorId=p.session.roles[p.session.creatorRole];
 if(v.role!=='coach'&&(v.role==='observer'||v.viewerId!==creatorId))throw Error('Clôture réservée au Coach ou au créateur de la session.');
 return emit(s,'SESSION_ARCHIVED');
}
export const trackAgeSeconds=(s,now=Date.now())=>elapsedSeconds(s?.track_finished_at,now);
export const formatTrackAge=formatElapsed;
export function debriefView(s,p,t){
 const v=sessionView(s,p,t),blind=v.mode==='full_blind',total=t.seconds+s.seconds;
 const confidentialityReleased=['DEBRIEF','ARCHIVED'].includes(s.phase);
 // Lift spatial filters only for the post-session report. Live sessionView stays role/mode filtered.
 const completeMap=confidentialityReleased?searchView(s,simulatePreparation(p,{mode:'normal'})):null;
 if(completeMap){const availableLayers=preparationView(simulatePreparation(p,{mode:'normal'})).paths;completeMap.paths=[...completeMap.paths,...availableLayers.filter(layer=>!completeMap.paths.some(path=>path.kind===layer.kind))];completeMap.poseUnavailable=!completeMap.paths.some(path=>path.kind==='pose');completeMap.poseStatus=completeMap.poseUnavailable?'Tracé de pose indisponible':'Tracé de pose disponible';completeMap.poseRecorder=p.session.layingRecorder==='driver'?'Conducteur · appareil d’enregistrement':p.session.layingRecorder==='self'?'Conducteur · même personne':p.session.layingRecorder==='traceur'?'Traceur · application':'';completeMap.scentActor=p.session.scentActor==='external'?'Traceur externe · sans application':p.session.scentActor==='self'?'Conducteur · même personne':'Traceur · application';completeMap.externalTraceurPosition=null;completeMap.paths=completeMap.paths.map(path=>path.kind!=='pose'?path:{...path,label:p.session.layingRecorder==='driver'?`Pose enregistrée par le Conducteur · ${path.label}`:p.session.layingRecorder==='self'?`Pose · même personne · ${path.label}`:path.label});}
 // Post-session readers now share the completed team projection too; running views remain masked.
 const debriefTeam=confidentialityReleased?completeMap.team:v.team;
 const poseAvailable=completeMap?.paths.some(path=>path.kind==='pose')||false;
 const map=confidentialityReleased?{...completeMap,mode:v.mode,modeLabel:v.modeLabel,poseUnavailable:!poseAvailable,poseStatus:poseAvailable?'Tracé de pose disponible': 'Tracé de pose indisponible',poseRecorder:p.session.layingRecorder==='driver'?'Conducteur · appareil d’enregistrement':p.session.layingRecorder==='self'?'Conducteur · même personne':p.session.layingRecorder==='traceur'?'Traceur · application':'',scentActor:p.session.scentActor==='external'?'Traceur externe · sans application':p.session.scentActor==='self'?'Conducteur · même personne':'Traceur · application',externalTraceurPosition:null}:blind?null:v.map;
 const hasRecordedPose=poseAvailable;
 const temporal={trackFinishedAt:s.track_finished_at||null,searchStartedAt:s.search_started_at||null,searchFinishedAt:s.search_finished_at||null,trackAgeAtSearchStart:s.trackAgeAtSearchStart??null,trackAgeAtSearchEnd:s.trackAgeAtSearchEnd??null,searchDuration:s.searchDuration??null,searchActiveDuration:s.searchActiveDuration??null,searchActiveDurationMs:s.searchActiveDurationMs??null,searchPausedDuration:s.searchPausedDuration??null,searchPauseCount:s.searchPauseCount??(s.searchPauseIntervals||[]).length,searchPauseIntervals:structuredClone(s.searchPauseIntervals||[])};
 const trackAgeAvailable=temporal.trackAgeAtSearchStart!==null;
 return {phase:s.phase,role:v.role,viewerId:v.viewerId,mode:v.mode,modeLabel:v.modeLabel,dog:p.session.dog,traceLabel:map?.traceLabel||p.session.traceType,team:debriefTeam,canArchive:s.phase==='DEBRIEF'&&(v.role==='coach'||v.role!=='observer'&&v.viewerId===p.session.roles[p.session.creatorRole]),summary:{mode:v.mode,dog:p.session.dog,participants:debriefTeam.map(a=>({name:a.name,role:a.roleLabel,status:a.status})),traceType:p.session.traceType,traceLabel:map?.traceLabel||p.session.traceType,layingSeconds:!hasRecordedPose?'Tracé de pose indisponible':blind?null:t.seconds,searchSeconds:s.seconds,totalSeconds:total,layingDistance:!hasRecordedPose?'Tracé de pose indisponible':blind?null:t.distance,searchDistance:s.distance,startedAt:s.search_started_at||null,finishedAt:s.search_finished_at||null,status:s.phase==='ARCHIVED'?'Session archivée':s.phase==='DEBRIEF'?'Débrief en cours':'Recherche terminée',...temporal},temporal,map,science:{weather:{temperature:{value:'16 °C',status:'estimé'},humidity:{value:'64 %',status:'estimé'},wind:{value:'5 km/h · nord-ouest',status:'estimé'},provenance:'scénario mock · non mesuré'},layingDuration:{value:blind?null:hasRecordedPose?t.seconds:null,status:blind?'inconnu':hasRecordedPose?'estimé':'inconnu'},trackAge:{value:trackAgeAvailable?formatElapsed(temporal.trackAgeAtSearchStart):null,status:trackAgeAvailable?'calculé':'indisponible'},search:{duration:{value:s.seconds,status:'estimé'},distance:{value:s.distance,status:'estimé'},provenance:'scénario mock'} ,corridor:{value:'Couloir olfactif non calculé',status:'estimé'}},observations:{items:['Vent léger simulé','Nox suit le scénario de recherche mock','Aucun obstacle signalé dans cette démonstration'],persisted:false},events:confidentialityReleased?structuredClone(s.events||[]):v.events,lastAction:v.lastAction};
}
export function sessionView(s,p,t){
 const v=preparationView(p),coach=v.role==='coach',observer=v.role==='observer',blind=(coach||observer)&&v.mode==='full_blind',spatial=!v.referenceHidden;
 const projection=searchView(s,p),events=(s.events||[]).filter(e=>!observer||['LAYING_STARTED','LAYING_FINISHED','TRACEUR_IN_POSITION','SEARCH_READY','SEARCH_STARTED','SEARCH_PAUSED','SEARCH_RESUMED','SEARCH_FINISHED','DEBRIEF_ENTERED','SESSION_ARCHIVED'].includes(e.type)).map(({id,type,phase,text,source})=>({id,type,phase,text,source}));
 const laying=spatial&&p.traceurKind==='internal'?{seconds:t.seconds,distance:t.distance,progress:t.progress??Math.round(t.cursor/8*100)}:null;
 const search=(v.role==='traceur'||spatial||observer)&&s.actorId?{seconds:s.seconds,distance:s.distance,progress:Math.round(s.cursor/7*100)}:null;
 const team=v.team.map(a=>({...a,status:a.role==='traceur'?['SEARCH_READY','SEARCH_RUNNING','SEARCH_FINISHED','DEBRIEF','ARCHIVED'].includes(s.phase)?'En place':s.phase==='LAYING'?'En pose':s.phase==='TRACK_FINISHED'?'Pose terminée':a.status:a.role==='driver'?s.phase==='SEARCH_RUNNING'?(s.searchTrackingState==='paused'?'Recherche en pause':'En recherche'):s.phase==='SEARCH_FINISHED'||s.phase==='DEBRIEF'||s.phase==='ARCHIVED'?'Recherche terminée':'En attente':a.status}));
 // Blind Coach receives no map, metrics, timestamps, geometry, cap or numeric progression.
 return {phase:s.phase,searchTrackingState:s.searchTrackingState||'stopped',role:v.role,viewerId:v.viewerId,mode:v.mode,modeLabel:v.modeLabel,team,laying:blind?null:laying,search:coach&&blind?null:search,map:blind?null:{...projection,team},events,lastAction:events.at(-1)||null,notifications:events.filter(e=>v.role==='driver'?['LAYING_STARTED','LAYING_FINISHED','SEARCH_READY','SEARCH_FINISHED','DEBRIEF_ENTERED','SESSION_ARCHIVED'].includes(e.type):v.role==='traceur'?['SEARCH_STARTED','SEARCH_FINISHED','DEBRIEF_ENTERED','SESSION_ARCHIVED'].includes(e.type):v.role==='coach'||v.role==='observer'?true:false),canAct:false};
}
