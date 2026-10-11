import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as assignment from '../src/coaching-reference-assignment.mjs';
const {createReferenceAssignmentState,applyReferenceAssignmentAction,getReferenceAssignment}=assignment;
// All identities, origins, dates and beginning-of-pose facts here are explicit
// local simulations. They are not authenticated accounts or physical pose proof.
const context=()=>({sessionId:'session-811',creatorParticipantId:'creator-17',participants:[
 {id:'creator-17',functions:['observer']},{id:'coach-23',functions:['coach']},
 {id:'tracer-31',functions:['traceur']},{id:'tracer-43',functions:['traceur']},
 {id:'coach-tracer-59',functions:['coach','traceur']},{id:'driver-67',functions:['driver']}
],references:[{id:'reference-101',layingStarted:false},{id:'reference-103',layingStarted:false}],delegations:[]});
const delegation=(patch={})=>({id:'delegation-701',sessionId:'session-811',grantedByParticipantId:'creator-17',beneficiaryParticipantId:'coach-23',permission:'reference.assign',status:'active',...patch});
const command=(patch={})=>({actionId:'action-201',sessionId:'session-811',referenceId:'reference-101',authorParticipantId:'creator-17',beneficiaryParticipantId:'tracer-31',type:'assign',occurredAt:'2026-10-10T12:00:00.000Z',origin:'simulation:assignment-contract',assurance:'local-simulation',delegationId:null,expectedRevision:0,assignmentId:'assignment-301',...patch});
const state=c=>createReferenceAssignmentState(c??context());
const act=(s,c,a)=>applyReferenceAssignmentAction(s,c,a);
// An external description is insufficient: explicitly record the creator's
// local grant before exercising delegated assignment authority.
const grant=(patch={})=>({actionId:'delegation-grant-709',type:'delegation-grant',sessionId:'session-811',authorParticipantId:'creator-17',beneficiaryParticipantId:'coach-23',delegationId:'delegation-701',permission:'reference.assign',occurredAt:'2026-10-10T11:58:00.000Z',origin:'simulation:assignment-contract',assurance:'local-simulation',expectedRevision:0,...patch});
const granted=c=>act(state(c),c,grant());
const revokeDelegation=(s,c)=>act(s,c,grant({actionId:'delegation-revoke-719',type:'delegation-revoke',occurredAt:'2026-10-10T12:04:00.000Z',expectedRevision:1}));
const view=s=>getReferenceAssignment(s,'reference-101');
const assigned=(c=context())=>act(state(c),c,command());
const response=(type='accept',patch={})=>command({actionId:'action-203',type,authorParticipantId:'tracer-31',expectedRevision:1,occurredAt:'2026-10-10T12:01:00.000Z',...patch});
const replacement=(patch={})=>command({actionId:'action-205',type:'reassign',assignmentId:'assignment-303',previousAssignmentId:'assignment-301',beneficiaryParticipantId:'tracer-43',expectedRevision:1,occurredAt:'2026-10-10T12:02:00.000Z',reason:'Changement explicite simulé',...patch});
const revocation=(patch={})=>command({actionId:'action-207',type:'revoke',expectedRevision:1,occurredAt:'2026-10-10T12:03:00.000Z',reason:'Annulation simulée',...patch});
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}

test('exact public surface is three isolated operations',()=>assert.deepEqual(Object.keys(assignment).sort(),['applyReferenceAssignmentAction','createReferenceAssignmentState','getReferenceAssignment'].sort()));
test('function Traceur alone creates no attribution',()=>{
 const s=state();assert.equal(view(s).status,'none');assert.equal(view(s).current,null);assert.deepEqual(view(s).assignments,[]);assert.deepEqual(s.actions,[]);
});
test('creator in Observer function assigns explicitly to participant Traceur',()=>{
 const c=context(),s=assigned(c),v=view(s);assert.equal(c.participants[0].functions[0],'observer');assert.equal(v.status,'pending');assert.equal(v.current.beneficiaryParticipantId,'tracer-31');assert.deepEqual(s.actions,[command()]);assert.equal(v.revision,1);
});
test('noncreator without delegation cannot assign even to themselves',()=>{
 assert.throws(()=>act(state(),context(),command({authorParticipantId:'tracer-31'})),/NOT_ASSIGNMENT_AUTHORITY/);
});
test('Coach requires explicit reference.assign delegation',()=>{
 const c=context();c.delegations=[delegation()];const a=command({authorParticipantId:'coach-23',delegationId:'delegation-701'});assert.throws(()=>act(state(c),c,a),/INVALID_DELEGATION/);const s=act(granted(c),c,a);assert.equal(s.actions[0].delegationId,'delegation-701');assert.equal(view(s).status,'pending');
});
for(const [name,patch] of [['revoked',{status:'revoked'}],['other session',{sessionId:'foreign-session'}],['closure only',{permission:'session.close'}],['wrong beneficiary',{beneficiaryParticipantId:'coach-tracer-59'}],['wrong grantor',{grantedByParticipantId:'driver-67'}]])test(`Coach delegation refused: ${name}`,()=>{
 const c=context();c.delegations=[delegation(patch)];assert.throws(()=>act(granted(c),c,command({authorParticipantId:'coach-23',delegationId:'delegation-701'})),/INVALID_DELEGATION/);
});
test('Coach without delegation or with nonexistent delegation refused',()=>{
 for(const delegationId of [null,'missing'])assert.throws(()=>act(state(),context(),command({authorParticipantId:'coach-23',delegationId})),/INVALID_DELEGATION/);
});
test('incomplete delegation refuses authority without inventing fields',()=>{
 const c=context(),d=delegation();delete d.grantedByParticipantId;c.delegations=[d];assert.throws(()=>act(granted(c),c,command({authorParticipantId:'coach-23',delegationId:d.id})),/INVALID_DELEGATION/);
});
test('delegation does not turn a non-Coach into an assignment authority',()=>{
 const c=context();c.delegations=[delegation({beneficiaryParticipantId:'tracer-31'})];assert.throws(()=>act(state(c),c,command({authorParticipantId:'tracer-31',delegationId:'delegation-701'})),/NOT_ASSIGNMENT_AUTHORITY/);
});
test('correct beneficiary accepts without pose proof or read permission',()=>{
 const s=act(assigned(),context(),response()),v=view(s);assert.equal(v.status,'accepted');assert.equal(v.current.status,'accepted');assert.equal(s.actions.length,2);
 for(const field of ['poser','gps','canRead','permissions','referenceRead'])assert.ok(!Object.hasOwn(v,field));assert.equal(v.locked,false);
});
test('beneficiary explicitly declines and history retains refusal author and reason',()=>{
 const s=act(assigned(),context(),response('decline',{reason:'Indisponible'}));assert.equal(view(s).status,'declined');assert.equal(view(s).current,null);assert.equal(view(s).assignments[0].status,'declined');assert.equal(s.actions[1].reason,'Indisponible');assert.equal(s.actions[1].authorParticipantId,'tracer-31');
});
for(const type of ['accept','decline'])test(`another participant cannot ${type}`,()=>assert.throws(()=>act(assigned(),context(),response(type,{authorParticipantId:'tracer-43'})),/NOT_BENEFICIARY/));
test('non-Traceur beneficiary refused',()=>assert.throws(()=>act(state(),context(),command({beneficiaryParticipantId:'driver-67'})),/BENEFICIARY_NOT_TRACEUR/));
test('Coach plus Traceur may receive attribution but acquires no automatic authority',()=>{
 const c=context(),s=act(state(c),c,command({beneficiaryParticipantId:'coach-tracer-59'}));assert.equal(view(s).current.beneficiaryParticipantId,'coach-tracer-59');
 assert.throws(()=>act(state(c),c,command({authorParticipantId:'coach-tracer-59',beneficiaryParticipantId:'coach-tracer-59'})),/INVALID_DELEGATION/);
});
test('reassignment replaces exactly one current relation and preserves originals',()=>{
 const old=assigned(),s=act(old,context(),replacement()),v=view(s);assert.equal(v.status,'pending');assert.equal(v.assignments.length,2);assert.equal(v.assignments[0].status,'replaced');assert.equal(v.current.assignmentId,'assignment-303');assert.equal(v.current.beneficiaryParticipantId,'tracer-43');assert.equal(view(old).current.assignmentId,'assignment-301');assert.equal(s.actions.at(-1).reason,'Changement explicite simulé');
});
test('accepted assignment can be reassigned before pose',()=>{
 const s=act(act(assigned(),context(),response()),context(),replacement({expectedRevision:2}));assert.equal(view(s).assignments[0].status,'replaced');assert.equal(view(s).status,'pending');
});
test('revocation removes current attribution and retains history',()=>{
 const s=act(assigned(),context(),revocation());assert.equal(view(s).status,'revoked');assert.equal(view(s).current,null);assert.equal(view(s).assignments[0].status,'revoked');assert.equal(s.actions.length,2);
});
test('delegated Coach can revoke but revoked delegation cannot',()=>{
 const c=context();c.delegations=[delegation()];const s=act(granted(c),c,command()),a=revocation({authorParticipantId:'coach-23',delegationId:'delegation-701'});
 assert.equal(view(act(s,c,a)).status,'revoked');const terminated=revokeDelegation(s,c);assert.throws(()=>act(terminated,c,a),/INVALID_DELEGATION/);c.delegations[0].status='revoked';assert.throws(()=>act(s,c,a),/INVALID_DELEGATION/);
});
test('no contradictory second active assignment without explicit replacement',()=>assert.throws(()=>act(assigned(),context(),command({actionId:'other',assignmentId:'other',expectedRevision:1,beneficiaryParticipantId:'tracer-43'})),/ACTIVE_ASSIGNMENT_EXISTS/));
test('new assignment after decline uses a distinct caller identity',()=>{
 const declined=act(assigned(),context(),response('decline'));
 const s=act(declined,context(),command({actionId:'new-action',assignmentId:'new-assignment',expectedRevision:2}));assert.equal(view(s).status,'pending');assert.equal(view(s).assignments[0].status,'declined');
});
test('explicit pose-start fact locks accepted attribution without inventing an attestation',()=>{
 const c=context(),s=act(assigned(c),c,response());c.references[0].layingStarted=true;
 const locked=act(s,c,null);assert.equal(view(locked).status,'locked');assert.equal(view(locked).current.status,'accepted');assert.equal(view(locked).locked,true);assert.equal(locked.actions.length,2);
});
for(const [type,action] of [['reassign',replacement({expectedRevision:2})],['revoke',revocation({expectedRevision:2})]])test(`${type} refused after pose starts`,()=>{
 const c=context(),s=act(assigned(c),c,response());c.references[0].layingStarted=true;assert.throws(()=>act(s,c,action),/ASSIGNMENT_LOCKED/);
});
test('lock persists after interruption or caller no longer reporting ongoing pose',()=>{
 const c=context();let s=assigned(c);c.references[0].layingStarted=true;s=act(s,c,null);c.references[0].layingStarted=false;
 s=act(s,c,null);assert.equal(view(s).status,'locked');assert.equal(view(s).current.beneficiaryParticipantId,'tracer-31');assert.throws(()=>act(s,c,replacement()),/ASSIGNMENT_LOCKED/);
});
test('first assignment cannot be created after pose begins',()=>{
 const c=context();c.references[0].layingStarted=true;assert.throws(()=>act(state(c),c,command()),/ASSIGNMENT_LOCKED/);
});
test('responses cannot rewrite a locked assignment',()=>{
 const c=context(),s=assigned(c);c.references[0].layingStarted=true;for(const type of ['accept','decline'])assert.throws(()=>act(s,c,response(type)),/ASSIGNMENT_LOCKED/);
});
test('wrong session, reference or unknown author refused',()=>{
 for(const patch of [{sessionId:'foreign'},{referenceId:'missing'},{authorParticipantId:'unknown'},{authorParticipantId:'self'}])assert.throws(()=>act(state(),context(),command(patch)));
});
for(const field of ['actionId','sessionId','referenceId','authorParticipantId','beneficiaryParticipantId','type','occurredAt','origin','assurance','delegationId','expectedRevision','assignmentId'])test(`missing action field refused: ${field}`,()=>{
 const a=command();delete a[field];assert.throws(()=>act(state(),context(),a));
});
test('missing creator, missing start fact and invalid functions refused',()=>{
 for(const change of [c=>c.creatorParticipantId=null,c=>delete c.references[0].layingStarted,c=>c.participants[0].functions=['admin']]){const c=context();change(c);assert.throws(()=>state(c));}
});
test('same action id and content is idempotent even with reordered object fields',()=>{
 const a=command(),s=assigned(),reordered=Object.fromEntries(Object.entries(a).reverse());const next=act(s,context(),reordered);assert.equal(next.actions.length,1);assert.deepEqual(next,s);
});
test('idempotent historical action after replacement does not reactivate old beneficiary',()=>{
 const s=act(assigned(),context(),replacement()),next=act(s,context(),command());assert.deepEqual(next,s);assert.equal(view(next).current.beneficiaryParticipantId,'tracer-43');
});
test('same id with different content is refused',()=>assert.throws(()=>act(assigned(),context(),command({beneficiaryParticipantId:'tracer-43'})),/ACTION_ID_CONFLICT/));
test('obsolete revision or historical assignment cannot revive revoked relation',()=>{
 const s=act(assigned(),context(),revocation());assert.throws(()=>act(s,context(),response()),/STALE_REVISION/);
 assert.throws(()=>act(s,context(),response('accept',{expectedRevision:2})),/ASSIGNMENT_NOT_CURRENT/);
});
test('response to replaced assignment refused even with current revision',()=>{
 const s=act(assigned(),context(),replacement());assert.throws(()=>act(s,context(),response('accept',{expectedRevision:2})),/ASSIGNMENT_NOT_CURRENT/);
});
test('reassignment must identify current predecessor and another Traceur',()=>{
 for(const patch of [{previousAssignmentId:'wrong'},{beneficiaryParticipantId:'tracer-31'},{assignmentId:'assignment-301'}])assert.throws(()=>act(assigned(),context(),replacement(patch)));
});
test('invalid date, identity assurance, revision or imported permission refused',()=>{
 for(const patch of [{occurredAt:'2026-02-30T12:00:00.000Z'},{assurance:'server-authenticated'},{expectedRevision:-1},{expectedRevision:1.5},{origin:''},{permission:'reference.read'}])assert.throws(()=>act(state(),context(),command(patch)));
});
test('identity and origin are explicitly local simulations, not names or GPS positions',()=>{
 for(const patch of [{authorName:'Creator'},{gps:{x:173,y:91}},{poserParticipantId:'tracer-31'}])assert.throws(()=>act(state(),context(),command(patch)));
});
test('frozen inputs, original states and delegation sources are not mutated',()=>{
 const c=freeze(context()),a=freeze(command()),initial=state(c),before=structuredClone({c,a,initial});const next=act(initial,c,a);
 assert.deepEqual({c,a,initial},before);assert.equal(initial.actions.length,0);assert.equal(next.actions.length,1);assert.ok(Object.isFrozen(next.actions[0]));assert.ok(Object.isFrozen(view(next).current));
});
test('deterministic outputs and independent query copies',()=>{
 const s=assigned();assert.deepEqual(s,assigned());const v=view(s);assert.throws(()=>{v.current.beneficiaryParticipantId='changed';},TypeError);assert.equal(view(s).current.beneficiaryParticipantId,'tracer-31');
});
test('creator identity cannot be silently replaced by current function holder',()=>{
 const c=context(),s=state(c);c.creatorParticipantId='coach-23';assert.throws(()=>act(s,c,command()),/CONTEXT_MISMATCH/);
});
test('unrelated reference remains unassigned through all changes',()=>{
 const s=act(assigned(),context(),replacement());assert.equal(getReferenceAssignment(s,'reference-103').status,'none');assert.throws(()=>getReferenceAssignment(s,'missing'));
});
for(const field of ['sessionId','grantedByParticipantId','beneficiaryParticipantId','permission','status'])test(`missing delegation field explicitly refused: ${field}`,()=>{
 const c=context(),d=delegation();delete d[field];c.delegations=[d];assert.throws(()=>act(granted(c),c,command({authorParticipantId:'coach-23',delegationId:d.id})),/INVALID_DELEGATION/);
});
test('historical delegation use is preserved after subsequent revocation, without new authority',()=>{
 const c=context();c.delegations=[delegation()];const a=command({authorParticipantId:'coach-23',delegationId:'delegation-701'}),s=revokeDelegation(act(granted(c),c,a),c);
 c.delegations[0].status='revoked';assert.deepEqual(act(s,c,a),s);assert.equal(view(s).current.delegationId,'delegation-701');
 assert.throws(()=>act(s,c,replacement({authorParticipantId:'coach-23',delegationId:'delegation-701'})),/INVALID_DELEGATION/);
});
test('idempotent assignment replay cannot restore a revoked attribution',()=>{
 const s=act(assigned(),context(),revocation()),replayed=act(s,context(),command());assert.deepEqual(replayed,s);assert.equal(view(replayed).current,null);assert.equal(view(replayed).status,'revoked');
});
test('accepted response cannot be reversed by a new decline',()=>{
 const s=act(assigned(),context(),response());assert.throws(()=>act(s,context(),response('decline',{actionId:'new-response',expectedRevision:2})),/RESPONSE_ALREADY_RECORDED/);
});
test('unknown beneficiary, blank identifiers and null author never infer identity',()=>{
 for(const patch of [{beneficiaryParticipantId:'external'},{authorParticipantId:null},{actionId:' '},{assignmentId:''}])assert.throws(()=>act(state(),context(),command(patch)));
});
test('revision is specific to each reference and identities remain distinct',()=>{
 const s=assigned(),second=act(s,context(),command({referenceId:'reference-103',actionId:'action-other-ref',assignmentId:'assignment-other-ref'}));
 assert.equal(view(second).revision,1);assert.equal(getReferenceAssignment(second,'reference-103').revision,1);assert.equal(second.actions.length,2);
 assert.throws(()=>act(s,context(),command({referenceId:'reference-103',actionId:'action-other-ref'})),/ASSIGNMENT_ID_REUSED/);
});
test('duplicate delegation identities cannot grant ambiguous authority',()=>{
 const c=context();c.delegations=[delegation(),delegation()];assert.throws(()=>act(granted(c),c,command({authorParticipantId:'coach-23',delegationId:'delegation-701'})),/INVALID_DELEGATION/);
});
test('previous accepted status and all source actions survive replacement',()=>{
 const accepted=act(assigned(),context(),response()),next=act(accepted,context(),replacement({expectedRevision:2}));
 assert.deepEqual(view(next).assignments[0].transitions.map(t=>t.status),['pending','accepted','replaced']);assert.deepEqual(next.actions.slice(0,2),accepted.actions);assert.equal(view(accepted).status,'accepted');
});
