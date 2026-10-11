// Pure local assignment contract, not authentication or reference.read policy.
// The caller supplies a trusted participant context and explicit pose-
// start facts. No pose proof, participant identity, date or action id is inferred.
const reject=reason=>{throw new TypeError(reason);};
const isId=value=>typeof value==='string'&&value.length>0&&value.trim()===value;
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(value,key)=>Object.hasOwn(value,key);
function fields(value,required,optional=[]){
 if(!isObject(value)||required.some(key=>!own(value,key))||Object.keys(value).some(key=>![...required,...optional].includes(key)))reject('INVALID_FIELDS');
}
function frozen(value){if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;}
const clone=value=>structuredClone(value);
function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(isObject(value))return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
 return JSON.stringify(value);
}
function validateContext(context){
 fields(context,['sessionId','creatorParticipantId','participants','references','delegations'],['assignmentAuthority']);
 if(own(context,'assignmentAuthority')&&context.assignmentAuthority!=='coach-role')reject('INVALID_ASSIGNMENT_AUTHORITY');
 if(!isId(context.sessionId)||!isId(context.creatorParticipantId)||!Array.isArray(context.participants)||!Array.isArray(context.references)||!Array.isArray(context.delegations))reject('INVALID_CONTEXT');
 const ids=new Set();
 for(const p of context.participants){
  fields(p,['id','functions']);
  if(!isId(p.id)||ids.has(p.id)||!Array.isArray(p.functions)||!p.functions.length||new Set(p.functions).size!==p.functions.length||p.functions.some(f=>!['driver','traceur','coach','observer'].includes(f)))reject('INVALID_PARTICIPANT');
  ids.add(p.id);
 }
 if(!ids.has(context.creatorParticipantId))reject('UNKNOWN_CREATOR');
 ids.clear();
 for(const r of context.references){fields(r,['id','layingStarted']);if(!isId(r.id)||ids.has(r.id)||typeof r.layingStarted!=='boolean')reject('INVALID_REFERENCE');ids.add(r.id);}
 if(!context.references.length)reject('INVALID_REFERENCE');
}
function validateState(state,context){
 fields(state,['schemaVersion','sessionId','creatorParticipantId','references','actions'],['delegationLedger']);
 if(state.schemaVersion!==1||state.sessionId!==context.sessionId||state.creatorParticipantId!==context.creatorParticipantId||!isObject(state.references)||!Array.isArray(state.actions))reject('CONTEXT_MISMATCH');
 if(canonical(Object.keys(state.references).sort())!==canonical(context.references.map(r=>r.id).sort()))reject('CONTEXT_MISMATCH');
 for(const r of Object.values(state.references)){
  fields(r,['revision','locked','assignments']);
  if(!Number.isSafeInteger(r.revision)||r.revision<0||typeof r.locked!=='boolean'||!Array.isArray(r.assignments))reject('INVALID_STATE');
  if(r.assignments.filter(a=>['pending','accepted'].includes(a.status)).length>1)reject('INVALID_STATE');
 }
}
const delegationTypes=['delegation-grant','delegation-revoke','delegation-invalidate'];
const validTimestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
function validateDelegationAction(action){
 fields(action,['actionId','type','sessionId','authorParticipantId','beneficiaryParticipantId','delegationId','permission','occurredAt','origin','assurance','expectedRevision'],action?.type==='delegation-invalidate'?['functionEvent']:[]);
 if(action.type==='delegation-invalidate'&&!own(action,'functionEvent'))reject('INVALID_FIELDS');
 for(const key of ['actionId','sessionId','authorParticipantId','beneficiaryParticipantId','delegationId'])if(!isId(action[key]))reject('MISSING_DELEGATION_IDENTITY');
 if(!delegationTypes.includes(action.type))reject('UNKNOWN_ACTION');
 if(action.permission!=='reference.assign')reject('INVALID_DELEGATION_PERMISSION');
 if(!isId(action.origin)||!action.origin.startsWith('simulation:')||action.assurance!=='local-simulation')reject('INVALID_LOCAL_ASSURANCE');
 if(!validTimestamp(action.occurredAt))reject('INVALID_TIMESTAMP');
 if(!Number.isSafeInteger(action.expectedRevision)||action.expectedRevision<0)reject('INVALID_REVISION');
 if(action.type==='delegation-invalidate'){
  const e=action.functionEvent;
  try{fields(e,['eventId','sessionId','participantId','function','type','authorParticipantId','occurredAt','origin','assurance']);}catch{reject('INVALID_FUNCTION_REMOVAL_EVENT');}
  if(!isId(e.eventId)||e.sessionId!==action.sessionId||e.participantId!==action.beneficiaryParticipantId||e.function!=='coach'||e.type!=='function-removed'||e.authorParticipantId!==action.authorParticipantId||!validTimestamp(e.occurredAt)||!isId(e.origin)||!e.origin.startsWith('simulation:')||e.assurance!=='local-simulation')reject('INVALID_FUNCTION_REMOVAL_EVENT');
 }
}
// Check the ledger against its immutable action history, rather than trusting
// a status field independently of the grant and terminal transitions.
function validateLedger(state){
 if(!own(state,'delegationLedger'))return;
 const ledger=state.delegationLedger;
 fields(ledger,['revision','records','actions','functionEvents']);
 if(!Number.isSafeInteger(ledger.revision)||ledger.revision<0||!Array.isArray(ledger.records)||!Array.isArray(ledger.actions)||!Array.isArray(ledger.functionEvents)||ledger.revision!==ledger.actions.length)reject('INVALID_DELEGATION_STATE');
 const rebuilt={revision:0,records:[],actions:[],functionEvents:[]},ids=new Set(state.actions.map(a=>a.actionId));
 for(const a of ledger.actions){
  validateDelegationAction(a);
  if(ids.has(a.actionId)||a.expectedRevision!==rebuilt.revision||a.sessionId!==state.sessionId||a.authorParticipantId!==state.creatorParticipantId)reject('INVALID_DELEGATION_STATE');
  ids.add(a.actionId);
  const record=rebuilt.records.find(d=>d.id===a.delegationId);
  if(a.type==='delegation-grant'){
   if(record)reject('INVALID_DELEGATION_STATE');
  }else if(!record||record.status!=='active'||record.beneficiaryParticipantId!==a.beneficiaryParticipantId)reject('INVALID_DELEGATION_STATE');
  appendDelegation(rebuilt,a);
 }
 if(canonical(rebuilt)!==canonical(ledger))reject('INVALID_DELEGATION_STATE');
}
function appendDelegation(ledger,action){
 let record=ledger.records.find(d=>d.id===action.delegationId);
 const status=action.type==='delegation-grant'?'active':action.type==='delegation-revoke'?'revoked':'invalidated';
 if(!record){record={id:action.delegationId,sessionId:action.sessionId,grantedByParticipantId:action.authorParticipantId,beneficiaryParticipantId:action.beneficiaryParticipantId,permission:action.permission,status,revision:0,transitions:[]};ledger.records.push(record);}
 if(action.type==='delegation-invalidate'){
  const event=ledger.functionEvents.find(e=>e.eventId===action.functionEvent.eventId);
  if(event&&canonical(event)!==canonical(action.functionEvent))reject('FUNCTION_EVENT_ID_CONFLICT');
  if(!event)ledger.functionEvents.push(clone(action.functionEvent));
 }
 record.status=status;record.revision++;record.transitions.push({status,...clone(action)});
 ledger.revision++;ledger.actions.push(clone(action));
}
function applyDelegation(state,context,action){
 validateDelegationAction(action);
 if(action.sessionId!==state.sessionId)reject('SESSION_MISMATCH');
 const previous=[...state.actions,...(state.delegationLedger?.actions??[])].find(a=>a.actionId===action.actionId);
 if(previous){if(canonical(previous)!==canonical(action))reject('ACTION_ID_CONFLICT');return frozen(clone(state));}
 const author=context.participants.find(p=>p.id===action.authorParticipantId);
 if(!author)reject('UNKNOWN_AUTHOR');
 if(author.id!==state.creatorParticipantId)reject('NOT_DELEGATION_CREATOR');
 const ledger=state.delegationLedger??{revision:0,records:[],actions:[],functionEvents:[]};
 if(action.expectedRevision!==ledger.revision)reject('STALE_DELEGATION_REVISION');
 const beneficiary=context.participants.find(p=>p.id===action.beneficiaryParticipantId),record=ledger.records.find(d=>d.id===action.delegationId);
 if(action.type==='delegation-grant'){
  if(!beneficiary)reject('UNKNOWN_BENEFICIARY');
  if(!beneficiary.functions.includes('coach'))reject('BENEFICIARY_NOT_COACH');
  if(record)reject('DELEGATION_ID_REUSED');
 }else{
  if(!record||record.beneficiaryParticipantId!==action.beneficiaryParticipantId)reject('INVALID_DELEGATION');
  if(record.status!=='active')reject('DELEGATION_NOT_ACTIVE');
  if(action.type==='delegation-invalidate'&&beneficiary?.functions.includes('coach'))reject('COACH_FUNCTION_STILL_PRESENT');
 }
 // Delegation commands do not synchronize pose locks or alter references.
 const next=clone(state);next.delegationLedger=clone(ledger);appendDelegation(next.delegationLedger,action);return frozen(next);
}
function validateAction(action){
 const optional=action?.type==='reassign'?['previousAssignmentId','reason']:['reason'];
 fields(action,['actionId','sessionId','referenceId','authorParticipantId','beneficiaryParticipantId','type','occurredAt','origin','assurance','delegationId','expectedRevision','assignmentId'],optional);
 for(const key of ['actionId','sessionId','referenceId','authorParticipantId','beneficiaryParticipantId','assignmentId','origin'])if(!isId(action[key]))reject('MISSING_ACTION_IDENTITY');
 if(!['assign','accept','decline','reassign','revoke'].includes(action.type))reject('UNKNOWN_ACTION');
 if(action.assurance!=='local-simulation'||!action.origin.startsWith('simulation:'))reject('INVALID_LOCAL_ASSURANCE');
 if(action.delegationId!==null&&!isId(action.delegationId))reject('INVALID_DELEGATION');
 if(!Number.isSafeInteger(action.expectedRevision)||action.expectedRevision<0)reject('INVALID_REVISION');
 if(typeof action.occurredAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(action.occurredAt)||!Number.isFinite(Date.parse(action.occurredAt))||new Date(action.occurredAt).toISOString()!==action.occurredAt)reject('INVALID_TIMESTAMP');
 if(own(action,'reason')&&(typeof action.reason!=='string'||!action.reason.trim()))reject('INVALID_REASON');
 if(action.type==='reassign'&&!isId(action.previousAssignmentId))reject('MISSING_PREDECESSOR');
}
function authority(state,context,action,author){
 if(author.id===context.creatorParticipantId){if(action.delegationId!==null)reject('INVALID_DELEGATION');return;}
 if(!author.functions.includes('coach'))reject('NOT_ASSIGNMENT_AUTHORITY');
 // New sessions grant this right by Coach function, without synthetic grants.
 if(context.assignmentAuthority==='coach-role'){if(action.delegationId!==null)reject('INVALID_DELEGATION');return;}
 const d=state.delegationLedger?.records.find(d=>d.id===action.delegationId);
 if(action.delegationId===null||!d)reject('INVALID_DELEGATION');
 const matches=context.delegations.filter(h=>h?.id===action.delegationId);
 if(matches.length>1||matches.some(h=>h.sessionId!==d.sessionId||h.grantedByParticipantId!==d.grantedByParticipantId||h.beneficiaryParticipantId!==d.beneficiaryParticipantId||h.permission!==d.permission||h.status!=='active'))reject('INVALID_DELEGATION');
 if(d.sessionId!==context.sessionId||d.grantedByParticipantId!==context.creatorParticipantId||d.beneficiaryParticipantId!==author.id||d.permission!=='reference.assign'||d.status!=='active')reject('INVALID_DELEGATION');
}
function synchronizeLocks(state,context){
 const next=clone(state);for(const ref of context.references)if(ref.layingStarted)next.references[ref.id].locked=true;
 return next;
}
const current=ref=>ref.assignments.find(a=>['pending','accepted'].includes(a.status))??null;
function transition(record,status,action){record.status=status;record.transitions.push({status,actionId:action.actionId,authorParticipantId:action.authorParticipantId,occurredAt:action.occurredAt,...(own(action,'reason')?{reason:action.reason}:{})});}

export function createReferenceAssignmentState(context){
 validateContext(context);
 return frozen({schemaVersion:1,sessionId:context.sessionId,creatorParticipantId:context.creatorParticipantId,references:Object.fromEntries(context.references.map(r=>[r.id,{revision:0,locked:r.layingStarted,assignments:[]}])),actions:[]});
}
export function applyReferenceAssignmentAction(state,context,action=null){
 validateContext(context);validateState(state,context);validateLedger(state);
 if(delegationTypes.includes(action?.type))return applyDelegation(state,context,action);
 const next=synchronizeLocks(state,context);
 // null explicitly synchronizes caller-provided start facts without inventing
 // an action, an attestation, or a physical poser. Locks are monotonic.
 if(action===null)return frozen(next);
 validateAction(action);
 if(action.sessionId!==state.sessionId)reject('SESSION_MISMATCH');
 if(!own(next.references,action.referenceId))reject('UNKNOWN_REFERENCE');
 const previous=[...state.actions,...(state.delegationLedger?.actions??[])].find(a=>a.actionId===action.actionId);
 if(previous){if(canonical(previous)!==canonical(action))reject('ACTION_ID_CONFLICT');return frozen(next);}
 const author=context.participants.find(p=>p.id===action.authorParticipantId),beneficiary=context.participants.find(p=>p.id===action.beneficiaryParticipantId);
 if(!author)reject('UNKNOWN_AUTHOR');
 if(!beneficiary)reject('UNKNOWN_BENEFICIARY');
 const ref=next.references[action.referenceId],active=current(ref);
 if(action.expectedRevision!==ref.revision)reject('STALE_REVISION');
 if(ref.locked)reject('ASSIGNMENT_LOCKED');
 if(['assign','reassign','revoke'].includes(action.type))authority(state,context,action,author);
 else {
  if(action.delegationId!==null)reject('INVALID_DELEGATION');
  if(!active||active.assignmentId!==action.assignmentId)reject('ASSIGNMENT_NOT_CURRENT');
  if(author.id!==active.beneficiaryParticipantId||beneficiary.id!==active.beneficiaryParticipantId)reject('NOT_BENEFICIARY');
  if(active.status!=='pending')reject('RESPONSE_ALREADY_RECORDED');
 }
 if(['assign','reassign'].includes(action.type)){
  if(!beneficiary.functions.includes('traceur'))reject('BENEFICIARY_NOT_TRACEUR');
  if(Object.values(next.references).some(r=>r.assignments.some(a=>a.assignmentId===action.assignmentId)))reject('ASSIGNMENT_ID_REUSED');
  if(action.type==='assign'&&active)reject('ACTIVE_ASSIGNMENT_EXISTS');
  if(action.type==='reassign'){
   if(!active||active.assignmentId!==action.previousAssignmentId)reject('ASSIGNMENT_NOT_CURRENT');
   if(active.beneficiaryParticipantId===beneficiary.id)reject('UNCHANGED_BENEFICIARY');
   transition(active,'replaced',action);
  }
  const record={assignmentId:action.assignmentId,beneficiaryParticipantId:beneficiary.id,status:'pending',createdByParticipantId:author.id,createdAt:action.occurredAt,delegationId:action.delegationId,origin:action.origin,assurance:action.assurance,transitions:[]};
  transition(record,'pending',action);ref.assignments.push(record);
 }else if(action.type==='revoke'){
  if(!active||active.assignmentId!==action.assignmentId||active.beneficiaryParticipantId!==beneficiary.id)reject('ASSIGNMENT_NOT_CURRENT');
  transition(active,'revoked',action);
 }else transition(active,action.type==='accept'?'accepted':'declined',action);
 ref.revision++;next.actions.push(clone(action));return frozen(next);
}
export function getReferenceAssignment(state,referenceId){
 if(!isObject(state)||!isId(referenceId)||!isObject(state.references)||!own(state.references,referenceId))reject('UNKNOWN_REFERENCE');
 const ref=state.references[referenceId],active=current(ref),last=ref.assignments.at(-1);
 return frozen({sessionId:state.sessionId,referenceId,revision:ref.revision,locked:ref.locked,status:active?(ref.locked?'locked':active.status):(last?.status??'none'),current:active?clone(active):null,assignments:clone(ref.assignments)});
}
