import {isProtectedDog} from './dog-selection.mjs';
import {isProtectedSessionId} from './session-removal.mjs';
// Existing personal-data remove contract; never a Coaching delete fallback.
export async function removeAccountRecord({kind,id,ownerId,getOwnerId,repository,journal,expectedRevision=null}){
 if(!['dog','ops'].includes(kind)||!ownerId||!id)throw Error('Suppression personnelle indisponible.');
 if(kind==='dog'?isProtectedDog({id}):isProtectedSessionId(id))throw Error('La démonstration LOBO est protégée.');
 const active=()=>{if(getOwnerId()!==ownerId)throw Error('Le compte a changé.');};active();
 const pending=[...await journal.pending(),...await journal.conflicts()];active();
 if(pending.some(c=>c.kind===kind&&c.id===id))throw Error('Une synchronisation de cet élément est en attente. Terminez-la avant de supprimer.');
 const record=await repository.read({kind,id});active();if(!record||record.deletedAt)return {alreadyRemoved:true};
 if(record.kind!==kind||record.id!==id||expectedRevision!==null&&record.revision!==expectedRevision)throw Error('Le dossier a changé. Actualisez avant de supprimer.');
 const result=await repository.remove({kind,id,expectedRevision:record.revision,commandId:crypto.randomUUID()});active();
 if(result?.id!==id||result.kind!==kind||!result.deletedAt)throw Error('Suppression non confirmée par le serveur.');
 return {record:result};
}
