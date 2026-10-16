import {sanitizeOpsLiveFrame,opsLiveFreshness} from './ops-live-contract.mjs';
// Inject a transactional/durable adapter at integration time. This localStorage
// preparation supports one writer per account/mission; multi-tab locking is 3C.
export function createOpsLiveQueue({storage,ownerId,missionId,idFactory=()=>crypto.randomUUID()}={}){
 if(!storage||!ownerId||!missionId)throw Error('Stockage, compte et mission requis.');
 const key='piste-v2-ops-live-3a:'+JSON.stringify([ownerId,missionId]);let items=[];
 const validate=item=>{if(typeof item.id!=='string'||!item.id||!Number.isSafeInteger(item.generation)||item.generation<1||!Number.isSafeInteger(item.sequence)||item.sequence<1||item.frame?.sessionId!==missionId)throw Error('Lot OPS invalide.');return {id:item.id,generation:item.generation,sequence:item.sequence,frame:sanitizeOpsLiveFrame(item.frame)};};
 try{const raw=storage.getItem(key);if(raw!==null){const saved=JSON.parse(raw);if(saved.version!==1||saved.ownerId!==ownerId||saved.missionId!==missionId||!Array.isArray(saved.items))throw Error();items=saved.items.map(validate);if(new Set(items.map(x=>x.id)).size!==items.length)throw Error();}}catch{throw Error('Stockage OPS Live illisible : original conservé.');}
 const save=next=>{storage.setItem(key,JSON.stringify({version:1,ownerId,missionId,items:next}));items=next;};
 return {append(input){const item=validate({...input,id:idFactory()});save([...items,item]);return item.id;},list(){return structuredClone(items);},acknowledge(id){save(items.filter(i=>i.id!==id));}};
}
// No endpoint, Auth client, global fetch, timer or sensor: future wiring must
// explicitly inject an authenticated request function. Tests use only a simulator.
export function createOpsLiveClient({request,queue=null,clock=Date.now}={}){
 if(typeof request!=='function')throw Error('Transport OPS explicite requis.');
 let projection=null,version=-1,generation=null,connection='idle',disposed=false,epoch=0,flushing=null;
 const view=()=>({projection:projection?structuredClone(projection):null,version,generation,connection,freshness:opsLiveFreshness(projection,clock()),pending:queue?.list().length||0,retained:generation===null?0:(queue?.list().filter(item=>item.generation!==generation).length||0)});
 const accept=(reply,ticket)=>{if(disposed||ticket!==epoch)return;if(!Number.isSafeInteger(reply?.version)||reply.version<0)throw Error('Version OPS invalide.');if(reply.version<version){connection='connected';return;}const next=sanitizeOpsLiveFrame(reply.projection);projection=next;version=reply.version;generation=reply.generation;connection='connected';};
 function failed(error,ticket){if(disposed||ticket!==epoch)return;if([401,403].includes(error.status)){projection=null;connection='forbidden';}else connection='offline';}
 async function refresh(){if(disposed)throw Error('Connexion OPS fermée.');const ticket=++epoch;connection='connecting';try{const reply=await request({operation:'read'});accept(reply,ticket);return view();}catch(e){failed(e,ticket);throw e;}}
 async function flush(){
  if(flushing)return flushing;if(disposed)throw Error('Connexion OPS fermée.');
  flushing=(async()=>{if(!queue||!queue.list().length)return refresh();
   for(const item of queue.list()){
    await refresh();if(disposed)throw Error('Connexion OPS fermée.');
    if(item.generation!==generation)continue; // Retain obsolete batches locally; never replay into another publication.
    const ticket=epoch;
    try{const reply=await request({operation:'command',command:{id:item.id,expectedVersion:version,type:'update',payload:{generation:item.generation,sequence:item.sequence,frame:item.frame}}});if(disposed||ticket!==epoch)return view();accept(reply,ticket);queue.acknowledge(item.id);}
    catch(e){failed(e,ticket);throw e;}
   }
   return view();
  })().finally(()=>{flushing=null;});return flushing;
 }
 return {view,refresh,flush,disconnect(){disposed=true;epoch++;projection=null;connection='disconnected';}};
}
