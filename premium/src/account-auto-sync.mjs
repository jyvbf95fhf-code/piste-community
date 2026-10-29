import {isProtectedDog} from './dog-selection.mjs';
import {isProtectedSessionId} from './session-removal.mjs';
import {collectPersistenceCandidates,preparePersistenceCandidate} from './persistence-domain-adapters.mjs';
import {createPersistenceSync} from './persistence-sync.mjs';
import {persistenceFingerprint as fingerprint,mappedPersistencePayload} from './persistence-journal.mjs';
import {createProfileStore} from './profile-store.mjs';
const order=['dog','profile','track','ops','session-dog-link'];
const key=c=>JSON.stringify([c.kind,c.localId]);
const identity=r=>r.kind+':'+r.id;
const demonstration=(kind,id,value={})=>value.isDemonstration===true||value.synthetic===true||value.demo===true||value.dataOrigin==='demo'||kind==='dog'&&isProtectedDog({...value,id})||['ops','session-dog-link'].includes(kind)&&isProtectedSessionId(value.sessionId||value.cloudId||id);
const defaults=fingerprint(createProfileStore().snapshot());
// Account-scoped reconciliation. Local absence never means remote deletion.
export function createAccountAutoSync({ownerId,getOwnerId,journal,repository,getSources,restoreRecord,removeRecord=async()=>{},hasLocal,findLocal=()=>null,canRestore=()=>true,online=()=>globalThis.navigator?.onLine!==false,clock=Date.now,onChange=()=>{},onHydrated=()=>{}}){
 let disposed=false,inflight=null,hydrated=false,lastPull=-Infinity,timer=null,state='pending',pending=0,conflicts=[],errors=[],deferred=0,lastSavedAt=null;
 let mutationEpoch=0,capturedEpoch=-1,resolving=false;
 const opsSaved=new Map(),waitingOps=new Set(),pullErrors=new Map(),deferredRecords=new Set();
 const active=()=>!disposed&&getOwnerId()===ownerId;
 const sync=createPersistenceSync({ownerId,journal,repository});
 const candidates=()=>{const s=getSources();if(!s)return [];return collectPersistenceCandidates({...s,dogs:(s.dogs||[]).filter(d=>!d.isDemonstration),missions:(s.missions||[]).filter(m=>!m.cloudReadOnly&&m.ownerUserId===ownerId)}).filter(c=>!demonstration(c.kind,c.localId,c.value)).sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind));};
 const prepared=c=>preparePersistenceCandidate(c,{ownerId});
 const view=()=>({ownerId,state,pending,conflicts:structuredClone(conflicts),errors:[...errors],deferred,lastSavedAt,busy:resolving||state==='syncing'});
 const emit=()=>{if(active())onChange(view());};
 async function capture(){
  const epoch=mutationEpoch,rows=candidates(),snapshot=await journal.snapshot();if(!active())return;const visible=new Set(rows.map(key));for(const k of waitingOps)if(!visible.has(k))waitingOps.delete(k);
  for(const c of rows){
   if(!active())return;
   try{
    const old=snapshot.records[key(c)];
    if(old?.deletedAt||snapshot.hidden.includes(identity(old||{})))continue;
    if(!old&&c.kind==='profile'&&!hydrated)continue;
    if(!old&&(c.value.cloudId||/^(track-cloud-|cloud-)/.test(c.localId)))continue;
    const input=prepared(c);
    if(c.kind==='ops'&&c.value.trackingState==='active'){
     const previous=opsSaved.get(c.localId),phase=fingerprint([c.value.status,c.value.trackingState,c.value.dogId]);
     if(previous?.phase===phase&&clock()-previous.at<30000){if(fingerprint(await journal.mapPayload(input))!==fingerprint(old?.payload))waitingOps.add(key(c));else waitingOps.delete(key(c));continue;}
    }
    await journal.stageChanged(input);waitingOps.delete(key(c));if(c.kind==='ops')opsSaved.set(c.localId,{phase:fingerprint([c.value.status,c.value.trackingState,c.value.dogId]),at:clock()});
   }catch(e){errors.push((c.value?.name||c.kind)+' : '+e.message);}
  }
  if(hasLocal)for(const [k,r] of Object.entries(snapshot.records)){
   if(r.kind==='profile'||r.kind==='session-dog-link'||r.deletedAt||snapshot.hidden.includes(identity(r)))continue;
   const localId=JSON.parse(k)[1];if(!hasLocal(r.kind,localId))await journal.hide(r);
  }
  capturedEpoch=epoch;
 }
 async function restore(r,guard=()=>{}){
  const resolveDog=async id=>{const local=await journal.localId({kind:'dog',id});const row=local?await journal.lookup({kind:'dog',localId:local}):null;if(row?.deletedAt)throw Error('Le chien associé a été supprimé du compte.');if(!active())throw Error('Compte changé.');if(!local)throw Error('Le chien associé doit être récupéré avant cet élément.');return local;};
  return journal.restoreRecord({record:r,restore:async known=>{if(!active())throw Error('Compte changé.');guard();if(r.deletedAt){await removeRecord(r,known);return known||r.id;}return restoreRecord(r,known,resolveDog,guard);}});
 }
 async function pull(){
  let restored=0;
  for(const kind of order){
   const records=await sync.list(kind);if(!active())return;const ids=new Set(records.map(identity));for(const id of [...pullErrors.keys()])if(id.startsWith(kind+':')&&!ids.has(id))pullErrors.delete(id);for(const id of deferredRecords)if(id.startsWith(kind+':')&&!ids.has(id))deferredRecords.delete(id);
   for(const r of records){
    if(!active())return;if(demonstration(r.kind,r.id,r.payload))continue;
    try{
     let snapshot=await journal.snapshot();if(snapshot.hidden.includes(identity(r))){pullErrors.delete(identity(r));deferredRecords.delete(identity(r));continue;}
     const entry=Object.entries(snapshot.records).find(([,v])=>v.kind===r.kind&&v.id===r.id);
     if(snapshot.commands.some(c=>c.kind===r.kind&&c.id===r.id))continue;
     if(entry&&entry[1].revision===r.revision){pullErrors.delete(identity(r));deferredRecords.delete(identity(r));continue;}
     if(!canRestore(r,entry?JSON.parse(entry[0])[1]:null)){deferredRecords.add(identity(r));continue;}
     const rows=candidates();
     const localId=entry?JSON.parse(entry[0])[1]:findLocal(r);
     const local=rows.find(c=>c.kind===kind&&(c.localId===localId||(kind==='profile'&&c.localId==='self')));
     if(!entry&&local&&!(kind==='profile'&&fingerprint(prepared(local).payload)===defaults)){
      await journal.adopt({localId:local.localId,record:r});
      const payload=await journal.mapPayload(prepared(local));
      if(fingerprint(payload)!==fingerprint(r.payload)){
       const c=await journal.stageChanged(prepared(local));
       if(c&&(!local.value.cloudRevision||local.value.cloudRevision!==r.revision))await journal.markConflict(c);
      }
      continue;
     }
     if(entry&&local){const payload=mappedPersistencePayload(local.kind,prepared(local).payload,snapshot.records,ownerId);if(fingerprint(payload)!==fingerprint(entry[1].payload)){const c=await journal.stageChanged(prepared(local));if(c)await journal.markConflict(c);continue;}}
     if(entry&&hasLocal&&!hasLocal(kind,localId)){await journal.hide(r);continue;}
     const observed=local?fingerprint(prepared(local).payload):null;
     const guard=()=>{if(!active())throw Error('Compte changé.');if(entry&&hasLocal&&!hasLocal(kind,localId))throw Error('Copie locale retirée pendant la récupération.');if(observed!==null){const current=candidates().find(c=>c.kind===kind&&c.localId===local.localId);if(!current||fingerprint(prepared(current).payload)!==observed)throw Error('Modification locale conservée pendant la récupération.');}};
     await restore(r,guard);pullErrors.delete(identity(r));deferredRecords.delete(identity(r));restored++;
    }catch(e){pullErrors.set(identity(r),kind+' : '+e.message);}
   }
  }
  lastPull=clock();hydrated=true;if(restored&&active())onHydrated(restored);
 }
 async function refreshState(){
  if(!active())return;const s=await journal.snapshot();if(!active())return;
  pending=s.commands.length+waitingOps.size+(mutationEpoch!==capturedEpoch?1:0);deferred=deferredRecords.size;errors=[...new Set([...errors,...pullErrors.values()])];conflicts=s.commands.filter(c=>c.conflict).map(c=>({kind:c.kind,id:c.id,operation:c.operation}));
  conflicts=[...new Map(conflicts.map(c=>[identity(c),c])).values()];
  state=conflicts.length?'conflict':errors.length?'error':!online()?'offline':pending?'pending':deferred?'deferred':'online';
  if(state==='online')lastSavedAt=clock();emit();
 }
 async function cycle({forcePull=false}={}){
  if(!active())return view();if(inflight)return inflight;
  inflight=(async()=>{errors=[];deferred=0;state='pending';
   try{await capture();if(!active())return;
    if(online()){
     state='syncing';emit();await sync.flush();if(!active())return;
     if(forcePull||clock()-lastPull>=60000)await pull();if(!active())return;
     if(hydrated){await capture();if(active())await sync.flush();}
    }
   }catch(e){if(active())errors.push(e.message);}
   finally{if(active())await refreshState();}
   return view();
  })().finally(()=>{inflight=null;});return inflight;
 }
 return {view,cycle,
  schedule({changed=false}={}){if(!active())return;if(changed){mutationEpoch++;if(state!=='conflict')state='pending';emit();}if(timer)return;timer=setTimeout(()=>{timer=null;void cycle();},500);},
  async resolve({kind,id,choice}){
   if(!active()||resolving)return;resolving=true;try{if(inflight)await inflight;state='syncing';emit();const record=await repository.read({kind,id});if(!active())return;if(!record)throw Error('Version en ligne indisponible.');
   const s=await journal.snapshot(),entry=Object.entries(s.records).find(([,v])=>v.kind===kind&&v.id===id);if(!entry)throw Error('Conflit indisponible.');const localId=JSON.parse(entry[0])[1];
   if(choice==='local'){
    const local=candidates().find(c=>c.kind===kind&&c.localId===localId),command=s.commands.filter(c=>c.kind===kind&&c.id===id).at(-1);
    const payload=local?await journal.mapPayload(prepared(local)):command?.payload;if(!payload)throw Error('Version locale indisponible.');
    await journal.resolveLocal({record,kind,localId,payload,operation:command?.operation||'put'});
   }else if(choice==='remote'){
    if(!canRestore(record,localId))throw Error('Fermez le formulaire ou la séance terrain avant de récupérer la version en ligne.');
    await journal.resolveRemote({record,restore:async known=>{if(!active())throw Error('Compte changé.');if(record.deletedAt){await removeRecord(record,known);return known||record.id;}return restoreRecord(record,known,async dogId=>{const id=await journal.localId({kind:'dog',id:dogId});if(!id)throw Error('Chien associé indisponible.');return id;});}});
    if(active())onHydrated(1);
   }else throw Error('Choix de version invalide.');
   lastPull=-Infinity;return await cycle({forcePull:true});}catch(e){if(active())errors.push(e.message);throw e;}finally{resolving=false;if(active())await refreshState();}
  },
  dispose(){disposed=true;if(timer)clearTimeout(timer);sync.dispose();repository.dispose?.();journal.dispose();}
 };
}
