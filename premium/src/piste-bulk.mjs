// Selection is transient and limited to currently visible results, never hidden pages.
export function createPisteSelection(){
 let scope='',visible=new Map(),selected=new Set();
 const identity=row=>JSON.stringify([row.kind,row.source,row.libraryId||row.id]);
 return {
  reconcile(next,rows){
   if(next!==scope){scope=next;selected.clear();}
   const previous=visible;
   visible=new Map(rows.map(row=>[row.selectionKey||row.id,identity(row)]));
   const byIdentity=new Map([...visible].map(([key,id])=>[id,key]));
   selected=new Set([...selected].map(key=>visible.has(key)?key:byIdentity.get(previous.get(key))).filter(Boolean));
  },
  toggle(id,checked){if(!visible.has(id))return;if(checked)selected.add(id);else selected.delete(id);},
  selectAll(){selected=new Set(visible.keys());},clear(){selected.clear();},size(){return selected.size;},has(id){return selected.has(id);},ids(){return [...selected];}
 };
}
export const pisteKey=r=>r.selectionKey||`${r.kind==='operational'?'ops':r.libraryId?'track':'coaching'}:${r.libraryId||r.id}`;
export function backupPisteLocal(storage,ownerId,key,value){
 if(!storage?.setItem||!ownerId)throw Error('Sauvegarde de sécurité locale indisponible.');
 const name=`piste-v2-removal-backup:${encodeURIComponent(ownerId)}:${encodeURIComponent(key)}`;
 const payload=JSON.stringify({version:1,ownerId,key,savedAt:new Date().toISOString(),value});storage.setItem(name,payload);
 if(storage.getItem(name)!==payload)throw Error('Sauvegarde locale non confirmée.');
}
// A saved training link is explicit provenance; never infer training from a title.
export function classifyPisteSessions(rows,trainingIds=new Set()){
 return rows.map(r=>trainingIds.has(r.id)?{...r,sessionType:r.kind,kind:'training'}:r);
}
