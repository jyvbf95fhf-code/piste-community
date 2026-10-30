import {scientificAccessFor} from './scientific-access.mjs';
const clone=value=>structuredClone(value);

export function createScientificStore({actor,clock=()=>new Date().toISOString(),synthetic=true,storage=null,getOwnerId=null}={}){
 const access=scientificAccessFor(actor);let state={cohorts:[],annotations:[],blindRecords:[],evaluations:[],runs:[],journal:[],errors:[],hypotheses:[]};
 const durable=actor?.assurance==='supabase-auth'&&!synthetic,ownerId=actor?.user_id;
 const key=durable&&ownerId?'piste-v2-scientific-work:'+encodeURIComponent(ownerId):null;
 let lastRaw=null,warning='',blocked=false,depth=0;
 if(durable&&access.authorized)try{
  if(!key||!storage)throw Error('Stockage Science indisponible.');
  lastRaw=storage.getItem(key);
  if(lastRaw!==null){const saved=JSON.parse(lastRaw),names=Object.keys(state);
   if(saved.version!==1||saved.ownerId!==ownerId||!saved.state||Object.keys(saved.state).length!==names.length||names.some(k=>!Array.isArray(saved.state[k])||saved.state[k].some(r=>!r||typeof r!=='object'||typeof r.id!=='string'||!r.id)))throw Error('Sauvegarde Science illisible : original conservé.');
   state=clone(saved.state);
  }
 }catch(e){blocked=true;warning=e instanceof SyntaxError?'Sauvegarde Science illisible : original conservé.':e.message;}
 const assertAccess=()=>{if(!access.authorized)throw new Error('Accès scientifique refusé.');if(durable&&getOwnerId&&getOwnerId()!==ownerId)throw Error('Le compte Science a changé.');};
 const next=(collection,prefix)=>{let n=collection.length+1;while(collection.some(r=>r.id===`${prefix}-${String(n).padStart(4,'0')}`))n++;return `${prefix}-${String(n).padStart(4,'0')}`;};
 const store={
  snapshot(){assertAccess();return clone(state);},
  createCohort(input={}){assertAccess();const row={id:next(state.cohorts,'cohort'),name:String(input.name||'Cohorte sans nom'),criteria:clone(input.criteria||{}),createdAt:clock(),updatedAt:clock(),synthetic};state.cohorts=[...state.cohorts,row];return clone(row);},
  updateCohort(id,patch={}){assertAccess();const old=state.cohorts.find(item=>item.id===id);if(!old)return null;const row={...old,...clone(patch),id,criteria:patch.criteria?clone(patch.criteria):old.criteria,updatedAt:clock()};state.cohorts=state.cohorts.map(item=>item.id===id?row:item);return clone(row);},
  duplicateCohort(id,name){assertAccess();const old=state.cohorts.find(item=>item.id===id);if(!old)return null;return store.createCohort({...old,id:undefined,name:name||`${old.name} · copie`,criteria:old.criteria});},
  deleteCohort(id){assertAccess();const count=state.cohorts.length;state.cohorts=state.cohorts.filter(item=>item.id!==id);return state.cohorts.length<count;},
  appendAnnotation(input={}){assertAccess();const row={id:next(state.annotations,'annotation'),sessionId:input.sessionId||null,segment:input.segment??null,text:String(input.text||''),tags:clone(input.tags||[]),visibility:input.visibility==='scientifique partagée'?'scientifique partagée':'personnelle',status:input.status||'active',author:access.displayName,createdAt:clock(),revisionOf:input.revisionOf||null,synthetic};state.annotations=[...state.annotations,row];return clone(row);},
  reviseAnnotation(id,patch={}){assertAccess();const previous=state.annotations.find(item=>item.id===id)||state.annotations.filter(item=>item.revisionOf===id).at(-1);if(!previous)return null;return store.appendAnnotation({...previous,...clone(patch),revisionOf:previous.id});},
  appendBlindRecord(input={}){assertAccess();const row={id:next(state.blindRecords,'blind'),...clone(input),author:access.displayName,createdAt:clock(),synthetic};state.blindRecords=[...state.blindRecords,row];return clone(row);},
  appendEvaluation(input={}){assertAccess();const row={id:next(state.evaluations,'evaluation'),...clone(input),author:access.displayName,createdAt:clock(),synthetic};state.evaluations=[...state.evaluations,row];return clone(row);},
  appendErrorCase(input={}){assertAccess();const row={id:next(state.errors,'error'),...clone(input),author:access.displayName,createdAt:clock(),synthetic};state.errors=[...state.errors,row];return clone(row);},
  appendHypothesis(input={}){assertAccess();const row={id:input.id||next(state.hypotheses,'H'),...clone(input),createdAt:clock(),updatedAt:clock(),synthetic};state.hypotheses=[...state.hypotheses,row];return clone(row);},
  updateHypothesis(id,patch={}){assertAccess();const previous=state.hypotheses.find(item=>item.id===id);if(!previous)return null;const row={...previous,...clone(patch),id,updatedAt:clock(),synthetic};state.hypotheses=state.hypotheses.map(item=>item.id===id?row:item);return clone(row);},
  appendRun(input={}){assertAccess();const row={id:next(state.runs,'run'),...clone(input),createdAt:input.createdAt||clock(),synthetic};state.runs=[...state.runs,row];return clone(row);},
  appendJournalEvent(input={}){assertAccess();const row={id:next(state.journal,'scientific-event'),...clone(input),createdAt:input.createdAt||clock(),synthetic};state.journal=[...state.journal,row];return clone(row);}
 };
 // Preserve the synchronous API. A successful mutation is returned only after
 // the device write succeeds; a stale tab or quota failure keeps the prior state.
 for(const name of Object.keys(store))if(name!=='snapshot'){
  const operation=store[name];store[name]=(...args)=>{
   assertAccess();if(!durable||depth)return operation(...args);
   if(blocked)throw Error(warning);
   if(storage.getItem(key)!==lastRaw)throw Error('Travaux Science modifiés dans un autre onglet : actualisez avant de modifier.');
   const previous=clone(state);depth++;
   try{const value=operation(...args),raw=JSON.stringify({version:1,ownerId,state});
    try{storage.setItem(key,raw);}catch{warning='Enregistrement Science impossible sur cet appareil : espace indisponible.';throw Error(warning);}
    lastRaw=raw;warning='';return value;
   }catch(e){state=previous;throw e;}finally{depth--;}
  };
 }
 store.persistenceWarning=()=>warning;
 return store;
}
