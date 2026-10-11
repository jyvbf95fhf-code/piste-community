import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as module from '../src/coaching-reference-assignment.mjs';
const {createReferenceAssignmentState:create,applyReferenceAssignmentAction:apply,getReferenceAssignment:view}=module;
// Explicit local fixtures, not authenticated identities or real role events.
const context=()=>({sessionId:'delegation-session-401',creatorParticipantId:'creator-409',participants:[{id:'creator-409',functions:['observer']},{id:'coach-419',functions:['coach','observer']},{id:'tracer-421',functions:['traceur']}],references:[{id:'reference-431',layingStarted:false}],delegations:[]});
const grant=(patch={})=>({actionId:'grant-action-433',type:'delegation-grant',sessionId:'delegation-session-401',authorParticipantId:'creator-409',beneficiaryParticipantId:'coach-419',delegationId:'D1-439',permission:'reference.assign',occurredAt:'2026-10-10T14:00:00.000Z',origin:'simulation:delegation-contract',assurance:'local-simulation',expectedRevision:0,...patch});
const revoke=(patch={})=>grant({actionId:'revoke-action-443',type:'delegation-revoke',occurredAt:'2026-10-10T14:01:00.000Z',expectedRevision:1,...patch});
const removed=()=>({...context(),participants:context().participants.map(p=>p.id==='coach-419'?{...p,functions:['observer']}:p)});
const roleEvent=(patch={})=>({eventId:'role-event-449',sessionId:'delegation-session-401',participantId:'coach-419',function:'coach',type:'function-removed',authorParticipantId:'creator-409',occurredAt:'2026-10-10T14:02:00.000Z',origin:'simulation:function-change',assurance:'local-simulation',...patch});
const invalidate=(patch={})=>grant({actionId:'invalidate-action-457',type:'delegation-invalidate',occurredAt:'2026-10-10T14:02:00.000Z',expectedRevision:1,functionEvent:roleEvent(),...patch});
const assign=(patch={})=>({actionId:'assignment-action-461',type:'assign',sessionId:'delegation-session-401',referenceId:'reference-431',authorParticipantId:'coach-419',beneficiaryParticipantId:'tracer-421',assignmentId:'assignment-463',delegationId:'D1-439',expectedRevision:0,occurredAt:'2026-10-10T14:03:00.000Z',origin:'simulation:delegated-assignment-contract',assurance:'local-simulation',...patch});
const granted=(c=context())=>apply(create(c),c,grant());
const record=s=>s.delegationLedger.records.find(d=>d.id==='D1-439');
const stale=()=>({...context(),delegations:[{id:'D1-439',sessionId:'delegation-session-401',grantedByParticipantId:'creator-409',beneficiaryParticipantId:'coach-419',permission:'reference.assign',status:'active'}]});
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}

test('three exports and legacy empty state shape remain compatible without migration',()=>{
 assert.deepEqual(Object.keys(module).sort(),['applyReferenceAssignmentAction','createReferenceAssignmentState','getReferenceAssignment'].sort());
 const s=create(context());assert.equal(s.delegationLedger,undefined);assert.equal(s.delegations,undefined);assert.equal(view(s,'reference-431').status,'none');
});
test('creator explicitly grants an immutable, recorded reference.assign delegation',()=>{
 const s=granted(),d=record(s);assert.equal(d.id,'D1-439');assert.equal(d.sessionId,context().sessionId);assert.equal(d.grantedByParticipantId,'creator-409');assert.equal(d.beneficiaryParticipantId,'coach-419');assert.equal(d.permission,'reference.assign');assert.equal(d.status,'active');assert.equal(d.revision,1);
 assert.equal(s.delegationLedger.revision,1);assert.deepEqual(s.delegationLedger.actions,[grant()]);assert.deepEqual(d.transitions,[{status:'active',...grant()}]);assert.deepEqual(s.delegationLedger.functionEvents,[]);
 assert.deepEqual(s.actions,[]);assert.equal(view(s,'reference-431').status,'none');
});
test('unrecorded active context never creates or grants a delegation',()=>{
 const c=stale(),s=create(c);assert.equal(s.delegationLedger,undefined);assert.throws(()=>apply(s,c,assign()),/INVALID_DELEGATION/);assert.deepEqual(s.actions,[]);
});
test('recorded grant permits isolated module authority without external active hints',()=>{const c=context(),s=apply(granted(c),c,assign());assert.equal(view(s,'reference-431').status,'pending');assert.equal(s.delegationLedger.revision,1);});
for(const [name,patch,reason] of [
 ['noncreator',{authorParticipantId:'coach-419'},'NOT_DELEGATION_CREATOR'],
 ['unknown author',{authorParticipantId:'outsider'},'UNKNOWN_AUTHOR'],
 ['non Coach',{beneficiaryParticipantId:'tracer-421'},'BENEFICIARY_NOT_COACH'],
 ['outside beneficiary',{beneficiaryParticipantId:'outsider'},'UNKNOWN_BENEFICIARY'],
 ['wrong session',{sessionId:'foreign'},'SESSION_MISMATCH'],
 ['closure permission',{permission:'session.close'},'INVALID_DELEGATION_PERMISSION'],
 ['read permission',{permission:'reference.read'},'INVALID_DELEGATION_PERMISSION'],
 ['missing identity',{authorParticipantId:null},'MISSING_DELEGATION_IDENTITY'],
 ['blank action id',{actionId:' '},'MISSING_DELEGATION_IDENTITY'],
 ['blank delegation id',{delegationId:''},'MISSING_DELEGATION_IDENTITY'],
 ['bad date',{occurredAt:'2026-02-30T14:00:00.000Z'},'INVALID_TIMESTAMP'],
 ['missing date',{occurredAt:null},'INVALID_TIMESTAMP'],
 ['non simulation origin',{origin:'server:real'},'INVALID_LOCAL_ASSURANCE'],
 ['invalid assurance',{assurance:'server-authenticated'},'INVALID_LOCAL_ASSURANCE'],
 ['bad revision',{expectedRevision:-1},'INVALID_REVISION'],
 ['non integer revision',{expectedRevision:0.5},'INVALID_REVISION']
])test(`invalid grant refused: ${name}`,()=>assert.throws(()=>apply(create(context()),context(),grant(patch)),new RegExp(reason)));
test('Coach without creator identity cannot grant authority to themselves',()=>assert.throws(()=>apply(create(context()),context(),grant({authorParticipantId:'coach-419',beneficiaryParticipantId:'coach-419'})),/NOT_DELEGATION_CREATOR/));
test('explicit revocation conserves author, timestamp, original grant and terminal record',()=>{
 const old=granted(),s=apply(old,context(),revoke()),d=record(s);assert.equal(d.status,'revoked');assert.equal(d.revision,2);assert.equal(s.delegationLedger.revision,2);assert.deepEqual(d.transitions,[{status:'active',...grant()},{status:'revoked',...revoke()}]);assert.deepEqual(s.delegationLedger.actions,[grant(),revoke()]);assert.equal(record(old).status,'active');
 assert.throws(()=>apply(s,context(),assign()),/INVALID_DELEGATION/);
});
test('revocation by a participant other than creator is refused',()=>assert.throws(()=>apply(granted(),context(),revoke({authorParticipantId:'coach-419'})),/NOT_DELEGATION_CREATOR/));
test('revocation remains possible after beneficiary loses Coach function',()=>{const s=apply(granted(),removed(),revoke());assert.equal(record(s).status,'revoked');});
test('invalidation requires explicit removal event and records it without modifying participants',()=>{
 const c=removed(),snapshot=structuredClone(c),s=apply(granted(),c,invalidate());assert.equal(record(s).status,'invalidated');assert.deepEqual(s.delegationLedger.functionEvents,[roleEvent()]);assert.deepEqual(record(s).transitions.at(-1),{status:'invalidated',...invalidate()});assert.deepEqual(c,snapshot);
});
test('missing current Coach function immediately refuses authority even before explicit invalidation recording',()=>assert.throws(()=>apply(granted(),removed(),assign()),/NOT_ASSIGNMENT_AUTHORITY/));
test('role return never reactivates invalidated D1; new explicit D2 is necessary',()=>{
 const s=apply(granted(),removed(),invalidate());assert.throws(()=>apply(s,context(),assign()),/INVALID_DELEGATION/);
 const D2=grant({actionId:'D2-action-467',delegationId:'D2-479',expectedRevision:2,occurredAt:'2026-10-10T14:04:00.000Z'}),next=apply(s,context(),D2);
 assert.equal(record(next).status,'invalidated');assert.equal(next.delegationLedger.records[1].status,'active');assert.equal(next.delegationLedger.revision,3);
 assert.equal(view(apply(next,context(),assign({delegationId:'D2-479'})),'reference-431').status,'pending');assert.throws(()=>apply(next,context(),assign()),/INVALID_DELEGATION/);
});
for(const terminal of ['revoked','invalidated'])test(`stale context marked active cannot resurrect ${terminal} D1`,()=>{
 const s=terminal==='revoked'?apply(granted(),context(),revoke()):apply(granted(),removed(),invalidate()),c=stale();
 assert.throws(()=>apply(s,c,assign()),/INVALID_DELEGATION/);const next=apply(s,c,null);assert.equal(record(next).status,terminal);
 assert.throws(()=>apply(s,c,grant({actionId:'reuse-grant',expectedRevision:2})),/DELEGATION_ID_REUSED/);
});
test('strict identical grant replay after invalidation does not regrant or rewrite history',()=>{
 const s=apply(granted(),removed(),invalidate()),next=apply(s,context(),Object.fromEntries(Object.entries(grant()).reverse()));assert.deepEqual(next,s);assert.equal(record(next).status,'invalidated');
});
test('strict identical revocation and invalidation replay have no new effect',()=>{
 for(const [c,a] of [[context(),revoke()],[removed(),invalidate()]]){const s=apply(granted(),c,a);assert.deepEqual(apply(s,c,a),s);assert.equal(record(s).transitions.length,2);}
});
test('stale revisions reject concurrent grants and fresh actions cannot terminate already terminal delegation',()=>{
 const s=granted();assert.throws(()=>apply(s,context(),grant({actionId:'different',delegationId:'D2'})),/STALE_DELEGATION_REVISION/);
 const revoked=apply(s,context(),revoke());assert.throws(()=>apply(revoked,context(),revoke({actionId:'again',expectedRevision:2})),/DELEGATION_NOT_ACTIVE/);
});
test('same action id with contradictory content cannot grant another beneficiary or alter timestamp',()=>{
 const s=granted();for(const patch of [{beneficiaryParticipantId:'creator-409'},{occurredAt:'2026-10-10T14:05:00.000Z'},{delegationId:'D2'},{type:'delegation-revoke',expectedRevision:1}])assert.throws(()=>apply(s,context(),grant(patch)),/ACTION_ID_CONFLICT/);
});
test('action identifiers are unique across reference assignment and delegation families',()=>{
 const initial=create(context()),a=assign({authorParticipantId:'creator-409',delegationId:null}),assigned=apply(initial,context(),a);
 assert.throws(()=>apply(assigned,context(),grant({actionId:a.actionId})),/ACTION_ID_CONFLICT/);
 const s=granted();assert.throws(()=>apply(s,context(),assign({actionId:grant().actionId,authorParticipantId:'creator-409',delegationId:null})),/ACTION_ID_CONFLICT/);
});
test('event ID cannot be reused with contradictory content',()=>{
 const s=apply(granted(),removed(),invalidate()),c=context(),next=apply(s,c,grant({actionId:'grant-D2',delegationId:'D2',expectedRevision:2}));
 const bad=invalidate({actionId:'invalidate-D2',delegationId:'D2',expectedRevision:3,functionEvent:roleEvent({occurredAt:'2026-10-10T14:06:00.000Z'})});assert.throws(()=>apply(next,removed(),bad),/FUNCTION_EVENT_ID_CONFLICT/);
});
for(const [name,patch] of [['wrong event session',{sessionId:'foreign'}],['wrong event member',{participantId:'tracer-421'}],['wrong function',{function:'traceur'}],['DEV perspective',{type:'perspective-changed'}],['missing event id',{eventId:null}],['wrong event author',{authorParticipantId:'coach-419'}],['bad event date',{occurredAt:'invalid'}],['bad event source',{origin:'dev-perspective'}],['bad event assurance',{assurance:'unknown'}]])test(`invalid function-removal evidence refused: ${name}`,()=>{
 assert.throws(()=>apply(granted(),removed(),invalidate({functionEvent:roleEvent(patch)})),/INVALID_FUNCTION_REMOVAL_EVENT/);
});
test('invalidation without event or while Coach function still exists is refused',()=>{
 const a=invalidate();delete a.functionEvent;assert.throws(()=>apply(granted(),removed(),a),/INVALID_FIELDS/);assert.throws(()=>apply(granted(),context(),invalidate()),/COACH_FUNCTION_STILL_PRESENT/);
});
test('invalidation author must be known creator and removed beneficiary may be absent from current session',()=>{
 assert.throws(()=>apply(granted(),removed(),invalidate({authorParticipantId:'coach-419',functionEvent:roleEvent({authorParticipantId:'coach-419'})})),/NOT_DELEGATION_CREATOR/);
 const c={...removed(),participants:removed().participants.filter(p=>p.id!=='coach-419')};assert.equal(record(apply(granted(),c,invalidate())).status,'invalidated');
});
test('no mutation, deeply frozen history, deterministic results and detached input events',()=>{
 const c=freeze(context()),a=freeze(grant()),initial=freeze(create(c)),before=structuredClone({c,a,initial}),s=apply(initial,c,a);assert.deepEqual({c,a,initial},before);assert.deepEqual(s,apply(initial,c,a));
 assert.ok(Object.isFrozen(s.delegationLedger));assert.ok(Object.isFrozen(record(s).transitions[0]));assert.throws(()=>record(s).transitions.push({}),TypeError);
 const event=roleEvent(),next=apply(s,removed(),invalidate({functionEvent:event}));event.origin='changed';assert.equal(next.delegationLedger.functionEvents[0].origin,'simulation:function-change');
});
test('delegation actions never change references, reference revision, pose lock or read permissions',()=>{
 let s=granted(),references=structuredClone(s.references);s=apply(s,context(),revoke());assert.deepEqual(s.references,references);assert.deepEqual(s.actions,[]);assert.equal(view(s,'reference-431').revision,0);
 for(const field of ['canRead','referenceRead','permissions','positions','poser','gps','closure'])assert.equal(s[field],undefined);
 const d=record(s);assert.equal(d.permission,'reference.assign');assert.equal(d.closure,undefined);
});
test('creation never imports an external active hint with missing origin or timestamps',()=>{
 const c=stale();c.delegations[0].createdAt='invented';const s=create(c);assert.equal(s.delegationLedger,undefined);assert.throws(()=>apply(s,c,assign()),/INVALID_DELEGATION/);
});
test('cross-session state and creator replacement cannot transfer delegation history',()=>{
 const s=granted();assert.throws(()=>apply(s,{...context(),sessionId:'another-session'},revoke()),/CONTEXT_MISMATCH/);assert.throws(()=>apply(s,{...context(),creatorParticipantId:'coach-419'},revoke()),/CONTEXT_MISMATCH/);
});
test('terminal status, revisions and evidence cannot be rewritten independently of history',()=>{
 const terminal=apply(granted(),removed(),invalidate());
 for(const change of [s=>{record(s).status='active';},s=>{record(s).revision=1;},s=>{record(s).transitions.pop();},s=>{s.delegationLedger.functionEvents=[];},s=>{s.delegationLedger.revision=1;}]){
  const forged=structuredClone(terminal);change(forged);assert.throws(()=>apply(forged,stale(),assign()),/INVALID_DELEGATION_STATE/);
 }
});
test('recorded delegation cannot be borrowed by another Coach participant',()=>{
 const c=context();c.participants.push({id:'other-coach-487',functions:['coach']});const s=granted(c);
 assert.throws(()=>apply(s,c,assign({authorParticipantId:'other-coach-487'})),/INVALID_DELEGATION/);
});
test('delegation commands preserve existing reference data even if context announces pose start',()=>{
 const c=context(),s=granted(c),nextContext=context();nextContext.references[0].layingStarted=true;
 const next=apply(s,nextContext,revoke());assert.deepEqual(next.references,s.references);assert.equal(view(next,'reference-431').locked,false);
 // Pose synchronization remains the separate legacy operation, with no revival.
 const synced=apply(next,nextContext,null);assert.equal(view(synced,'reference-431').locked,true);assert.equal(record(synced).status,'revoked');
});
