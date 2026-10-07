// Conducteur prototype: phase, counters and coordinates live in memory only.
import {preparationView} from './coaching-preparation.mjs';
import {elapsedSeconds,formatElapsed} from './coaching-time.mjs';
export const searchPhases=Object.freeze({PREPARATION:'Session en attente',LAYING:'Traceur en pose',TRACK_FINISHED:'Pose terminée',LAYING_WAIT:'Traceur en place · attente',SEARCH_READY:'Recherche prête',SEARCH_RUNNING:'Recherche en cours',SEARCH_FINISHED:'Recherche terminée',DEBRIEF:'Débrief · lecture seule',ARCHIVED:'Session archivée · lecture seule'});
const offsets=[{x:0,y:0},{x:11,y:-8},{x:23,y:-18},{x:38,y:-13},{x:55,y:-27},{x:68,y:-42},{x:83,y:-49},{x:97,y:-62}];
const poseFixture=[[{x:70,y:242},{x:91,y:210},{x:131,y:192},{x:180,y:162},{x:223,y:109}]];
const clone=x=>structuredClone(x);
export function createSearch(){return {phase:'PREPARATION',seconds:0,distance:0,cursor:0,segments:[],gap:false,resumed:false,simulatedPhase:false,fixturePose:false,layingSegments:[]};}
export {syncSession as syncSearch} from './coaching-session-flow.mjs';
export function simulateSearch(s,patch){
 const next=clone(s);
 if(patch.phase!==undefined){if(!Object.hasOwn(searchPhases,patch.phase))throw Error('Phase mock inconnue');next.phase=patch.phase;next.simulatedPhase=true;}
 if(patch.fixturePose!==undefined)next.fixturePose=!!patch.fixturePose;
 return next;
}
export function isSearchActor(p){const v=preparationView(p);return v.role==='driver'&&v.viewerId===p.session.roles.driver&&p.team.some(a=>a.id===v.viewerId&&a.functions.includes('driver'));}
export function advanceSearch(state,p,action){
 if(!isSearchActor(p)||state.actorId&&state.actorId!==p.viewerId)throw Error('Seul le Conducteur actuellement désigné peut agir.');
 const s=clone(state),v=preparationView(p),own=v.markers.find(m=>m.id===v.viewerId),available=v.gps==='fresh'&&!!own;
 if(action==='start'&&s.phase==='SEARCH_READY'){s.phase='SEARCH_RUNNING';s.actorId=v.viewerId;s.origin=own?{x:own.x,y:own.y}:{...v.start};if(available)s.segments=[[{...s.origin}]];else s.gap=true;return s;}
 if(action==='progress'&&s.phase==='SEARCH_RUNNING'){
  s.seconds+=30;s.cursor=Math.min(s.cursor+1,offsets.length-1);
  if(!available){s.gap=true;s.resumed=false;return s;}
  const point={x:s.origin.x+offsets[s.cursor].x,y:s.origin.y+offsets[s.cursor].y},last=s.segments.at(-1)?.at(-1);
  if(s.gap||!last){s.segments.push([point]);s.resumed=s.gap;s.gap=false;}
  else if(last.x!==point.x||last.y!==point.y){s.segments.at(-1).push(point);s.distance+=35;s.resumed=false;}
  return s;
 }
 if(action==='finish'&&s.phase==='SEARCH_RUNNING'){s.phase='SEARCH_FINISHED';return s;}
 if(action==='debrief'&&s.phase==='SEARCH_FINISHED'){s.phase='DEBRIEF';return s;}
 throw Error('Action incompatible avec la phase de recherche.');
}
const paths=(segments,kind)=>segments.filter(s=>s.length>1).map((s,i)=>({kind,label:(kind==='pose'?'Pose':'Recherche')+' · segment '+(i+1)+' mock',d:s.map((p,n)=>(n?'L':'M')+p.x+' '+p.y).join(' ')}));
export function searchView(s,p,{now=Date.now()}={}){
 const v=preparationView(p),spatial=!v.referenceHidden,pose=p.traceurKind==='internal'?(s.fixturePose?poseFixture:s.layingSegments):p.productScenario==='external_driver_recorded'?s.layingSegments:[];
 const postSession=['DEBRIEF','ARCHIVED'].includes(s.phase),canReadTrackAge=postSession||v.role==='driver'&&isSearchActor(p);
 const last=s.segments.at(-1)?.at(-1),recordVisible=spatial||v.role==='driver'&&isSearchActor(p)&&(!s.actorId||s.actorId===v.viewerId),markers=v.markers.map(m=>m.id===s.actorId&&last?{...m,...last}:m.role==='traceur'&&spatial&&pose.at(-1)?.at(-1)?{...m,...pose.at(-1).at(-1)}:m);
 const own=markers.find(m=>m.id===v.viewerId),canAct=isSearchActor(p)&&(!s.actorId||s.actorId===v.viewerId);
 // Return a whitelist, never the raw session, preparation state or protected pose coordinates.
 return {phase:s.phase,phaseLabel:searchPhases[s.phase],code:v.code,dog:v.dog,mode:v.mode,modeLabel:v.modeLabel,traceLabel:v.traceLabel,role:v.role,viewerId:v.viewerId,team:v.team.map(a=>({...a,status:a.role==='traceur'&&v.mode==='full_blind'&&v.role!=='traceur'?'Informations masquées':a.role==='traceur'?s.phase==='PREPARATION'?'Préparation':s.phase==='LAYING'?'En pose':s.phase==='TRACK_FINISHED'?'Pose terminée':'En place':a.role==='driver'?searchPhases[s.phase]:a.status})),external:v.external,knowledgeNotice:v.knowledgeNotice,
  markers,start:v.start,showStart:v.showStart,arrival:spatial&&pose.at(-1)?.at(-1)?{...pose.at(-1).at(-1)}:null,
  reference:spatial?v.preparation:null,paths:[...(spatial?v.paths.filter(x=>x.kind==='reference'):[]),...(spatial?paths(pose,'pose'):[]),...(recordVisible?paths(s.segments,'search'):[])],
  gps:v.gps,gpsLabel:v.gpsLabel,accuracy:v.gps==='fresh'&&own?'± 5 m · mock':null,orientation:v.gps==='fresh'&&own?38:null,
  seconds:recordVisible?s.seconds:null,distance:recordVisible?s.distance:null,resumed:recordVisible?s.resumed:false,progress:recordVisible?Math.round(s.cursor/(offsets.length-1)*100):null,canAct,
  trackAgePreview:canReadTrackAge&&['TRACK_FINISHED','LAYING_WAIT','SEARCH_READY'].includes(s.phase)?elapsedSeconds(s.track_finished_at,now):null,
  trackAgePreviewLabel:canReadTrackAge&&['TRACK_FINISHED','LAYING_WAIT','SEARCH_READY'].includes(s.phase)?formatElapsed(elapsedSeconds(s.track_finished_at,now)):'Indisponible',
  trackAgeAtSearchStart:canReadTrackAge?s.trackAgeAtSearchStart??null:null,
  trackAgeAtSearchStartLabel:!canReadTrackAge||s.trackAgeAtSearchStart==null?'Indisponible':formatElapsed(s.trackAgeAtSearchStart),
  trackAgeAtSearchEnd:canReadTrackAge?s.trackAgeAtSearchEnd??null:null,searchStartedAt:canReadTrackAge?s.search_started_at||null:null,
  action:!canAct?null:s.phase==='SEARCH_READY'?['start','Démarrer la recherche']:s.phase==='SEARCH_RUNNING'?['finish','Terminer la recherche']:s.phase==='SEARCH_FINISHED'?['debrief','Ouvrir le débrief']:null};
}
