import {retrospectiveMetrics,retrospectivePoints} from './operational-retrospective.mjs';
import {selectHistoricalWeather} from './session-weather-history.mjs';
import {LOBO_DEMO_MANIFEST,LOBO_DEMO_OWNER_ID} from './lobo-demo-data.mjs';
// Read-only bridge. Inputs must come from the current account's existing stores
// and the server's already-authorized Coaching projections. Never fetch a peer.
import {debriefView} from './coaching-session-flow.mjs';
import {assessInputQuality} from './jumolf-quality.mjs';
import {buildGpsCorridor} from './coaching-corridor-model.mjs';
const clone=value=>structuredClone(value),number=value=>Number.isFinite(value)?value:null;
const iso=value=>Number.isFinite(value)?new Date(value).toISOString():typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const points=gps=>gps?.provenance==='device-geolocation'?(gps.segments||[]).flatMap((segment,i)=>segment.filter(p=>Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180).map((p,j)=>({space:'wgs84',x:p.longitude,y:p.latitude,timestamp:iso(p.timestamp),...(i>0&&j===0?{breakBefore:true}:{}),...(Number.isFinite(p.accuracy)?{accuracy:p.accuracy}:{})}))):[];
function weatherProjection(snapshot){
 const w=snapshot?.weather||snapshot;if(!w||typeof w!=='object'||w.demo||w.synthetic)return null;
 const temperature=number(w.temperature_c??w.temperature),humidity=number(w.humidity_pct??w.humidity),speed=number(w.wind_speed_kmh),direction=number(w.wind_direction_deg);
 if([temperature,humidity,speed,direction].every(v=>v===null))return null;
 return {temperature,humidity,label:w.label||[temperature===null?null:temperature+' °C',humidity===null?null:humidity+' %'].filter(Boolean).join(' · '),provenance:w.manual?'manual':w.provenance==='measured'?'measured':'estimated',observedAt:iso(w.observedAt),source:w.source||null,stale:w.stale===true,wind:speed===null&&direction===null?null:{speed,direction,provenance:w.manual?'manual':'estimated'}};
}
const events=items=>(items||[]).map(item=>({type:String(item.type||item.label||'Événement'),...(item.id?{id:String(item.id)}:{}),timestamp:iso(item.timestamp??item.at??item.occurredAt??item.timeLabel),...(item.point?.space==='wgs84'?{point:{space:'wgs84',x:item.point.x,y:item.point.y}}:{})}));
const plannedPoints=g=>g?.provenance==='prepared-geographic'&&Array.isArray(g.segments)?g.segments.flatMap((segment,i)=>segment.flatMap((p,j)=>Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180?[{space:'wgs84',x:p.longitude,y:p.latitude,...(i>0&&j===0?{breakBefore:true}:{})}]:[])):null;
const empty=()=>({dogs:[],sessions:[],tracks:[],operational:[]});
export function buildAccountAnalysisSources({ownerId,localOwnerId,sharedOwnerId,tracksOwnerId,dogs=[],coachingRecords=[],sharedSessions=[],dogIds={},operationalMissions=[],tracks=[],weatherForMission=null}={}){
 if(!ownerId)return empty();
 const fictionalIds=new Set([...LOBO_DEMO_MANIFEST.opsIds,...LOBO_DEMO_MANIFEST.coachingIds]);const loboDemo=id=>ownerId===LOBO_DEMO_OWNER_ID&&fictionalIds.has(String(id||'').replace(/^cloud-/,''));
 const safeDogs=dogs.filter(d=>(ownerId!==LOBO_DEMO_OWNER_ID||d.id!==LOBO_DEMO_MANIFEST.dogId)&&!d.isDemonstration&&!d.demo&&!d.synthetic&&(!d.ownerId||d.ownerId===ownerId)),dogById=new Map(safeDogs.map(d=>[d.id,d]));
 const linked=(id,name)=>dogById.has(id)?{id,name:dogById.get(id).name,breed:dogById.get(id).breed}:name?{name}:null;
 const sessions=new Map();
 if(localOwnerId===ownerId)for(const record of coachingRecords){
  if(record.session?.synthetic||record.session?.demo||!['DEBRIEF','ARCHIVED'].includes(record.searchState?.phase)||(!record.searchState.gpsSearch&&!record.tracerState?.gpsPose))continue;
  const v=debriefView(record.searchState,record.preparationState,record.tracerState),s=record.session,search=v.map?.gpsSearch,pose=v.map?.gpsPose;
  const trace=points(search),referenceTrace=points(pose),dog=linked(s.dog?.id,s.dog?.name);
  sessions.set(s.id,{id:'coaching:'+s.id,kind:'coaching',mode:s.mode||null,handlerId:s.roles?.driver&&!['self','mock-current-user'].includes(s.roles.driver)?s.roles.driver:null,title:s.title||s.code||'Coaching',status:record.searchState.phase,dog,dogId:dog?.id||null,trace:trace.length?trace:null,referenceTrace:referenceTrace.length?referenceTrace:null,startedAt:iso(search?.startedAt),finishedAt:iso(search?.endedAt),terrain:s.terrain||null,metrics:{...(search?{distanceM:number(search.distanceM),durationSeconds:number(v.summary.searchSeconds)}:{})},trackAge:{seconds:number(v.temporal.trackAgeAtSearchStart),provenance:'calculated'},events:events(v.events),weather:null,provenance:{trace:trace.length?'phone_gps':null,referenceTrace:referenceTrace.length?'phone_gps':null,distance:search?'calculated':null}});
 }
 if(sharedOwnerId===ownerId)for(const p of sharedSessions){
  if(loboDemo(p.id)||p.synthetic||p.demo||!['DEBRIEF','ARCHIVED'].includes(p.phase))continue;
  const trace=points(p.search),referenceTrace=points(p.pose),dog=linked(dogIds[p.id],p.dog);
  sessions.set(p.id,{plannedReferenceTrace:plannedPoints(p.reference?.geometry),id:'coaching:'+p.id,kind:'coaching',mode:p.mode||null,handlerId:p.team?.find(m=>m.role==='driver')?.id||null,title:p.title||'Coaching · '+(p.dog||'Chien indisponible'),status:p.phase,dog,dogId:dog?.id||null,trace:trace.length?trace:null,referenceTrace:referenceTrace.length?referenceTrace:null,startedAt:iso(p.search?.startedAt),finishedAt:iso(p.search?.endedAt),terrain:p.terrain||null,weather:weatherProjection(selectHistoricalWeather(p.weatherHistory,p.search?.endedAt||p.pose?.endedAt)||p.weatherSnapshot),metrics:{...(p.search?{distanceM:number(p.search.distanceM)}:{}),...(Number.isFinite(p.searchActiveMs)?{durationSeconds:p.searchActiveMs/1000}:{})},trackAge:{seconds:Number.isFinite(p.pose?.endedAt)&&Number.isFinite(p.search?.startedAt)?Math.max(0,(p.search.startedAt-p.pose.endedAt)/1000):null,provenance:'calculated'},events:events(p.events),provenance:{trace:trace.length?'phone_gps':null,referenceTrace:referenceTrace.length?'phone_gps':null,distance:p.search?'calculated':null}});
 }
 const operational=[];
 for(const m of operationalMissions){
  if(loboDemo(m.id)||m.ownerUserId!==ownerId||!['Terminée','Archivée'].includes(m.status)||m.demo||m.synthetic)continue;
  const imported=retrospectiveMetrics(m.retrospective),trace=imported?retrospectivePoints(m.retrospective):points(m.gpsTrack),dog=linked(m.dogId||m.dog?.id,m.dog?.name),weather=weatherProjection(m.weatherSnapshot||weatherForMission?.(m));
  const rawWeather=(m.weatherSnapshot||weatherForMission?.(m))?.weather;
  const end=imported?.finishedAt||m.gpsTrack?.endedAt||m.finishedAt;
  const corridor=m.olfactoryCorridorEnabled&&m.referenceGpsPose&&rawWeather&&Number.isFinite(end)?buildGpsCorridor({pose:m.referenceGpsPose,weather:rawWeather,now:end,allowed:true}):null;
  const geometry=corridor?.features?.flatMap(f=>(f.geometry?.outerBoundary||[]).map(p=>({space:'wgs84',x:p.lon,y:p.lat})))||[];
  operational.push({id:'ops:'+m.id,kind:'operational',handlerId:m.handler?.id&&m.handler.id!=='mock-current-user'?m.handler.id:null,status:m.status,dog,dogId:dog?.id||null,trace:trace.length?trace:null,trackingStartedAt:iso(imported?.startedAt||m.gpsTrack?.startedAt||m.trackingStartedAt),finishedAt:iso(end),trackingElapsedMs:m.gpsTrack?.provenance==='device-geolocation'?number(m.trackingElapsedMs):null,distanceM:imported?imported.distanceM:trace.length?number(m.gpsTrack.distanceM):null,time:{trackAgeAtStart:m.time?.trackAgeAtStart?{seconds:number(m.time.trackAgeAtStart.seconds),label:m.time.trackAgeAtStart.label}:null},context:{environment:m.context?.environmentType||m.context?.environment||m.context?.terrain||null},events:(m.gpsTrack?.provenance==='device-geolocation'?events(m.events):[]).map(e=>({...e,shareable:true})),weather,wind:weather?.wind||null,corridor:geometry.length?{geometry,provenance:'estimated'}:null,provenance:{trace:trace.length?(imported?'gpx_import':'phone_gps'):null,distance:trace.length?'calculated':null,weather:weather?.provenance||null}});
 }
 return {dogs:safeDogs,sessions:[...sessions.values()].map(s=>({...s,dataOrigin:'account',synthetic:false})),operational:operational.map(s=>({...s,dataOrigin:'account',synthetic:false})),tracks:tracks.filter(t=>(t.ownerId===ownerId||t.ownerId==='self'&&tracksOwnerId===ownerId)&&!t.demo&&!t.synthetic&&(t.geometry?.points||t.points)?.every(p=>p.space==='wgs84')).map(t=>({...t,geometry:t.geometry?.points||t.points,provenance:t.source==='gpx'?'gpx_import':'manual'}))};
}
export function buildAccountScientificDataset(sources={},ownerId){
 const sessions=[...(sources.sessions||[]),...(sources.operational||[])].map(s=>{
  const quality=assessInputQuality(s),age=s.trackAge?.seconds??null,startedAt=s.startedAt||s.finishedAt||'';
  const metrics={...s.metrics,speedMps:Number.isFinite(s.metrics?.distanceM)&&s.metrics?.durationSeconds>0?s.metrics.distanceM/s.metrics.durationSeconds:null};
  const count=type=>s.events?.length?s.events.filter(e=>String(e.type).toLowerCase().includes(type)).length:null;
  return {...clone(s),source:'account',synthetic:false,kind:s.kind==='operational'?'operational':'training',type:s.kind,startedAt,phase:{id:'recorded',label:'Session enregistrée'},environment:{primary:s.terrain||'Indisponible',label:s.terrain||'Indisponible'},surface:null,scentPollution:{level:null},difficulty:{level:null,score:null},trackAge:{seconds:age,label:age===null?'Indisponible':age+' s',status:age===null?'unknown':'available',band:age===null?'unknown':age<3600?'under_1h':age<10800?'1_3h':'over_3h',provenance:s.trackAge?.provenance||null},weather:s.weather?{...s.weather,temperatureC:s.weather.temperature??null,humidityPercent:s.weather.humidity??null,windSpeedKmh:s.weather.wind?.speed??s.wind?.speed??null,windDirection:s.weather.wind?.direction??s.wind?.direction??null}:null,metrics,distanceKm:Number.isFinite(metrics.distanceM)?metrics.distanceM/1000:null,durationMinutes:Number.isFinite(metrics.durationSeconds)?metrics.durationSeconds/60:null,trace:s.trace||[],referenceTrace:s.referenceTrace||null,ruptures:count('rupture'),resumptions:count('reprise'),resumptionDelaySeconds:null,confidence:null,result:s.status||null,quality,benchmark_session:false,blind_analysis_available:false};
 }).sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
 return {mode:'account',ownerId,sessions,period:{start:sessions[0]?.startedAt||null,end:sessions.at(-1)?.startedAt||null}};
}
