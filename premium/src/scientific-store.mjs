import {scientificAccessFor} from './scientific-access.mjs';
const clone=value=>structuredClone(value);

export function createScientificStore({actor,clock=()=>new Date().toISOString()}={}){
 const access=scientificAccessFor(actor);let state={cohorts:[],annotations:[],blindRecords:[],evaluations:[],runs:[],journal:[],errors:[],hypotheses:[]};
 const assertAccess=()=>{if(!access.authorized)throw new Error('Accès scientifique refusé.');};
 const next=(collection,prefix)=>`${prefix}-${String(collection.length+1).padStart(4,'0')}`;
 const store={
  snapshot(){assertAccess();return clone(state);},
  createCohort(input={}){assertAccess();const row={id:next(state.cohorts,'cohort'),name:String(input.name||'Cohorte sans nom'),criteria:clone(input.criteria||{}),createdAt:clock(),updatedAt:clock(),synthetic:true};state.cohorts=[...state.cohorts,row];return clone(row);},
  updateCohort(id,patch={}){assertAccess();const old=state.cohorts.find(item=>item.id===id);if(!old)return null;const row={...old,...clone(patch),id,criteria:patch.criteria?clone(patch.criteria):old.criteria,updatedAt:clock()};state.cohorts=state.cohorts.map(item=>item.id===id?row:item);return clone(row);},
  duplicateCohort(id,name){assertAccess();const old=state.cohorts.find(item=>item.id===id);if(!old)return null;return store.createCohort({...old,id:undefined,name:name||`${old.name} · copie`,criteria:old.criteria});},
  deleteCohort(id){assertAccess();const count=state.cohorts.length;state.cohorts=state.cohorts.filter(item=>item.id!==id);return state.cohorts.length<count;},
  appendAnnotation(input={}){assertAccess();const row={id:next(state.annotations,'annotation'),sessionId:input.sessionId||null,segment:input.segment??null,text:String(input.text||''),tags:clone(input.tags||[]),visibility:input.visibility==='scientifique partagée'?'scientifique partagée':'personnelle',status:input.status||'active',author:access.displayName,createdAt:clock(),revisionOf:input.revisionOf||null,synthetic:true};state.annotations=[...state.annotations,row];return clone(row);},
  reviseAnnotation(id,patch={}){assertAccess();const previous=state.annotations.find(item=>item.id===id)||state.annotations.filter(item=>item.revisionOf===id).at(-1);if(!previous)return null;return store.appendAnnotation({...previous,...clone(patch),revisionOf:previous.id});},
  appendBlindRecord(input={}){assertAccess();const row={id:next(state.blindRecords,'blind'),...clone(input),author:access.displayName,createdAt:clock(),synthetic:true};state.blindRecords=[...state.blindRecords,row];return clone(row);},
  appendEvaluation(input={}){assertAccess();const row={id:next(state.evaluations,'evaluation'),...clone(input),author:access.displayName,createdAt:clock(),synthetic:true};state.evaluations=[...state.evaluations,row];return clone(row);},
  appendErrorCase(input={}){assertAccess();const row={id:next(state.errors,'error'),...clone(input),author:access.displayName,createdAt:clock(),synthetic:true};state.errors=[...state.errors,row];return clone(row);},
  appendHypothesis(input={}){assertAccess();const row={id:input.id||next(state.hypotheses,'H'),...clone(input),createdAt:clock(),updatedAt:clock(),synthetic:true};state.hypotheses=[...state.hypotheses,row];return clone(row);},
  updateHypothesis(id,patch={}){assertAccess();const previous=state.hypotheses.find(item=>item.id===id);if(!previous)return null;const row={...previous,...clone(patch),id,updatedAt:clock(),synthetic:true};state.hypotheses=state.hypotheses.map(item=>item.id===id?row:item);return clone(row);},
  appendRun(input={}){assertAccess();const row={id:next(state.runs,'run'),...clone(input),createdAt:input.createdAt||clock(),synthetic:true};state.runs=[...state.runs,row];return clone(row);},
  appendJournalEvent(input={}){assertAccess();const row={id:next(state.journal,'scientific-event'),...clone(input),createdAt:input.createdAt||clock(),synthetic:true};state.journal=[...state.journal,row];return clone(row);}
 };
 return store;
}
