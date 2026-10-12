import {isExitClosure,validSessionControl} from './coaching-session-control.mjs';
import {coachingClosureView} from './coaching-closure-view.mjs';
// Device-local completed Coaching reports. No credentials, remote writes or live recovery.
import {sessionDetailView,sessionReplayView} from './session-views.mjs';
import {DebriefScreen} from './coaching-debrief-screen.mjs';
const terminal=record=>['DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED'].includes(record?.searchState?.phase);
const ownerValid=id=>typeof id==='string'&&id.length>0&&id.trim()===id;
const keyFor=id=>`piste.v2.coaching-history.v1:${encodeURIComponent(id)}`;
function validRecord(record){
 try{
  const {session,searchState,preparationState,tracerState}=record;
  if(!session?.prototype||!/^mock-coaching-[1-9]\d*(?:-.+)?$/.test(session.id)||!terminal(record)||preparationState?.session?.id!==session.id||JSON.stringify(preparationState.session)!==JSON.stringify(session)||!tracerState)return false;
  if(!['normal','simple_blind','full_blind'].includes(session.mode)||!['connected_traceur','self_trace','external_traceur','external_driver_recorded'].includes(session.scenario))return false;
  if(!Array.isArray(session.participants)||!Array.isArray(preparationState.team)||!(Array.isArray(searchState.events)||searchState.phase==='CANCELLED'&&searchState.events===undefined)||!Array.isArray(searchState.segments)||!Array.isArray(tracerState.segments))return false;
  for(const state of [searchState,tracerState])if(!Number.isFinite(state.seconds)||state.seconds<0||!Number.isFinite(state.distance)||state.distance<0)return false;
  if(!validSessionControl(session,searchState.phase))return false;
  if(isExitClosure(searchState.phase)){const v=coachingClosureView(record);return !!v&&v.readonly&&!v.canResume&&searchState.searchTrackingState==='stopped'&&[searchState,tracerState].every(s=>s.segments.every(segment=>Array.isArray(segment)&&segment.length&&segment.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))));}
  const detail=sessionDetailView(record),replay=sessionReplayView(record);
  if(!detail?.readOnly||detail.canResume||!replay?.readOnly)return false;
  for(const tab of ['summary','map','science','observations'])DebriefScreen(searchState,preparationState,tracerState,{tab},{readOnly:true});
  return true;
 }catch{return false;}
}
function validRecords(records){
 return Array.isArray(records)&&records.every(validRecord)&&new Set(records.map(record=>record.session.id)).size===records.length;
}
export function createCoachingHistoryStorage(storage){
 const saved=new Map();
 return Object.freeze({
  check(ownerId){
   try{const key=keyFor(ownerId);return ownerValid(ownerId)&&saved.has(key)&&storage.getItem(key)===saved.get(key)?{ok:true}:{ok:false,reason:'conflict'};}catch{return {ok:false,reason:'storage'};}
  },
  load(ownerId){
   if(!ownerValid(ownerId)||typeof storage?.getItem!=='function')return {ok:false,records:[]};
   try{
    const key=keyFor(ownerId),raw=storage.getItem(key);
    if(raw===null){saved.set(key,null);return {ok:true,records:[]};}
    const data=JSON.parse(raw);
    if(data?.version!==1||data.ownerId!==ownerId||!validRecords(data.records))return {ok:false,records:[]};
    saved.set(key,raw);
    return {ok:true,records:structuredClone(data.records)};
   }catch{return {ok:false,records:[]};}
  },
  save(ownerId,records){
   if(!ownerValid(ownerId)||typeof storage?.setItem!=='function'||typeof storage?.getItem!=='function'||!Array.isArray(records))return {ok:false};
   try{
    const completed=records.filter(terminal);
    if(!validRecords(completed))return {ok:false};
    const key=keyFor(ownerId),payload=JSON.stringify({version:1,ownerId,records:completed});
    const current=storage.getItem(key);
    // Refuse stale-tab and unread/corrupt-history overwrites. Preserve both disk and memory.
    const expected=saved.has(key)?saved.get(key):null;
    if(current!==expected)return {ok:false,reason:'conflict'};
    if(saved.get(key)!==payload){storage.setItem(key,payload);saved.set(key,payload);}
    return {ok:true};
   }catch{return {ok:false};}
  }
 });
}
