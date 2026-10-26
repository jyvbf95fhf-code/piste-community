// Explicitly scoped, device-local maintenance. This module never contacts a server.
export const ACCOUNT_TEST_RESET_TARGET=Object.freeze({ownerId:'eeca6271-b459-443b-8c2f-46ce20215c8a',email:'seb.lobstein@gmail.com'});
const issued=new WeakMap();
const kinds=new Set(['dog','track','ops','session-dog-link']);
const prefixes=['piste-v2-dogs:','piste-v2-prepared-tracks:','piste.v2.coaching-history.v1:','piste.v2.coaching-preparation.v1:','piste-v2-ops-gps:','piste-v2-ops-cloud:','piste-v2-session-dogs:'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const verified=o=>o.ownerVerified===true&&o.ownerId===ACCOUNT_TEST_RESET_TARGET.ownerId&&o.email===ACCOUNT_TEST_RESET_TARGET.email;
const digest=async raw=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(b=>b.toString(16).padStart(2,'0')).join('');
function localEligible(key,raw,ownerId){
 try{const value=JSON.parse(raw);if(value?.ownerId!==ownerId)return false;
  if(prefixes.some(p=>key===p+encodeURIComponent(ownerId)))return true;
  if(key.startsWith('piste-v2-ops-live-3a:')){const tuple=JSON.parse(key.slice('piste-v2-ops-live-3a:'.length));return Array.isArray(tuple)&&tuple.length===2&&tuple[0]===ownerId&&typeof tuple[1]==='string'&&tuple[1]===value.missionId;}
 }catch{}return false;
}
function localSnapshot(storage,ownerId){
 if(!storage||typeof storage.key!=='function')throw Error('Stockage Safari indisponible.');
 const eligible=[],retained=[],keys=Array.from({length:storage.length},(_,i)=>storage.key(i));
 if(keys.some(k=>typeof k!=='string')||new Set(keys).size!==keys.length)throw Error('Inventaire local interrompu.');
 for(const key of keys){const raw=storage.getItem(key);if(raw===null)throw Error('Stockage modifié pendant l’inventaire.');if(localEligible(key,raw,ownerId))eligible.push({key,raw});else retained.push(key);}
 return {eligible,retained};
}
async function openExisting(indexedDB,name){
 if(!indexedDB)return null;
 if(typeof indexedDB.databases==='function'&&!(await indexedDB.databases()).some(d=>d.name===name))return null;
 return new Promise((resolve,reject)=>{let absent=false;const r=indexedDB.open(name);r.onupgradeneeded=()=>{absent=true;r.transaction.abort();};r.onerror=()=>absent?resolve(null):reject(r.error||Error('Journal illisible.'));r.onblocked=()=>reject(Error('Journal occupé.'));r.onsuccess=()=>resolve(r.result);});
}
const journalKey=ownerId=>JSON.stringify(['owner',ownerId]);
function queueOwner(key,ownerId){try{const tuple=JSON.parse(key);return Array.isArray(tuple)&&tuple.length===2&&tuple[0]===ownerId&&typeof tuple[1]==='string'&&tuple[1].length>0;}catch{return false;}}
async function readQueues(indexedDB,ownerId){
 const db=await openExisting(indexedDB,'piste-coaching-remote-v1');if(!db)return [];
 try{return await new Promise((resolve,reject)=>{if(!db.objectStoreNames.contains('queues')){reject(Error('Structure des brouillons inconnue.'));return;}const tx=db.transaction('queues','readonly'),rows=[],r=tx.objectStore('queues').openCursor();r.onsuccess=()=>{const c=r.result;if(c){if(queueOwner(c.key,ownerId)){if(!Array.isArray(c.value)){tx.abort();return;}rows.push({key:c.key,value:c.value});}c.continue();}};tx.oncomplete=()=>resolve(rows);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Brouillons illisibles.'));});}finally{db.close();}
}
async function removeQueues(indexedDB,ownerId,expected){
 if(!expected.length)return;
 const db=await openExisting(indexedDB,'piste-coaching-remote-v1');if(!db)throw Error('Brouillons modifiés depuis la sauvegarde.');
 try{await new Promise((resolve,reject)=>{const tx=db.transaction('queues','readwrite'),store=tx.objectStore('queues'),rows=[],r=store.openCursor();let cause;r.onsuccess=()=>{const c=r.result;if(c){if(queueOwner(c.key,ownerId))rows.push({key:c.key,value:c.value});c.continue();return;}if(!same(rows,expected)){cause=Error('Brouillons modifiés depuis la sauvegarde.');tx.abort();return;}for(const row of rows)store.delete(row.key);};tx.oncomplete=resolve;tx.onerror=()=>reject(cause||tx.error);tx.onabort=()=>reject(cause||tx.error||Error('Suppression des brouillons interrompue.'));});}finally{db.close();}
}
async function readJournal(indexedDB,ownerId){
 const db=await openExisting(indexedDB,'piste-v2-persistence-v1');if(!db)return null;
 try{return await new Promise((resolve,reject)=>{const names=['records','commands','identities'];if(names.some(n=>!db.objectStoreNames.contains(n))){reject(Error('Structure du journal inconnue.'));return;}const tx=db.transaction(names,'readonly'),snapshot={};for(const n of names){const r=tx.objectStore(n).get(journalKey(ownerId));r.onsuccess=()=>{if(r.result!==undefined)snapshot[n]=r.result;};}tx.oncomplete=()=>resolve(snapshot);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Lecture interrompue.'));});}finally{db.close();}
}
function journalPlan(snapshot,ownerId){
 if(!snapshot||!Object.keys(snapshot).length)return {records:0,commands:0,next:snapshot};
 if(snapshot.identities?.ownerId!==ownerId||!snapshot.records||typeof snapshot.records!=='object'||Array.isArray(snapshot.records)||!Array.isArray(snapshot.commands))throw Error('Propriétaire du journal non vérifiable.');
 const records=Object.entries(snapshot.records).filter(([,r])=>!kinds.has(r?.kind)),commands=snapshot.commands.filter(c=>!kinds.has(c?.kind));
 return {records:Object.keys(snapshot.records).length-records.length,commands:snapshot.commands.length-commands.length,next:{...snapshot,records:Object.fromEntries(records),commands}};
}
async function writeJournal(indexedDB,ownerId,before,next){
 if(same(before,next))return;
 const db=await openExisting(indexedDB,'piste-v2-persistence-v1');if(!db)throw Error('Journal modifié depuis la sauvegarde.');
 try{await new Promise((resolve,reject)=>{const names=['records','commands','identities'],tx=db.transaction(names,'readwrite'),current={};let left=names.length,cause;
 for(const n of names){const r=tx.objectStore(n).get(journalKey(ownerId));r.onsuccess=()=>{if(r.result!==undefined)current[n]=r.result;if(--left===0){if(!same(current,before)){cause=Error('Journal modifié depuis la sauvegarde.');tx.abort();return;}tx.objectStore('records').put(next.records,journalKey(ownerId));tx.objectStore('commands').put(next.commands,journalKey(ownerId));}};}
 tx.oncomplete=resolve;tx.onerror=()=>reject(cause||tx.error);tx.onabort=()=>reject(cause||tx.error||Error('Réinitialisation interrompue.'));});}finally{db.close();}
}
/** Read only. Export backupJson and verify its download before calling reset. */
export async function inventoryAccountTestData(options={}){
 try{if(!verified(options))throw Error('Compte autorisé non vérifié.');const {ownerId,email}=options,storage=options.storage??globalThis.localStorage,indexedDB=options.indexedDB===undefined?globalThis.indexedDB:options.indexedDB;
 const localStorage=localSnapshot(storage,ownerId),journal=await readJournal(indexedDB,ownerId),queues=await readQueues(indexedDB,ownerId),plan=journalPlan(journal,ownerId);
 const backupJson=JSON.stringify({format:'piste-account-test-backup-v1',ownerId,email,createdAt:new Date().toISOString(),localStorage:localStorage.eligible,journal,queues},null,2),checksum=await digest(backupJson);
 const inventory={ok:true,ownerId,email,localStorage,journal:{records:plan.records,commands:plan.commands,available:!!indexedDB},queues:{entries:queues.length},backupJson,backupBytes:new TextEncoder().encode(backupJson).length,checksum};
 issued.set(inventory,{storage,indexedDB,localStorage:structuredClone(localStorage),journal:structuredClone(journal),queues,plan,backupJson,checksum});return inventory;
 }catch(error){return {ok:false,error:error.message};}
}
/** Requires an inventory from this page and an explicitly verified backup export. */
export async function resetAccountTestData(options={}){
 let removedLocalKeys=0,removedJournalRecords=0,removedJournalCommands=0,removedQueueEntries=0;
 try{const {inventory}=options,receipt=issued.get(inventory);if(!verified(options)||(options.backupVerified!==true&&options.discardConfirmed!==true)||!receipt||inventory.ok!==true)throw Error('Compte ou sauvegarde non vérifié.');
 if(inventory.backupJson!==receipt.backupJson||inventory.checksum!==receipt.checksum||await digest(inventory.backupJson)!==receipt.checksum)throw Error('Sauvegarde modifiée.');
 if(options.storage&&options.storage!==receipt.storage||options.indexedDB!==undefined&&options.indexedDB!==receipt.indexedDB)throw Error('Stockage différent de l’inventaire.');
 const current=localSnapshot(receipt.storage,options.ownerId);if(!same(current.eligible,receipt.localStorage.eligible)||!same(await readJournal(receipt.indexedDB,options.ownerId),receipt.journal)||!same(await readQueues(receipt.indexedDB,options.ownerId),receipt.queues))throw Error('Données modifiées depuis la sauvegarde. Refaire l’export.');
 await writeJournal(receipt.indexedDB,options.ownerId,receipt.journal,receipt.plan.next);removedJournalRecords=receipt.plan.records;removedJournalCommands=receipt.plan.commands;
 await removeQueues(receipt.indexedDB,options.ownerId,receipt.queues);removedQueueEntries=receipt.queues.length;
 for(const {key,raw} of receipt.localStorage.eligible){if(receipt.storage.getItem(key)!==raw)throw Error('Données modifiées pendant la réinitialisation.');receipt.storage.removeItem(key);if(receipt.storage.getItem(key)!==null)throw Error('Suppression locale refusée.');removedLocalKeys++;}
 issued.delete(inventory);return {ok:true,removedLocalKeys,removedJournalRecords,removedJournalCommands,removedQueueEntries};
 }catch(error){return {ok:false,error:error.message,removedLocalKeys,removedJournalRecords,removedJournalCommands,removedQueueEntries,partial:removedLocalKeys+removedJournalRecords+removedJournalCommands+removedQueueEntries>0};}
}
