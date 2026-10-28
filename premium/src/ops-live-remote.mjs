import {projectOpsGpsLive,opsLiveFreshness} from './ops-live-contract.mjs';
import {createOpsLiveQueue} from './ops-live-sync.mjs';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export function opsLiveProjection(r){
 const segments=[];let segment=null;
 for(const p of r.points||[]){if(segment!==p.segmentId){segments.push([]);segment=p.segmentId;}segments.at(-1).push({latitude:p.latitude,longitude:p.longitude,accuracy:p.accuracy,timestamp:Date.parse(p.capturedAt),receivedAt:Date.parse(p.capturedAt)});}
 const m=r.metadata||{};return {sessionId:r.id,sessionType:'ops',role:'ops_trace_observer',roleLabel:'Observateur de trace OPS',readOnly:true,canAct:false,ended:r.closed===true||m.state==='Fin de piste',status:r.closed===true||m.state==='Fin de piste'?'ended':'active',state:m.state,dogName:m.dogName??null,handlerName:m.handlerName??null,events:m.events||[],trackAge:m.trackAge??null,trackingSeconds:m.trackingSeconds??null,distance:r.distanceM,corridor:null,lastPositionAt:Date.parse(r.lastPositionAt),gpsTrack:{provenance:'device-geolocation',phase:r.closed?'finished':'recording',segments,distanceM:r.distanceM},trace:[]};
}
export function createOpsLiveRemote({ownerId,storage,call,locks=globalThis.navigator?.locks,onChange=()=>{}}={}){
 if(!uuid(ownerId)||!storage||typeof call!=='function')throw Error('Identité et stockage OPS requis.');
 const key='piste-v2-ops-live-remote:'+ownerId;let saved={ownerId,missions:{}};
 const raw=storage.getItem(key);if(raw!==null){saved=JSON.parse(raw);if(saved.ownerId!==ownerId||!saved.missions||typeof saved.missions!=='object')throw Error('Stockage OPS illisible : original conservé.');}
 let disposed=false,epoch=0,connection='idle',sessions=[],notices=[],invitations=[],directory=[],directoryLoading=null,projections=new Map(),rawRows=new Map(),refreshing=null;const busy=new Map();
 const save=()=>storage.setItem(key,JSON.stringify(saved));
 const active=()=>{if(disposed)throw Error('Suivi OPS fermé.');};
 const send=async body=>{active();const result=await call(body);active();return result;};
 const view=()=>({connection,sessions:structuredClone(sessions),notifications:structuredClone(notices),invitations:structuredClone(invitations),directory:structuredClone(directory)});
 async function read(id){const result=await send({operation:'head',id});if(!result)throw Object.assign(Error('Accès refusé.'),{status:403});return result;}
 async function readTrack(item,previous=null){
  let result;const retained=previous&&previous.generation===item.generation?previous:null;
  try{result=await send({operation:'read',id:item.id,after:retained?.lastSequence||0,version:item.version});}catch(error){if(error.status!==409)throw error;return readTrack({id:item.id},null);}
  const points=[...(retained?.points||[]),...result.points];let after=points.at(-1)?.sequence||0;
  while(after<result.lastSequence){const page=await send({operation:'read',id:item.id,after,version:result.version});if(!page.points?.length)throw Error('Page GPS incomplète.');points.push(...page.points);after=points.at(-1).sequence;}return {...result,points};
 }
 async function refresh(){if(refreshing)return refreshing;const ticket=++epoch;
  refreshing=(async()=>{try{const list=await send({operation:'list'}),next=new Map(),nextRaw=new Map();for(const item of list){try{const previous=rawRows.get(item.id),row=previous&&previous.generation===item.generation&&previous.version===item.version?previous:await readTrack(item,previous);nextRaw.set(item.id,row);const p=opsLiveProjection(row);p.isOwner=item.isOwner===true||item.ownerId===ownerId||Object.values(saved.missions).some(m=>m.id===item.id);p.ownerId=p.isOwner?ownerId:item.ownerId||null;next.set(item.id,p);}catch(e){if(![401,403].includes(e.status))throw e;}}
   const notifications=await send({operation:'notifications'}),pending=await send({operation:'invitations'});if(!disposed&&ticket===epoch){sessions=list.filter(x=>next.has(x.id));projections=next;rawRows=nextRaw;notices=notifications;invitations=pending;connection='connected';onChange();}
  }catch(e){if(!disposed&&ticket===epoch){connection=[401,403].includes(e.status)?'forbidden':'offline';projections.clear();rawRows.clear();sessions=[];notices=[];onChange();}}finally{refreshing=null;}})();return refreshing;
 }
 async function command(state,type,payload,expected=state.version){
  if(!state.pending){state.pending={operation:'command',id:state.id,commandId:crypto.randomUUID(),expectedVersion:expected,type,payload};save();}
  for(let attempt=0;;attempt++)try{const result=await send(state.pending);state.version=result.version;state.generation=result.generation;state.pending=null;save();return result;}catch(error){if(error.status!==409||attempt>=2)throw error;const latest=await read(state.id);state.version=latest.version;state.pending.expectedVersion=latest.version;save();}
 }
 async function finishBroadcast(missionId){const state=saved.missions[missionId];if(!state?.id||state.closed)return;state.ending=true;save();if(state.pending)await command(state);const latest=await read(state.id);state.version=latest.version;if(!latest.closed)await command(state,'close',{});state.closed=true;state.ending=false;save();}
 async function sync(mission,policy){
  active();let state=saved.missions[mission.id];if(state?.ending)return finishBroadcast(mission.id);
  if(state){state.policy={share_live:policy.share_live===true,notify_observers:policy.notify_observers!==false,projectionOptions:structuredClone(policy.projectionOptions||{})};save();}
  if(!policy.share_live){if(state&&!state.stopped){if(state.pending?.type!=='stop-sharing'){if(state.pending){state.retainedPending=state.pending;state.pending=null;save();}try{state.version=(await read(state.id)).version;}catch(e){if(e.status!==403)throw e;state.stopped=true;if(state.version===-1)state.id=null;save();return;}}await command(state,'stop-sharing',{});state.stopped=true;save();}return;}
  if(mission.status!=='En cours'&&!state)return;
  if(mission.ownerUserId!==ownerId)throw Error('Mission appartenant à un autre compte.');
  const frame=projectOpsGpsLive(mission,policy);if(!frame)return;
  if(state?.closed)return;
  if(!state){state=saved.missions[mission.id]={id:null,version:-1,generation:1,stopped:false,policy:{share_live:true,notify_observers:policy.notify_observers!==false,projectionOptions:structuredClone(policy.projectionOptions||{})}};save();}
  if(state.pending)await command(state);
  if(!state.id||state.stopped){
   const ticket=await send({operation:'prepare-publication',localMissionId:mission.id,...(state.id?{id:state.id}:{})});state.id=ticket.id;save();
   await command(state,'publish',{...ticket,id:undefined,localMissionId:mission.id,options:policy.projectionOptions,notifyObservers:policy.notify_observers,metadata:{state:frame.state==='Fin de piste'?'En cours':frame.state},captureStartedAt:new Date(frame.gpsTrack?.startedAt||Date.now()).toISOString()},ticket.creationExpectedVersion);
   state.stopped=false;state.latest=null;save();
  }
  const queue=createOpsLiveQueue({storage,ownerId,missionId:mission.id});const encoded=JSON.stringify([frame,policy.projectionOptions,policy.notify_observers]);
  if(state.latest!==encoded){queue.append({generation:state.generation,sequence:(state.localSequence||0)+1,frame});state.localSequence=(state.localSequence||0)+1;state.latest=encoded;save();}
  for(const item of queue.list()){
   if(item.generation!==state.generation)continue;
   const current=await read(state.id);if(current.closed){state.closed=true;save();return;}state.version=current.version;
   const points=[];let sequence=0;
   for(const [i,segment] of (item.frame.gpsTrack?.segments||[]).entries())for(const point of segment){sequence++;if(sequence>current.lastSequence)points.push({sequence,segmentId:String(i),latitude:point.latitude,longitude:point.longitude,accuracy:point.accuracy,capturedAt:new Date(point.timestamp).toISOString()});}
   for(let i=0;i<points.length;i+=60)await command(state,'gps-batch',{generation:state.generation,points:points.slice(i,i+60)});
   const f=item.frame,metadata={state:f.state,trackingSeconds:f.trackingSeconds,...(f.dogName?{dogName:f.dogName}:{}),...(f.handlerName?{handlerName:f.handlerName}:{}),...(f.trackAge?{trackAge:f.trackAge}:{}),events:f.events};
   await command(state,'update',{metadata,options:policy.projectionOptions,notifyObservers:policy.notify_observers});queue.acknowledge(item.id);
   if(f.state==='Fin de piste'){state.closed=true;save();break;}
  }
 }
 return {view,refresh,isOwn:id=>sessions.some(s=>s.id===id&&s.isOwner===true)||Object.values(saved.missions).some(m=>m.id===id)||projections.get(id)?.isOwner===true,
  async endBroadcast(missionId){active();const prior=busy.get(missionId);const task=(async()=>{if(prior)await prior.catch(()=>{});if(locks)return locks.request('piste-ops-live:'+ownerId,async()=>{const raw=storage.getItem(key);if(raw){const latest=JSON.parse(raw);if(latest.ownerId!==ownerId)throw Error('Compte différent.');saved=latest;}return finishBroadcast(missionId);});return finishBroadcast(missionId);})();busy.set(missionId,task);try{return await task;}finally{if(busy.get(missionId)===task)busy.delete(missionId);}},storedPolicy:id=>structuredClone(saved.missions[id]?.policy||null),publicationId:id=>saved.missions[id]?.id||id,projection:id=>{const remote=saved.missions[id]?.id||id;return projections.get(remote)||null;},freshness:id=>opsLiveFreshness(projections.get(saved.missions[id]?.id||id)),
  async loadDirectory(){if(directoryLoading)return directoryLoading;directoryLoading=send({operation:'directory'}).then(rows=>{directory=rows;onChange();return rows;}).catch(e=>{directoryLoading=null;throw e;});return directoryLoading;},
  async acceptInvite(id){return send({operation:'accept-invite',id,commandId:crypto.randomUUID()});},
  async revoke(id,userId){const r=await read(id);return send({operation:'command',id,commandId:crypto.randomUUID(),expectedVersion:r.version,type:'revoke',payload:{userId}});},
  async syncMission(mission,policy){if(busy.has(mission.id))return busy.get(mission.id);const task=(async()=>{try{if(locks)return await locks.request('piste-ops-live:'+ownerId,()=>{const latest=storage.getItem(key);if(latest!==null){const parsed=JSON.parse(latest);if(parsed.ownerId!==ownerId||!parsed.missions)throw Error('Stockage OPS invalide.');saved=parsed;}return sync(mission,policy);});if(typeof window!=='undefined')throw Error('Verrouillage multi-onglets OPS indisponible.');return await sync(mission,policy);}catch(e){connection=[401,403].includes(e.status)?'forbidden':'offline';throw e;}})().finally(()=>busy.delete(mission.id));busy.set(mission.id,task);return task;},
  async setHabitual(userId,enabled){if(!uuid(userId))throw Error('Compte réel requis : aucun alias de démonstration accepté.');return send({operation:'habitual',userId,enabled:enabled===true});},
  async invite(id,userId){if(!uuid(userId))throw Error('Compte réel requis.');const r=await read(id);return send({operation:'command',id,commandId:crypto.randomUUID(),expectedVersion:r.version,type:'invite',payload:{recipientId:userId,expiresAt:new Date(Date.now()+3600000).toISOString()}});},
  async join(id,token,expectedVersion){return send({operation:'command',id,commandId:crypto.randomUUID(),expectedVersion,type:'join',payload:{token}});},
  async markRead(id){const r=await read(id);return send({operation:'command',id,commandId:crypto.randomUUID(),expectedVersion:r.version,type:'mark-notification-read',payload:{}});},
  dispose(){disposed=true;epoch++;connection='disconnected';projections.clear();rawRows.clear();sessions=[];notices=[];invitations=[];directory=[];}
 };
}
