import {mock} from './data.mjs';
import {modes} from './coaching.mjs';
import {sessionView,debriefView} from './coaching-session-flow.mjs';
import {preparationView} from './coaching-preparation.mjs';
import {operationalSessionRows} from './operational-views.mjs';
import {formatElapsed,formatTimestamp} from './coaching-time.mjs';

const unavailable='Aucune donnée disponible';
const roleLabels={coach:'Coach',traceur:'Traceur',driver:'Conducteur',observer:'Observateur'};
const statusFor=phase=>['DEBRIEF'].includes(phase)?'Terminée':phase==='ARCHIVED'?'Archivée':'En cours';
const isFinished=status=>['Terminée','Archivée'].includes(status);
const modeLabel=id=>modes.find(mode=>mode.id===id)?.title||unavailable;
const encode=id=>encodeURIComponent(id);

function liveRow(record,currentSessionId){
 const {session,searchState,preparationState,tracerState}=record;
 const phase=searchState?.phase||preparationState?.phase||'PREPARATION';
 const mode=preparationState?.session?.mode||session.mode;
 const viewer=preparationState?preparationView(preparationState):null;
 const accessible=!!viewer?.team?.some(person=>person.id===viewer.viewerId);
 const current=Boolean(currentSessionId&&currentSessionId===session.id);
 const canResume=current&&accessible&&!isFinished(statusFor(phase));
 const dog=session.dog||preparationState?.session?.dog||{};
 return {
  id:session.id,
  href:canResume?'/coaching/session':`/sessions/${encode(session.id)}`,
  title:session.title||`Session ${session.code||session.id}`,
  status:statusFor(phase),phase,
  dogId:dog.id||null,dogName:dog.name||unavailable,
  modeLabel:modeLabel(mode),roleLabel:viewer?.team?.find(person=>person.id===viewer.viewerId)?.roleLabel||unavailable,
  date:session.date||unavailable,
  distance:phase==='DEBRIEF'||phase==='ARCHIVED'?debriefView(searchState,preparationState,tracerState||{}).summary.searchDistance:unavailable,
  duration:phase==='DEBRIEF'||phase==='ARCHIVED'?debriefView(searchState,preparationState,tracerState||{}).summary.searchSeconds+' s · mock':unavailable,
  trackAgeAtSearchStart:phase==='DEBRIEF'||phase==='ARCHIVED'?searchState.trackAgeAtSearchStart??null:null,
  trackAgeLabel:phase==='DEBRIEF'||phase==='ARCHIVED'?searchState.trackAgeAtSearchStart==null?unavailable:formatElapsed(searchState.trackAgeAtSearchStart):null,
  canResume,kind:'coaching'
 };
}

function demoRows(){
 const statusLabel=value=>value==='EN PAUSE'?'En pause':value==='EN PRÉPARATION'?'En préparation':value==='EN COURS'?'En cours':value;
 const active=(mock.activeSessions||[]).map((source,index)=>({id:index===0?'demo:active':index===1?'demo:paused':`demo:active-${index}`,source,status:statusLabel(source.status)}));
 return [...active,{id:'demo:recent',source:mock.recent,status:'Terminée'}].map(({id,source,status})=>({
  id,href:`/sessions/${encode(id)}`,title:source.title,status,
  phase:status==='Terminée'?'DEBRIEF':'PREPARATION',dogId:'nox',dogName:mock.dog.name,
  modeLabel:unavailable,roleLabel:unavailable,date:source.date||unavailable,
  distance:source.distance||unavailable,duration:source.duration||unavailable,
  canResume:false,kind:'summary-demo'
 }));
}

export function sessionListView(catalog,{filter='Toutes',query='',dogId='',currentSessionId='',demoRows:includeDemoRows=true,operationalMissions=[]}={}){
 const records=catalog.list().map(record=>liveRow(record,currentSessionId));
 const rows=[...records,...operationalSessionRows(operationalMissions),...(includeDemoRows?demoRows():[])];
 const normalized=String(query).trim().toLocaleLowerCase('fr');
 return rows.filter(row=>{
  const active=['Brouillon','En cours','En préparation','En pause','À reprendre','À compléter'].includes(row.status);
  const done=isFinished(row.status);
  const matchesFilter=filter==='Toutes'||filter==='En cours'&&active||filter==='Terminées'&&done||filter==='Archivées'&&row.status==='Archivée';
  const matchesQuery=!normalized||[row.title,row.dogName,row.modeLabel,row.roleLabel].join(' ').toLocaleLowerCase('fr').includes(normalized);
  return matchesFilter&&matchesQuery&&(!dogId||row.dogId===dogId);
 });
}

export function homeActiveSessionView(catalog,fallbackRows=[] ,{currentSessionId=''}={}){
 const records=catalog.list();
 if(!records.length)return [...fallbackRows];
 return records.map(record=>liveRow(record,currentSessionId))
  .filter(row=>!isFinished(row.status))
  .map(row=>({
   ...row,
   status:row.phase==='PREPARATION'?'EN PRÉPARATION':row.phase==='LAYING_WAIT'||row.phase==='SEARCH_READY'?'EN PAUSE':'EN COURS',
   terrain:'Forêt',trace:'red'
  }));
}

export function completedSessionHistoryView(catalog,{currentSessionId='',includeDemoRows=true}={}){
 return sessionListView(catalog,{currentSessionId,demoRows:includeDemoRows})
  .filter(row=>isFinished(row.status))
  .map(row=>({...row,replayHref:row.kind==='coaching'?`/sessions/${encode(row.id)}/replay`:null}));
}

export function resolveConsultationRoute(pathname){
 const path=String(pathname||'').replace(/\/+$/,'')||'/';
 if(path==='/sessions')return {type:'session-list'};
 if(path==='/tracks')return {type:'track-list'};
 const match=path.match(/^\/(sessions|tracks)\/([^/]+)(?:\/(replay|debrief))?$/);
 if(!match)return null;
 let id;
 try{id=decodeURIComponent(match[2]);}catch{return null;}
 if(!id||id.includes('/'))return null;
 if(match[1]==='tracks')return match[3]?null:{type:'track-detail',id};
 return {type:match[3]==='replay'?'session-replay':match[3]==='debrief'?'session-debrief':'session-detail',id};
}

export function sessionDetailView(record,{currentSessionId=''}={}){
 if(!record?.session||!record.searchState||!record.preparationState)return null;
 const {session,searchState,preparationState,tracerState={}}=record;
 const phase=searchState.phase;
 const terminal=phase==='DEBRIEF'||phase==='ARCHIVED';
 const status=statusFor(phase),dog=session.dog||preparationState.session?.dog||{};
 const mode=modeLabel(session.mode);
 if(terminal){
  const report=debriefView(searchState,preparationState,tracerState);
  return {id:session.id,title:session.title||`Session ${session.code||session.id}`,status,phase,readOnly:true,mode:report.modeLabel,dog:report.summary.dog,participants:report.summary.participants,creatorRole:roleLabels[session.creatorRole]||unavailable,date:report.summary.searchStartedAt?formatTimestamp(report.summary.searchStartedAt):unavailable,distance:report.summary.searchDistance??unavailable,duration:report.summary.totalSeconds===null?unavailable:`${report.summary.totalSeconds} s · mock`,trackAgeAtSearchStart:report.temporal.trackAgeAtSearchStart,trackAgeLabel:report.temporal.trackAgeAtSearchStart==null?unavailable:formatElapsed(report.temporal.trackAgeAtSearchStart),temporal:report.temporal,observations:report.observations.items||[],poseAvailable:!!report.map?.paths?.some(path=>path.kind==='pose'),searchAvailable:!!report.map?.paths?.some(path=>path.kind==='search'),canResume:false,report};
 }
 const view=sessionView(searchState,preparationState,tracerState);
 const allowed=preparationView(preparationState).team.some(person=>person.id===view.viewerId);
 const current=Boolean(currentSessionId&&currentSessionId===session.id);
 return {id:session.id,title:session.title||`Session ${session.code||session.id}`,status,phase,readOnly:true,mode,dog,participants:view.team.map(person=>({name:person.name,role:person.roleLabel,status:person.status})),creatorRole:roleLabels[session.creatorRole]||unavailable,date:unavailable,distance:unavailable,duration:unavailable,observations:[],poseAvailable:false,searchAvailable:false,canResume:current&&allowed,report:null};
}

export function sessionReplayView(record){
 if(!record?.searchState||!['DEBRIEF','ARCHIVED'].includes(record.searchState.phase))return null;
 const report=debriefView(record.searchState,record.preparationState,record.tracerState||{});
 return {id:record.session.id,title:record.session.title||`Session ${record.session.code||record.session.id}`,status:statusFor(record.searchState.phase),mode:report.modeLabel,map:report.map,temporal:report.temporal,events:report.events.filter(event=>['SEARCH_PAUSED','SEARCH_RESUMED'].includes(event.type)),poseAvailable:!!report.map?.paths?.some(path=>path.kind==='pose'),searchAvailable:!!report.map?.paths?.some(path=>path.kind==='search'),readOnly:true};
}

export function trackListView(libraryItems=[],sessionRecords=[]){
 const prepared=(libraryItems||[]).map(item=>({
  id:`prepared:${item.id}`,libraryId:item.id,name:item.name,kind:item.source==='gpx'?'gpx':'prepared',
  provenance:item.provenance==='copy'?`Copie d’un tracé · ${item.copiedFrom?.kind||'source'}`:item.source==='gpx'?'Import GPX · démonstration':'Préparé manuellement',
  fileName:item.fileName||null,geometryAvailable:Array.isArray(item.geometry?.points)&&item.geometry.points.length>1,
  editable:item.source!=='gpx',sessionId:null,map:null,path:null,points:item.geometry?.points||[]
 }));
 const derived=[];
 for(const record of sessionRecords||[]){
  if(!['DEBRIEF','ARCHIVED'].includes(record.searchState?.phase))continue;
  const replay=sessionReplayView(record);if(!replay?.map)continue;
  for(const path of replay.map.paths||[]){
   if(!['pose','search','reference'].includes(path.kind))continue;
   const archived=record.searchState.phase==='ARCHIVED';
   const traceLabel=path.kind==='pose'?'Tracé de pose':path.kind==='search'?'Tracé de relève':'Tracé préparé utilisé';
   const rawSegments=path.kind==='pose'
    ?(record.preparationState?.session?.productScenario==='external_driver_recorded'?record.searchState?.layingSegments:record.tracerState?.segments)
    :path.kind==='search'?record.searchState?.segments:null;
   // The editor currently models a continuous line. Do not join interrupted segments into invented geometry.
   const sourceSegments=Array.isArray(rawSegments)?rawSegments.filter(segment=>Array.isArray(segment)&&segment.length>=2):[];
   const sourcePoints=sourceSegments.flatMap((segment,segmentIndex)=>segment.map((point,index)=>({id:`${path.kind}-${segmentIndex+1}-${index+1}`,x:point.x,y:point.y,kind:segmentIndex===0&&index===0?'start':segmentIndex===sourceSegments.length-1&&index===segment.length-1?'arrival':'via',...(segmentIndex>0&&index===0?{breakBefore:true}:{})})));
   const copySource=sourcePoints.length>=2?{sessionId:record.session.id,kind:path.kind,points:sourcePoints}:null;
   derived.push({
    id:`session:${record.session.id}:${path.kind}`,name:`${replay.title} · ${traceLabel.toLocaleLowerCase('fr')}`,
    kind:path.kind,provenance:`${archived?'Session archivée · ':''}${traceLabel}${path.kind==='pose'&&record.session.layingRecorder==='driver'?' · enregistrée par le Conducteur':''}`,
    geometryAvailable:Boolean(path.d),editable:false,copySource,sessionId:record.session.id,path,map:replay.map
   });
  }
 }
 return [...prepared,...derived].map(row=>({...row,href:`/tracks/${encode(row.id)}`}));
}

export function trackDetailView(rows,id){return (rows||[]).find(row=>row.id===id)||null;}
