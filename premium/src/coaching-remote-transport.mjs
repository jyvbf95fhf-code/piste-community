import {COACHING_REMOTE as config} from './coaching-remote-config.mjs';
export function createCoachingRemoteTransport({client,queue=null,sessionId=null,request=fetch,onProjection=()=>{},onStatus=()=>{}}={}){
 let snapshot=null,channel=null,flushing=null,closed=false;const accept=p=>{if(p&&(!snapshot||p.id!==snapshot.id||p.version>snapshot.version)){snapshot=p;onProjection(structuredClone(p));}return snapshot;};
 async function call(body){if(closed)throw Error('Connexion partagée fermée.');const {data,error}=await client.auth.getSession();if(closed)throw Error('Connexion partagée fermée.');if(error||!data.session)throw Object.assign(Error('Connexion requise.'),{status:401});let response;try{response=await request(config.endpoint,{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});}catch{onStatus('Hors connexion · points conservés sur ce téléphone.');throw Error('Serveur injoignable · réessayez.');}const value=await response.json();if(closed)throw Error('Connexion partagée fermée.');if(!response.ok){if([401,403].includes(response.status)){snapshot=null;onProjection(null);}throw Object.assign(Error(value.error||'Synchronisation impossible.'),{status:response.status});}if(value.projection)accept(value.projection);return value;}
 const read=()=>call({operation:'read',sessionId});
 // A closing command must wait for every batch, including points appended while
 // an earlier upload was in flight. Closed-phase leftovers from older clients
 // remain durable locally; never delete or append them to a frozen server track.
 const closedFor=batch=>batch.kind==='pose'
  ? ['TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING','DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED','LEFT'].includes(snapshot?.phase)
  : batch.kind==='search'&&['DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED','LEFT'].includes(snapshot?.phase);
 async function flush(){
  if(flushing)return flushing;if(!queue)return;
  flushing=(async()=>{
   const retained=new Set();
   for(;;){
    const batches=(await (queue.sealPending?queue.sealPending():queue.listPending())).filter(b=>!retained.has(b.batchId));
    if(!batches.length)break;
    for(const batch of batches){
     let retried=false;
     for(;;){
      await read();
      if(closedFor(batch)){retained.add(batch.batchId);break;}
      try{
       await call({operation:'command',sessionId,commandId:batch.batchId,expectedVersion:snapshot.version,type:'gps-batch',payload:{kind:batch.kind,points:batch.points}});
       await queue.acknowledge(batch.batchId);break;
      }catch(e){if(e.status===409&&!retried){retried=true;continue;}throw e;}
     }
    }
   }
   onStatus(retained.size?'Points tardifs conservés sur cet iPhone · tracé serveur déjà terminé.':'Synchronisé');
  })().finally(()=>{flushing=null;});return flushing;
 }
 return {call,getProjection:read,async sendCommand(type,payload={},{beforeSend}={}){await flush();const commandId=crypto.randomUUID();for(let attempt=0;;attempt++){await read();if(beforeSend?.(snapshot)===false)return {projection:structuredClone(snapshot)};try{return await call({operation:'command',sessionId,commandId,expectedVersion:snapshot.version,type,payload});}catch(error){if(error.status!==409||attempt>=1)throw error;}}},async enqueueGps(batch){if(!queue)throw Error('File GPS absente.');await queue.enqueue(batch);},flush,
 async subscribe(){const user=await client.auth.getUser();if(closed)throw Error('Connexion partagée fermée.');if(user.error||!user.data.user)throw Error('Connexion requise.');channel=client.channel(`coaching:${sessionId}:${user.data.user.id}`,{config:{private:true}}).on('broadcast',{event:'version'},()=>{void read().catch(e=>onStatus(e.message));});channel.subscribe(status=>{if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))onStatus('Suivi direct interrompu · reconnexion nécessaire.');if(status==='SUBSCRIBED')void read().catch(e=>onStatus(e.message));});return ()=>{if(channel)void client.removeChannel(channel);channel=null;};},disconnect(){closed=true;if(channel)void client.removeChannel(channel);channel=null;snapshot=null;onProjection(null);}};
}
