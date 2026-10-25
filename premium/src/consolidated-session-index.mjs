import {normalizeTrainingMemory} from './jumolf-training-memory.mjs';
// Read index only. It owns no session transitions, GPS or authorization decisions.
export function createSharedSessionIndex({ownerId,storage=null}={}){
 if(!ownerId)throw Error('Compte requis pour le catalogue partagé.');
 const key='piste-v2-session-dogs:'+encodeURIComponent(ownerId),rows=new Map(),revisions=new Map(),forgotten=new Map();let links={},trainingDraft=null,observedRaw=null,invalid=false,revision=0,disposed=false,inflight=null,lastError='';
 try{const raw=storage?.getItem(key);observedRaw=raw??null;if(raw){const saved=JSON.parse(raw);if(saved.version!==1||saved.ownerId!==ownerId||!saved.links||typeof saved.links!=='object'||Array.isArray(saved.links))throw Error();links=saved.links;if(saved.trainingDraft?.ownerId===ownerId)trainingDraft=saved.trainingDraft;}}catch{invalid=true;lastError='Associations locales illisibles : données conservées.';}
 const persist=(next=links,draft=trainingDraft)=>{if(invalid)throw Error(lastError);if(!storage?.setItem)throw Error('Mémoire pédagogique non enregistrée : stockage local indisponible.');if((storage.getItem(key)??null)!==observedRaw)throw Error('Mémoire modifiée dans un autre onglet. Rechargez avant de continuer.');const raw=JSON.stringify({version:1,ownerId,links:next,...(draft?{trainingDraft:draft}:{})});storage.setItem(key,raw);observedRaw=raw;};
 const accept=p=>{if(disposed||!p?.id||!Number.isSafeInteger(p.version))return;const previous=rows.get(p.id);if(previous&&p.version<previous.version)return;forgotten.delete(p.id);rows.set(p.id,structuredClone(p));revisions.set(p.id,++revision);};
 return {
  ownerId,accept,forget(id){rows.delete(id);revisions.delete(id);forgotten.set(id,++revision);},list:()=>[...rows.values()].map(p=>structuredClone(p)),get:id=>rows.has(id)?structuredClone(rows.get(id)):null,error:()=>lastError,
  dogId(id){const p=rows.get(id);return typeof links[id]?.dogId==='string'?links[id].dogId:p?.dogRef?.ownerId===ownerId?p.dogRef.id:null;},
  linkDog(sessionId,dog){if(disposed||!rows.has(sessionId)||!dog?.id)throw Error('Session ou chien indisponible.');if(invalid)throw Error(lastError);const next={...links,[sessionId]:{...links[sessionId],dogId:String(dog.id)}};if(storage)persist(next);links=next;},
  training(id){const p=rows.get(id),m=links[id]?.trainingMemory;if(disposed||!p||p.ownerId!==ownerId||!m)return null;try{return normalizeTrainingMemory(m,{ownerId,dogId:links[id].dogId});}catch{return null;}},
  linkTraining(id,memory){const p=rows.get(id);if(disposed||!p||p.ownerId!==ownerId)throw Error('Session autorisée indisponible.');const m=normalizeTrainingMemory(memory,{ownerId,dogId:links[id]?.dogId});if(links[id]?.trainingMemory&&links[id].trainingMemory.id!==m.id)throw Error('Une autre préparation est déjà liée à cette séance.');const next={...links,[id]:{...links[id],trainingMemory:m}};persist(next,null);links=next;trainingDraft=null;},
  trainingDraft(){return disposed?null:structuredClone(trainingDraft);},
  saveTrainingDraft(value){if(disposed)throw Error('Compte indisponible.');if(value&&(value.ownerId!==ownerId||value.draft?.identityContext?.userId!==ownerId||value.draft?.session))throw Error('Brouillon incompatible.');const next=value?structuredClone(value):null;if(next)next.draft.dogs=[];if(next?.draft?.preparationTrack?.trainingMemory)normalizeTrainingMemory(next.draft.preparationTrack.trainingMemory,{ownerId,dogId:next.draft.dogId});persist(links,next);trainingDraft=next;},
  refresh(load){if(disposed)return Promise.resolve();if(inflight)return inflight;const before=revision;inflight=(async()=>{try{const list=await load();if(disposed)return;if(!Array.isArray(list))throw Error('Liste de sessions invalide.');const ids=new Set(list.map(p=>p.id));for(const id of rows.keys())if(!ids.has(id)&&revisions.get(id)<=before){rows.delete(id);revisions.delete(id);}for(const p of list)if(!(forgotten.get(p.id)>before))accept(p);if(!invalid)lastError='';}catch(error){if(disposed)return;if([401,403].includes(error.status)){rows.clear();revisions.clear();}lastError=error.message||'Catalogue partagé indisponible.';}finally{inflight=null;}})();return inflight;},
  dispose(){disposed=true;rows.clear();revisions.clear();forgotten.clear();}
 };
}

const roles={driver:'Conducteur',traceur:'Traceur',coach:'Coach',observer:'Observateur'};
const modes={normal:'Normal',simple_blind:'Simple aveugle',full_blind:'Double aveugle'};
const missing='Indisponible';
export const sharedSessionHref=(id,tab='')=>'/coaching/session?session='+encodeURIComponent(id)+(tab?'&tab='+encodeURIComponent(tab):'');
export function sharedSessionRows(projections=[],dogIds={}){
 return projections.map(p=>{const closed=['DEBRIEF','ARCHIVED'].includes(p.phase),seconds=p.searchActiveMs==null?null:Math.floor(p.searchActiveMs/1000),rawAt=p.search?.startedAt??p.pose?.startedAt??p.createdAt,at=typeof rawAt==='number'?rawAt:Date.parse(rawAt||'');
  return {id:p.id,sharedId:p.id,source:'shared',kind:'coaching',href:sharedSessionHref(p.id),title:`Coaching · ${p.dog}`,phase:p.phase,status:({PREPARATION:'En préparation',DEBRIEF:'Terminée',ARCHIVED:'Archivée',CANCELLED:'Annulée',INTERRUPTED:'Interrompue',LEFT:'Participation arrêtée',LAYING_WAIT:'En pause',SEARCH_READY:'En préparation'})[p.phase]||(p.trackingState==='paused'?'En pause':'En cours'),dogName:p.dog,dogId:dogIds[p.id]||null,modeLabel:modes[p.mode]||missing,roleLabel:roles[p.role]||missing,sortAt:p.createdAt??at??null,date:Number.isFinite(at)?new Date(at).toLocaleString('fr-FR'):missing,distance:closed&&Number.isFinite(p.search?.distanceM)?(p.search.distanceM/1000).toFixed(2).replace('.',',')+' km · GPS réel':missing,duration:closed&&seconds!==null?`${Math.floor(seconds/60)} min ${seconds%60} s`:missing,canResume:!closed&&!['CANCELLED','INTERRUPTED','LEFT'].includes(p.phase),provenance:'Coaching partagé'};
 });
}
export function sharedTrackRows(projections=[]){
 return projections.filter(p=>['DEBRIEF','ARCHIVED'].includes(p.phase)).flatMap(p=>['pose','search'].flatMap(kind=>{
  const gps=p[kind];if(!gps?.segments?.flat().length)return [];
  const points=gps.segments.flatMap((s,i)=>s.map((x,j)=>({id:`${kind}-${i}-${j}`,space:'wgs84',x:x.longitude,y:x.latitude,kind:i===0&&j===0?'start':'via',breakBefore:i>0&&j===0})));points.at(-1).kind='arrival';
  const id=`shared:${p.id}:${kind}`,name=`${p.dog} · ${kind==='pose'?'Pose':'Recherche'}`;
  return [{id,href:'/tracks/'+encodeURIComponent(id),sessionHref:sharedSessionHref(p.id,'map'),name,kind,provenance:'GPS réel · Coaching partagé',geometryAvailable:true,editable:false,sessionId:p.id,points,map:{gpsPose:p.pose,gpsSearch:p.search},copySource:points.length>=2?{sessionId:p.id,kind,points}:null}];
 }));
}
