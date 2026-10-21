// Deterministic, fictional seed specification. This module never performs I/O.
import {preparePersistenceCandidate} from './persistence-domain-adapters.mjs';
import {normalizeOperationalMission} from './operational-data.mjs';
import {createRemoteSession,reduceRemoteSession,projectRemoteSession} from './server/coaching-service.mjs';
import {gpsDistance} from './coaching-gps-model.mjs';
import {LOBO_DEMO_OWNER_ID,LOBO_DEMO_LABEL,LOBO_DEMO_MANIFEST} from './lobo-demo-identity.mjs';
export {LOBO_DEMO_OWNER_ID,LOBO_DEMO_LABEL,LOBO_DEMO_MANIFEST} from './lobo-demo-identity.mjs';
const kinds=new Map([[LOBO_DEMO_MANIFEST.dogId,'dog'],...LOBO_DEMO_MANIFEST.opsIds.map(id=>[id,'operational']),...LOBO_DEMO_MANIFEST.coachingIds.map(id=>[id,'coaching'])]);
const flags={dataOrigin:'demo',synthetic:true,demo:true,demoLabel:LOBO_DEMO_LABEL};
const labelText=value=>typeof value==='string'&&value.includes(LOBO_DEMO_LABEL);
// Recognition uses all three: an exact manifest ID, its verified owner, and a persistent marker.
export function isLoboDemoRecord(record,{ownerId}={}){
 if(!record||!kinds.has(record.id))return false;
 const owner=ownerId??record.ownerId??record.owner_id;if(owner!==LOBO_DEMO_OWNER_ID||record.ownerId!==undefined&&record.ownerId!==owner||record.owner_id!==undefined&&record.owner_id!==owner)return false;
 const p=record.payload??record.state??record;
 return [p.demoLabel,p.notes,p.details?.notes,p.details?.searchedPerson,p.session?.dog?.name,p.dog,p.title].some(labelText);
}
export function isLoboDemoSource(source){return isLoboDemoRecord(source)&&source.dataOrigin==='demo'&&source.synthetic===true&&source.demo===true&&source.demoLabel===LOBO_DEMO_LABEL&&source.dogId===LOBO_DEMO_MANIFEST.dogId&&kinds.get(source.id)===source.kind&&(['ARCHIVED','DEBRIEF'].includes(source.status)&&source.kind==='coaching'||['Terminée','Archivée'].includes(source.status)&&source.kind==='operational');}
// Call at the client boundary before account adapters. The server intentionally projects a whitelist.
export function decorateLoboDemoRecord(record,options={}){
 if(!isLoboDemoRecord(record,options))return record;
 const result={...structuredClone(record),...flags,ownerId:LOBO_DEMO_OWNER_ID};
 for(const key of ['pose','search','gpsTrack'])if(result[key]&&typeof result[key]==='object')result[key]={...result[key],provenance:'simulated',simulated:true,subject:'handler-phone-simulation',demoLabel:LOBO_DEMO_LABEL};
 return result;
}
const terrains=['Chemin agricole','Sous-bois et lisière','Prairie et bordure','Chemin périurbain'];
const durations=[744,1080,636,1440,912,672,1200,828,1560,960,720,1320,804,1020,660,1380,888,1140,768,1260];
const lengths=[.0058,.0089,.0049,.0118,.0074,.0052,.0102,.0067,.0125,.0081,.0056,.0110,.0063,.0087,.0051,.0114,.0072,.0094,.0060,.0106];
const iso=t=>new Date(t).toISOString();
function route(n,start,duration,search=false){const count=Math.ceil(duration/12);return Array.from({length:count+1},(_,i)=>{const r=i/count;return {space:'wgs84',x:7.46+lengths[n]*r+Math.sin(r*13+n*.7)*(search?.00009:.000015),y:48.63+(n%4)*.003+Math.sin(r*6)*.00065+(search?Math.cos(r*19+n)*.00006:0),timestamp:iso(start+r*duration*1000),accuracy:4+n%4};});}
const distance=trace=>trace.slice(1).reduce((sum,p,i)=>sum+gpsDistance({latitude:p.y,longitude:p.x},{latitude:trace[i].y,longitude:trace[i].x}),0);
const fix=p=>({timestamp:Date.parse(p.timestamp),coords:{latitude:p.y,longitude:p.x,accuracy:p.accuracy}});
function observations(n,start,duration){const count=[1,0,2,1,3,0,2,1,0,2][n%10];return Array.from({length:count},(_,j)=>{const at=start+(duration*(.22+j*.2))*1000;return [{id:`rupture-${j}`,type:'Rupture',timestamp:iso(at),text:`${LOBO_DEMO_LABEL} · arrêt et recherche du départ observés`},{id:`reprise-${j}`,type:'Reprise',timestamp:iso(at+36000),text:`${LOBO_DEMO_LABEL} · reprise déclarée, cause inconnue`}];}).flat();}
function source(n,kind,id,dog){const start=Date.UTC(2026,3,4+n*8+(kind==='coaching'?3:0),8,n%4*10),duration=durations[n],trace=route(n,start,duration,true),reference=route(n,start-3600000,duration,false),missingGps=n===6||n===17,missingEvents=n%7===5,missingWeather=n%6===4,age=n%9===7?null:[1800,3600,5400,7200][n%4];return {id,ownerId:LOBO_DEMO_OWNER_ID,...flags,kind,status:kind==='coaching'?'ARCHIVED':'Archivée',dog:{id:dog.id,name:dog.name,...flags},dogId:dog.id,title:`Lobo · ${kind==='coaching'?'Coaching':'OPS'} ${String(n+1).padStart(2,'0')} · ${LOBO_DEMO_LABEL}`,handlerId:LOBO_DEMO_OWNER_ID,startedAt:iso(start),finishedAt:iso(start+duration*1000),mode:'normal',terrain:terrains[n%4],trackAge:age===null?null:{seconds:age,provenance:'simulated'},weather:missingWeather?null:{temperature:[16,13,19,21][n%4],humidity:[65,78,58,50][n%4],label:LOBO_DEMO_LABEL,provenance:'simulated'},wind:missingWeather?null:{speed:[3,2,6,4][n%4],direction:n%4*90,provenance:'simulated'},trace:missingGps?[]:trace,referenceTrace:kind==='operational'||missingGps||n%8===3?null:reference,events:missingEvents?[]:observations(n,start,duration),eventsComplete:!missingEvents,metrics:{...(missingGps?{}:{distanceM:distance(trace)}),...(n%8===7?{}:{durationSeconds:duration})},provenance:{trace:'simulated',referenceTrace:kind==='operational'?null:'simulated',distance:'calculated',subject:'handler-phone-simulation',caninePosition:'unavailable'},demoMissing:[...(missingGps?['GPS']:[]),...(missingEvents?['Journal des événements']:[]),...(missingWeather?['Météo et vent']:[]),...(age===null?['Âge de piste']:[]),...(n%8===7?['Durée active']:[])],observations:`${LOBO_DEMO_LABEL} · ${missingEvents?'Journal des ruptures et reprises non renseigné ; leur nombre reste inconnu.':observations(n,start,duration).length===0?'Aucune rupture ni reprise signalée dans le journal complet.':['Reprise calme après un carrefour ; cause inconnue.','Recherche du départ puis reprise déclarée.','Arrêts brefs en lisière ; cause inconnue.','Rupture et reprise signalées ; aucune causalité démontrée.'][n%4]}`};}
function operational(s){const start=Date.parse(s.startedAt),stop=Date.parse(s.finishedAt);return normalizeOperationalMission({id:s.id,kind:'operational',dogId:s.dogId,dog:s.dog,handler:{id:LOBO_DEMO_OWNER_ID,name:LOBO_DEMO_LABEL},status:'Archivée',trackingState:'stopped',createdAt:s.startedAt,startedAt:s.startedAt,trackingStartedAt:s.startedAt,trackingStoppedAt:s.finishedAt,completedAt:s.finishedAt,archivedAt:s.finishedAt,trackingElapsedMs:stop-start,details:{searchedPerson:`Personnage fictif ${s.title}`,notes:LOBO_DEMO_LABEL,observations:s.observations,environment:s.terrain,result:`Exercice clos · ${LOBO_DEMO_LABEL}`},time:{lastContactAt:s.trackAge?iso(start-s.trackAge.seconds*1000):null,trackingActiveDurationMs:stop-start,trackAgeAtStart:s.trackAge?.seconds??null},trace:s.trace,events:s.events,journal:s.events,gpsTrack:null,gpsOwnerId:LOBO_DEMO_OWNER_ID,weatherSnapshot:s.weather,environment:{type:s.terrain,weather:s.weather},traceMetadata:{sourceType:'demo',sourceDevice:'Téléphone simulé du conducteur',importType:null},provenance:{trace:'demo',events:'demo',weather:'demo',subject:'handler-phone-simulation'},dataQuality:{label:LOBO_DEMO_LABEL,missing:s.demoMissing,demoSource:structuredClone(s)},dogEvaluation:{comment:s.observations},fieldEvaluation:{comment:LOBO_DEMO_LABEL},result:`Exercice fictif terminé · ${LOBO_DEMO_LABEL}`});}
function remote(s,n){const start=Date.parse(s.startedAt),duration=durations[n],poseStart=start-(s.trackAge?.seconds??3600)*1000-duration*1000,pose=route(n,poseStart,duration,false),search=route(n,start,duration,true);let state=createRemoteSession({id:s.id,owner:{id:LOBO_DEMO_OWNER_ID,name:LOBO_DEMO_LABEL},role:'driver',scenario:'self_trace',mode:'normal',traceType:'direct',dogName:`Lobo · ${LOBO_DEMO_LABEL}`,now:poseStart});const cmd=(type,payload,now)=>state=reduceRemoteSession(state,{userId:LOBO_DEMO_OWNER_ID,type,payload,now});
 const record=(kind,points)=>{cmd(kind==='pose'?'start-pose':'start-search',{fix:fix(points[0]),segmentId:kind},Date.parse(points[0].timestamp));for(let i=1;i<points.length;i++)cmd('gps-batch',{kind,points:[{...fix(points[i]),capturedAt:Date.parse(points[i].timestamp),sequence:i,segmentId:kind}]},Date.parse(points[i].timestamp));};
 record('pose',pose);const poseEnd=Date.parse(pose.at(-1).timestamp);cmd('finish-pose',{},poseEnd);cmd('in-place',{},poseEnd+1000);cmd('return-start',{},start-1000);record('search',search);cmd('finish-search',{},Date.parse(s.finishedAt));cmd('save-note',{text:`${s.observations}\n${LOBO_DEMO_LABEL} · téléphone du conducteur simulé, aucune position canine mesurée.`},Date.parse(s.finishedAt)+1000);cmd('archive',{},Date.parse(s.finishedAt)+2000);
 state.session.dog.id=s.dogId;state.session.demoLabel=LOBO_DEMO_LABEL;state.demoLabel=LOBO_DEMO_LABEL;state.synthetic=true;state.dataOrigin='demo';state.demo=true;state.provenance='demo';state.demoSource=structuredClone(s);for(const gps of [state.tracer.gpsPose,state.search.gpsSearch])if(gps){gps.provenance='simulated';gps.simulated=true;gps.subject='handler-phone-simulation';gps.demoLabel=LOBO_DEMO_LABEL;}if(!s.trackAge){state.search.trackAgeAtSearchStart=null;state.search.trackAgeAtSearchEnd=null;state.search.track_finished_at=null;}if(!s.trace.length){state.search.gpsSearch=null;state.tracer.gpsPose=null;}return {id:s.id,owner_id:LOBO_DEMO_OWNER_ID,version:state.version,state,updated_at:iso(Date.parse(s.finishedAt)+2000)};}
export function buildLoboDemoDataset(){
 const dog={id:LOBO_DEMO_MANIFEST.dogId,name:'Lobo',breed:'Berger belge',dateOfBirth:'2022-04-08',age:'4 ans',sex:'Mâle',status:'active',portrait:'silhouette',disciplines:['tracking','search'],notes:`${LOBO_DEMO_LABEL} · chien entièrement fictif ; aucune performance réelle.`,...flags};
 const sources=[...LOBO_DEMO_MANIFEST.opsIds.map((id,n)=>source(n,'operational',id,dog)),...LOBO_DEMO_MANIFEST.coachingIds.map((id,n)=>source(n,'coaching',id,dog))];
 const thin=points=>{if(!points)return null;const step=Math.max(1,Math.ceil(points.length/24));return points.filter((_,i)=>i%step===0||i===points.length-1);};
 dog.sessions=sources.filter(s=>s.kind==='coaching').map(s=>({...structuredClone(s),trace:thin(s.trace),referenceTrace:thin(s.referenceTrace)}));
 const prepared=(kind,id,value)=>({kind,id,payload:preparePersistenceCandidate({kind,localId:id,value}).payload});
 const personalRecords=[prepared('dog',dog.id,dog),...sources.filter(s=>s.kind==='operational').map(s=>prepared('ops',s.id,operational(s))),...sources.filter(s=>s.kind==='coaching').map(s=>prepared('session-dog-link',s.id,{sessionId:s.id,dogId:dog.id}))];
 const coachingSessions=sources.filter(s=>s.kind==='coaching').map(remote);
 return {manifest:structuredClone(LOBO_DEMO_MANIFEST),dog,sources,personalRecords,coachingSessions};
}
export function projectLoboDemoSession(row){return decorateLoboDemoRecord(projectRemoteSession(row.state,LOBO_DEMO_OWNER_ID,Date.parse(row.updated_at)));}

// No fixture fallback: accepted rows are the only source of rendered history.
export function deserializeLoboDemoRows({personalRecords=[],coachingSessions=[],ownerId}={}){
 if(ownerId!==LOBO_DEMO_OWNER_ID)return {dog:null,sources:[],coachingProjections:[]};
 const dogRow=personalRecords.find(r=>r.kind==='dog'&&r.id===LOBO_DEMO_MANIFEST.dogId&&isLoboDemoRecord(r,{ownerId}));
 if(!dogRow)return {dog:null,sources:[],coachingProjections:[]};
 const dog={...structuredClone(dogRow.payload),id:dogRow.id,ownerId,...flags};
 const sources=[],coachingProjections=[];
 for(const row of personalRecords){
  if(row.kind!=='ops'||!isLoboDemoRecord(row,{ownerId}))continue;
  const s=row.payload?.dataQuality?.demoSource;
  if(isLoboDemoSource(s)&&s.id===row.id&&s.dogId===dog.id){const source=structuredClone(s);source.dog={id:dog.id,name:dog.name,...flags};source.trace=structuredClone(row.payload.trace||[]);source.events=structuredClone(row.payload.events||[]);source.terrain=row.payload.environment?.type??null;source.weather=row.payload.weatherSnapshot??null;sources.push(source);}
 }
 for(const row of coachingSessions){
  if(!isLoboDemoRecord(row,{ownerId})||row.state&&row.state.ownerId!==ownerId)continue;
  const s=row.state?.demoSource??dog.sessions?.find(s=>s.id===row.id);if(!isLoboDemoSource(s)||s.id!==row.id||s.dogId!==dog.id)continue;
  if(!row.state){const source=structuredClone(s);source.dog={id:dog.id,name:dog.name,...flags};sources.push(source);coachingProjections.push(decorateLoboDemoRecord(row,{ownerId}));continue;}
  const source=structuredClone(s);source.dog={id:dog.id,name:dog.name,...flags};const p=projectLoboDemoSession(row);const points=g=>(g?.segments||[]).flatMap((segment,i)=>segment.map((point,j)=>({space:'wgs84',x:point.longitude,y:point.latitude,timestamp:iso(point.timestamp),accuracy:point.accuracy,...(i>0&&j===0?{breakBefore:true}:{})})));source.trace=points(row.state.search?.gpsSearch);source.referenceTrace=s.referenceTrace?points(row.state.tracer?.gpsPose):null;source.metrics={...(source.trace.length?{distanceM:row.state.search.gpsSearch.distanceM}:{}),...(Object.hasOwn(s.metrics,'durationSeconds')&&p.searchActiveMs!==null?{durationSeconds:p.searchActiveMs/1000}:{})};sources.push(source);coachingProjections.push(p);
 }
 return {dog,sources,coachingProjections};
}
