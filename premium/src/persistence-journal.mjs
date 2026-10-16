import {PERSISTENCE_KINDS,validatePersistenceRecord} from './persistence-contract.mjs';
export function indexedPersistenceStorage(indexedDB=globalThis.indexedDB){
 let opened,closed=false;
 const open=()=>opened||=(new Promise((resolve,reject)=>{if(!indexedDB||closed)return reject(Error('Stockage local indisponible.'));const req=indexedDB.open('piste-v2-persistence-v1',1);req.onupgradeneeded=()=>{for(const name of ['records','commands','identities'])req.result.createObjectStore(name);};req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>db.close();if(closed){db.close();reject(Error('Journal fermé.'));}else resolve(db);};}));
 return {async update(key,mutate){const db=await open();if(closed)throw Error('Journal fermé.');return new Promise((resolve,reject)=>{
  const tx=db.transaction(['records','commands','identities'],'readwrite'),state={},names=['records','commands','identities'];let remaining=3,value,cause;
  for(const name of names){const req=tx.objectStore(name).get(key);req.onsuccess=()=>{state[name]=req.result;if(--remaining===0)try{value=mutate(state.identities===undefined?undefined:state);for(const n of names)tx.objectStore(n).put(value[n],key);}catch(error){cause=error;tx.abort();}};}
  tx.oncomplete=()=>resolve(structuredClone(value));tx.onerror=()=>reject(cause||tx.error);tx.onabort=()=>reject(cause||tx.error||Error('Sauvegarde interrompue.'));
 });},close(){closed=true;if(opened)void opened.then(db=>db.close(),()=>{});}};
}
export async function profileIdentity(ownerId){
 const namespace=Uint8Array.from([0x6b,0xa7,0xb8,0x10,0x9d,0xad,0x11,0xd1,0x80,0xb4,0x00,0xc0,0x4f,0xd4,0x30,0xc8]),name=new TextEncoder().encode('piste-v2-private-profile:'+ownerId),input=new Uint8Array(namespace.length+name.length);input.set(namespace);input.set(name,namespace.length);
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-1',input)).slice(0,16);bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;const hex=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function createPersistenceJournal({ownerId,indexedDB=globalThis.indexedDB,storage=indexedPersistenceStorage(indexedDB),locks=globalThis.navigator?.locks}={}){
 if(typeof ownerId!=='string'||!ownerId)throw Error('Compte requis.');const key=JSON.stringify(['owner',ownerId]);let disposed=false;const lockName='piste-v2-personal:'+ownerId;
 const locked=work=>locks?.request?locks.request(lockName,{mode:'exclusive'},work):work();
 const active=()=>{if(disposed)throw Error('Journal fermé.');};
 const change=async fn=>{active();const state=await storage.update(key,s=>{active();s??={records:{},commands:[],identities:{ownerId,installationId:crypto.randomUUID()}};if(s.identities?.ownerId!==ownerId||!s.records||typeof s.records!=='object'||!Array.isArray(s.commands))throw Error('Journal incompatible : données conservées.');fn(s);return s;});active();return state;};
 return {
  async stage({kind,localId,payload,operation='put'}){return locked(async()=>{if(!PERSISTENCE_KINDS.includes(kind)||typeof localId!=='string'||!localId||!['put','remove'].includes(operation)||!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Commande de sauvegarde invalide.');
   const canonicalId=kind==='profile'?await profileIdentity(ownerId):null;let command;await change(s=>{payload=structuredClone(payload);
    const dogField=kind==='profile'?'primary_dog_id':['track','ops','session-dog-link'].includes(kind)?'dogId':null;
    if(dogField&&payload[dogField]){const source=payload[dogField],dog=s.records[JSON.stringify(['dog',source])]||Object.values(s.records).find(r=>r.kind==='dog'&&r.id===source);if(!dog)throw Error('Associez explicitement le chien personnel avant la sauvegarde.');payload[dogField]=dog.id;if(kind==='ops'&&payload.dog)payload.dog={...payload.dog,id:dog.id};}
    const key=JSON.stringify([kind,localId]),old=s.records[key];const row={...old,kind,id:old?.id||canonicalId||crypto.randomUUID(),revision:old?.revision||0,payload:structuredClone(payload)};s.records[key]=row;command={kind,id:row.id,expectedRevision:row.revision,commandId:crypto.randomUUID(),payload:row.payload,operation};s.commands.push(command);});return structuredClone(command);
  });},
  async restoreRecord({record,restore}){active();if(!locks?.request)throw Error('Restauration sécurisée indisponible dans ce navigateur.');const r=validatePersistenceRecord(record);return locked(async()=>{
   const s=await change(()=>{});if(s.commands.some(c=>c.kind===r.kind&&c.id===r.id))throw Error('Modification locale en attente : restauration refusée.');
   const oldKey=Object.keys(s.records).find(k=>s.records[k].kind===r.kind&&s.records[k].id===r.id),known=oldKey?JSON.parse(oldKey)[1]:null;
   active();const localId=await restore(known);active();await change(next=>{next.records[JSON.stringify([r.kind,localId])]={kind:r.kind,id:r.id,revision:r.revision,payload:r.payload};});return localId;
  });},
  async localId({kind,id}){const s=await change(()=>{});const key=Object.keys(s.records).find(k=>s.records[k].kind===kind&&s.records[k].id===id);return key?JSON.parse(key)[1]:null;},
  async adopt({localId,record}){const r=validatePersistenceRecord(record);await change(s=>{if(s.commands.some(c=>c.kind===r.kind&&c.id===r.id))throw Error('Modification locale en attente : restauration refusée.');s.records[JSON.stringify([r.kind,localId])]={kind:r.kind,id:r.id,revision:r.revision,payload:r.payload};});},
  async pending(){const s=await change(()=>{}),blocked=new Set(s.commands.filter(c=>c.conflict).map(c=>c.kind+':'+c.id));return s.commands.filter(c=>!blocked.has(c.kind+':'+c.id));},
  async conflicts(){return (await change(()=>{})).commands.filter(c=>c.conflict);},
  async markConflict(command){await change(s=>{const found=s.commands.find(c=>c.commandId===command.commandId);if(found)found.conflict=true;});},
  async acknowledge({commandId,record}){const checked=validatePersistenceRecord(record);await change(s=>{const command=s.commands.find(c=>c.commandId===commandId);if(!command)return;if(checked.id!==command.id||checked.kind!==command.kind||checked.revision<=command.expectedRevision)throw Error('Accusé incompatible.');s.commands=s.commands.filter(c=>c.commandId!==commandId);for(const c of s.commands)if(c.kind===checked.kind&&c.id===checked.id)c.expectedRevision=checked.revision;for(const row of Object.values(s.records))if(row.id===checked.id&&row.kind===checked.kind)row.revision=checked.revision;});},
  dispose(){disposed=true;storage.close?.();}
 };
}
