import {PERSISTENCE_KINDS,validatePersistenceRecord} from './persistence-contract.mjs';
const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function createPersistenceSync({ownerId,journal,repository,onStatus=()=>{}}={}){
 if(!ownerId||!journal||!repository)throw Error('Compte et dépôt de sauvegarde requis.');
 let disposed=false,inflight=null;
 const active=()=>{if(disposed)throw Error('Synchronisation fermée.');};
 return {
  flush(){active();if(inflight)return inflight;
   inflight=(async()=>{try{for(;;){
    if(disposed)return;const command=(await journal.pending())[0];if(!command)return;
    if(disposed)return;
    try{const record=validatePersistenceRecord(await repository[command.operation](command));if(disposed)return;
     if(record.id!==command.id||record.kind!==command.kind||record.revision<=command.expectedRevision)throw Error('Accusé de sauvegarde incompatible.');
     if(command.payload?.trainingMemory&&canonical(command.payload.trainingMemory)!==canonical(record.payload.trainingMemory))throw Error('Sauvegarde pédagogique incomplète : préparation locale conservée.');
     await journal.acknowledge({commandId:command.commandId,record});if(!disposed)onStatus({state:'acknowledged',id:record.id});
    }catch(error){if(disposed)return;if(error.status===409){await journal.markConflict(command);if(!disposed)onStatus({state:'conflict',id:command.id});}else throw error;}
   }}catch(error){if(!disposed)onStatus({state:'error',message:error.message});throw error;}finally{inflight=null;}})();return inflight;
  },
  async list(kind){active();if(!PERSISTENCE_KINDS.includes(kind))throw Error('Domaine invalide.');const records=[],seen=new Set();let cursor=null;
   do{const page=await repository.list({kind,cursor});active();if(!Array.isArray(page?.records)||page.cursor!==null&&typeof page.cursor!=='string')throw Error('Page invalide.');for(const value of page.records){const row=validatePersistenceRecord(value);if(row.kind!==kind)throw Error('Domaine incompatible.');records.push(row);}cursor=page.cursor;if(cursor){if(seen.has(cursor))throw Error('Pagination circulaire.');seen.add(cursor);}}while(cursor);return records;
  },
  dispose(){disposed=true;}
 };
}
