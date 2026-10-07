// Preparation-only simulator. Coordinates below are drawing units, never GPS data.
import {modes,traceTypes,roleTypes} from './coaching.mjs';
export const gpsStates=Object.freeze({acquiring:'Acquisition en cours',fresh:'Position fraîche · simulée',stale:'Position ancienne · simulée',unavailable:'Position indisponible'});
export const phaseLabels=Object.freeze({created:'Session créée',preparing:'Préparation en cours',ready:'Prêt à tracer',external_ready:'Disponibilité externe déclarée',waiting_driver:'Attente du Conducteur',approaching:'Approche du départ',arrived:'Arrivé au départ'});
const functions=roleTypes.map(r=>r.id);
const copy=value=>structuredClone(value);
const roleName=role=>roleTypes.find(r=>r.id===role)?.title;
const pointSlots={coach:{x:94,y:184},traceur:{x:206,y:105},driver:{x:116,y:224},observer:{x:275,y:204}};
const geometry=Object.freeze({start:{x:70,y:242},arrival:{x:282,y:64},reference:'M70 242 Q90 194 137 188 T207 136 Q223 76 282 64',pose:'M70 242 Q82 202 133 192 T201 140 Q215 85 282 64',releve:'M70 242 Q102 212 133 198 Q168 188 189 160'});
export function referenceStart(session){const p=session?.preparation?.start;return ['prepared','gpx'].includes(session?.traceType)&&p?.space==='mock-map'&&Number.isFinite(p.x)&&Number.isFinite(p.y)?{x:p.x,y:p.y}:null;}
function teamFrom(session){
 return session.participants.map(p=>{
  const assigned=functions.filter(role=>role==='observer'?session.roles.observers.includes(p.id):session.roles[role]===p.id);
  const solo=session.roles.traceur===p.id&&session.roles.driver===p.id;
  return {...p,functions:assigned,activeFunction:solo?'traceur':p.id==='self'&&assigned.includes(session.creatorRole)?session.creatorRole:assigned.includes('traceur')?'traceur':assigned[0]};
 }).filter(p=>p.functions.length);
}
function mockPoints(team){
 const count={};return Object.fromEntries(team.map(p=>{const role=p.activeFunction,slot=pointSlots[role],n=count[role]||0;count[role]=n+1;return [p.id,{x:slot.x+n*18,y:slot.y+n*14}];}));
}
export function createPreparation(session){
 if(!session?.prototype||!modes.some(m=>m.id===session.mode)||!traceTypes.some(t=>t.id===session.traceType))throw Error('Session mock créée requise.');
 const snapshot=copy(session),team=teamFrom(snapshot);
 const scenario=snapshot.scenario==='self_trace'?'solo':snapshot.scenario==='connected_traceur'?(snapshot.roles.traceur===snapshot.roles.driver?'solo':'session'):'session';
 return {session:snapshot,team,points:mockPoints(team),viewerId:team.some(p=>p.id==='self')?'self':team[0].id,phase:'created',traceurKind:['connected_traceur','self_trace'].includes(snapshot.scenario)?'internal':'external',gps:'acquiring',positionsPresent:true,missingActors:[],layers:false,physicalLaid:false,scenario,productScenario:snapshot.scenario,external:{name:'',state:'En préparation · déclaré'}};
}
function scenarioTeam(s,scenario){
 if(scenario==='session')return teamFrom(s.session);
 if(scenario==='solo')return [{id:'self',name:s.session.participants.find(p=>p.id==='self')?.name||'Vous',functions:['traceur','driver'],activeFunction:'traceur'}];
 const sample=[{id:'camille',name:'Camille',functions:['coach'],activeFunction:'coach'},{id:'alex',name:'Alex',functions:['traceur'],activeFunction:'traceur'},{id:'self',name:s.session.participants.find(p=>p.id==='self')?.name||'Vous',functions:['driver'],activeFunction:'driver'}];
 if(scenario==='observers')sample.push({id:'lea',name:'Léa',functions:['observer'],activeFunction:'observer'},{id:'hugo',name:'Hugo',functions:['observer'],activeFunction:'observer'});
 return sample;
}
export function simulate(state,patch={}){
 const s=copy(state);
 if(patch.mode!==undefined){if(!modes.some(m=>m.id===patch.mode))throw Error('Mode inconnu');s.session.mode=patch.mode;}
 if(patch.traceType!==undefined){if(!traceTypes.some(t=>t.id===patch.traceType))throw Error('Type inconnu');s.session.traceType=patch.traceType;}
 if(patch.scenario!==undefined){if(!['session','solo','team','observers'].includes(patch.scenario))throw Error('Scénario inconnu');s.scenario=patch.scenario;s.team=scenarioTeam(s,patch.scenario);s.points=mockPoints(s.team);s.viewerId=s.team.some(p=>p.id===s.viewerId)?s.viewerId:s.team[0].id;s.missingActors=[];}
 if(patch.traceurKind!==undefined){if(!['internal','external'].includes(patch.traceurKind))throw Error('Traceur inconnu');s.traceurKind=patch.traceurKind;}
 if(s.traceurKind==='external'&&s.team.find(p=>p.id===s.viewerId)?.activeFunction==='traceur'){
  const next=s.team.find(p=>p.functions.includes('driver'))||s.team.find(p=>!p.functions.includes('traceur'));
  if(next){s.viewerId=next.id;next.activeFunction=next.functions.includes('driver')?'driver':next.activeFunction;}
 }
 if(patch.viewerRole!==undefined){
  if(!functions.includes(patch.viewerRole)||s.traceurKind==='external'&&patch.viewerRole==='traceur')throw Error('Fonction indisponible');
  const person=s.team.find(p=>p.functions.includes(patch.viewerRole));if(!person)throw Error('Fonction absente de cette équipe');
  s.viewerId=person.id;person.activeFunction=patch.viewerRole;
 }
 if(patch.viewerId!==undefined){if(!s.team.some(p=>p.id===patch.viewerId&&!(s.traceurKind==='external'&&p.activeFunction==='traceur')))throw Error('Participant indisponible');s.viewerId=patch.viewerId;}
 if(patch.viewerFunction!==undefined){const p=s.team.find(p=>p.id===s.viewerId);if(!p.functions.includes(patch.viewerFunction)||s.traceurKind==='external'&&patch.viewerFunction==='traceur')throw Error('Fonction non attribuée');p.activeFunction=patch.viewerFunction;}
 if(patch.gps!==undefined){if(!Object.hasOwn(gpsStates,patch.gps))throw Error('État GPS inconnu');s.gps=patch.gps;}
 if(patch.phase!==undefined){if(!Object.hasOwn(phaseLabels,patch.phase))throw Error('Phase hors bloc');if(['approaching','arrived'].includes(patch.phase)&&(!referenceStart(s.session)||s.traceurKind!=='internal'||s.team.find(p=>p.id===s.viewerId)?.activeFunction!=='traceur'))throw Error('Approche réservée au Traceur interne avec départ connu');s.phase=patch.phase;}
 if(s.traceurKind==='internal'&&s.phase==='external_ready')s.phase='created';
 if(s.traceurKind==='external'&&s.phase==='ready')s.phase='preparing';
 if(patch.positionsPresent!==undefined)s.positionsPresent=!!patch.positionsPresent;
 if(patch.layers!==undefined)s.layers=!!patch.layers;
 if(patch.missingActors!==undefined){if(!Array.isArray(patch.missingActors)||patch.missingActors.some(id=>!s.team.some(p=>p.id===id)))throw Error('Participant inconnu');s.missingActors=[...new Set(patch.missingActors)];}
 s.external.state=s.phase==='external_ready'?'Prêt · déclaré':'En préparation · déclaré';
 return s;
}
export function transition(s,action){
 const v=preparationView(s);
 if(v.role!=='traceur'||s.traceurKind!=='internal')throw Error('Fonction actuelle non autorisée');
 const known=!!referenceStart(s.session);
 if(action==='approach'&&known&&['created','preparing','approaching'].includes(s.phase))return {...s,phase:'approaching'};
 if(action==='prepare'&&s.phase==='created')return {...s,phase:'preparing'};
 if(action==='ready'&&s.phase==='ready')return s;
 if(action==='ready'&&(known?s.phase==='arrived':['created','preparing'].includes(s.phase)))return {...s,phase:'ready'};
 throw Error('Transition hors préparation ou phase incompatible');
}
export function preparationView(s){
 const viewer=s.team.find(p=>p.id===s.viewerId),role=viewer.activeFunction,mode=s.session.mode;
 const readSpatial=mode==='normal'||role==='traceur'||mode==='simple_blind'&&role!=='driver';
 const concealTracer=mode==='full_blind'&&role!=='traceur';
 const team=s.team.filter(p=>!(s.traceurKind==='external'&&p.activeFunction==='traceur')).map(p=>({id:p.id,name:concealTracer&&p.activeFunction==='traceur'?'Traceur — masqué':p.name,role:p.activeFunction,roleLabel:roleName(p.activeFunction),functions:[...p.functions],self:p.id===viewer.id,status:concealTracer&&p.activeFunction==='traceur'?'Informations masquées':p.activeFunction==='traceur'?(s.phase==='ready'?'Prêt à tracer':'Préparation'):p.activeFunction==='driver'?'En attente':p.activeFunction==='observer'?'Lecture seule':'Supervision'}));
 const markers=[];
 for(const p of team){
  const freshness=p.self?s.gps:'fresh';
  const permitted=mode==='normal'||role==='traceur'||p.self||mode==='simple_blind'&&(role!=='driver'||p.role!=='traceur');
  if(!permitted||!s.positionsPresent||s.missingActors.includes(p.id)||!['fresh','stale'].includes(freshness))continue;
  const point=s.points[p.id];if(!point)continue;
  markers.push({...point,id:p.id,role:p.role,name:p.name,freshness});
 }
 const paths=[];
 if(readSpatial&&['prepared','gpx'].includes(s.session.traceType))paths.push({kind:'reference',label:'Référence préparée · simulée',d:geometry.reference});
 if(readSpatial&&s.layers&&s.traceurKind==='internal')paths.push({kind:'pose',label:'Pose · couche de test fictive',d:geometry.pose});
 if(readSpatial&&s.layers)paths.push({kind:'releve',label:'Relève · couche de test fictive',d:geometry.releve});
 const knownStart=readSpatial&&!!referenceStart(s.session);
 const actions=role==='traceur'&&s.traceurKind==='internal'?(['created','preparing','approaching'].includes(s.phase)?[{id:knownStart?'approach':'ready',label:knownStart?'Rejoindre le départ':'Me déclarer prêt à tracer'}]:s.phase==='ready'?[{id:'ready',label:'Ouvrir la carte terrain'}]:[]):[];
 const external=s.traceurKind==='external'&&(mode!=='full_blind'||role==='traceur')?{name:s.external.name,state:s.external.state}:null;
 const displayedGps=!s.positionsPresent||s.missingActors.includes(viewer.id)?'unavailable':s.gps;
 const preparation=readSpatial&&s.session.preparation?copy(s.session.preparation):null;
 const scenarioActions=s.productScenario==='external_traceur'?s.phase!=='external_ready'&&role==='driver'?[{id:'external-ready',label:'Le traceur est en place'}]:[]:s.productScenario==='external_driver_recorded'?s.phase==='created'&&role==='driver'?[{id:'start-pose',label:'Démarrer l’enregistrement de pose'}]:s.phase==='external_ready'&&role==='driver'?[{id:'external-ready',label:'Le traceur est en place'}]:[]:[];
 return {phase:s.phase,phaseLabel:phaseLabels[s.phase],code:s.session.code,scenario:s.productScenario,mode,modeLabel:modes.find(m=>m.id===mode).title,traceType:s.session.traceType,traceLabel:traceTypes.find(t=>t.id===s.session.traceType).title,dog:{...s.session.dog},viewerId:viewer.id,role,roleLabel:roleName(role),team,external,externalPosition:null,gps:displayedGps,gpsLabel:gpsStates[displayedGps],knownStart,showStart:readSpatial,start:readSpatial?referenceStart(s.session)||{...geometry.start}:{...geometry.start},arrival:readSpatial&&paths.length?{...geometry.arrival}:null,markers,paths,actions:[...actions,...scenarioActions],preparation,knowledgeNotice:viewer.functions.includes('traceur')&&viewer.functions.includes('driver'),referenceHidden:!readSpatial,physicalLaid:false};
}
