import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decideCoachingPermission} from '../src/coaching-permissions.mjs';

// Explicit trusted model context, not an identity inferred from a screen.
function fixture(role='driver',mode='normal',phase='PREPARATION'){
 const ids={driver:'driver-17',traceur:'tracer-29',coach:'coach-43',observer:'observer-61'};
 return {
  context:{
   session:{id:'session-101',mode,phase,participantIds:Object.values(ids)},
   requester:{id:ids[role],assignedFunctions:[role],actingFunction:role},
   reference:{id:'reference-203',sessionId:'session-101',ownerParticipantId:ids.traceur,poserParticipantId:ids.traceur,provenance:'prepared'}
  },
  request:{permission:'reference.read',sessionId:'session-101',referenceId:'reference-203'}
 };
}
const decide=({context,request})=>decideCoachingPermission(context,request);
const expectDecision=(f,allowed,reason)=>assert.deepEqual(decide(f),{allowed,reason});
for(const mode of ['normal','simple_blind','full_blind'])for(const role of ['driver','traceur','coach','observer']){
 test(`terrain ${mode}/${role}: independent reference visibility`,()=>{
  const allowed=mode==='normal'||role==='traceur'||mode==='simple_blind'&&['coach','observer'].includes(role);
  expectDecision(fixture(role,mode),allowed,allowed?'REFERENCE_VISIBLE':'BLIND_REFERENCE_DENIED');
 });
 for(const phase of ['DEBRIEF','ARCHIVED'])test(`${phase} ${mode}/${role}: D04 authorized participant reads complete available reference`,()=>{
  expectDecision(fixture(role,mode,phase),true,'POST_SESSION_REFERENCE_VISIBLE');
 });
}
for(const phase of ['LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING','SEARCH_FINISHED'])test(`${phase}: blind terrain confidentiality persists until debrief`,()=>{
 expectDecision(fixture('driver','full_blind',phase),false,'BLIND_REFERENCE_DENIED');
});
test('Double blind Coach plus Traceur poser retains own reference in Coach context',()=>{
 const f=fixture('coach','full_blind');f.context.requester.assignedFunctions=['coach','traceur'];
 f.context.reference.poserParticipantId=f.context.requester.id;
 expectDecision(f,true,'COACH_POSER_REFERENCE_VISIBLE');
});
test('Coach non-poser gets no Double blind exception from functions alone',()=>{
 const f=fixture('coach','full_blind');f.context.requester.assignedFunctions=['coach','traceur'];
 expectDecision(f,false,'BLIND_REFERENCE_DENIED');
});
test('Coach owner without demonstrated pose gets no Double blind poser exception',()=>{
 const f=fixture('coach','full_blind');f.context.requester.assignedFunctions=['coach','traceur'];
 f.context.reference.ownerParticipantId=f.context.requester.id;f.context.reference.poserParticipantId=null;
 expectDecision(f,false,'BLIND_REFERENCE_DENIED');
});
test('Coach without assigned Traceur function cannot use a poser exception',()=>{
 const f=fixture('coach','full_blind');f.context.reference.poserParticipantId=f.context.requester.id;
 expectDecision(f,false,'BLIND_REFERENCE_DENIED');
});
for(const actingFunction of ['driver','traceur'])test(`Normal Conducteur plus Traceur can read with assigned ${actingFunction} context`,()=>{
 const f=fixture();f.context.requester.assignedFunctions=['driver','traceur'];f.context.requester.actingFunction=actingFunction;
 expectDecision(f,true,'REFERENCE_VISIBLE');
});
for(const mode of ['simple_blind','full_blind'])for(const actingFunction of ['traceur','coach','observer'])test(`${mode}: blind Conducteur cannot escape restrictions through ${actingFunction} context`,()=>{
 const f=fixture('driver',mode);f.context.requester.assignedFunctions=['driver',actingFunction];f.context.requester.actingFunction=actingFunction;
 f.context.reference.poserParticipantId=f.context.requester.id;
 expectDecision(f,false,'BLIND_DRIVER_REFERENCE_DENIED');
});
for(const mode of ['simple_blind','full_blind'])test(`${mode}: Traceur cannot read another participant's protected reference`,()=>{
 const f=fixture('traceur',mode);f.context.reference.ownerParticipantId='coach-43';f.context.reference.poserParticipantId='coach-43';
 expectDecision(f,false,'REFERENCE_NOT_OWNED');
});
test('Traceur with explicit reference ownership and no recorded poser can read own reference',()=>{
 const f=fixture('traceur','full_blind');f.context.reference.poserParticipantId=null;
 expectDecision(f,true,'REFERENCE_VISIBLE');
});
const negatives=[
 ['missing context',f=>f.context=null,'INVALID_CONTEXT'],
 ['missing request',f=>f.request=null,'INVALID_REQUEST'],
 ['unknown permission',f=>f.request.permission='session.close','UNKNOWN_PERMISSION'],
 ['missing permission',f=>delete f.request.permission,'UNKNOWN_PERMISSION'],
 ['missing session',f=>delete f.context.session,'INVALID_SESSION'],
 ['missing session identity',f=>delete f.context.session.id,'INVALID_SESSION'],
 ['wrong requested session',f=>f.request.sessionId='session-other','SESSION_MISMATCH'],
 ['unknown mode',f=>f.context.session.mode='unknown','UNKNOWN_MODE'],
 ['missing mode',f=>delete f.context.session.mode,'UNKNOWN_MODE'],
 ['unknown phase',f=>f.context.session.phase='unknown','UNKNOWN_PHASE'],
 ['missing phase',f=>delete f.context.session.phase,'UNKNOWN_PHASE'],
 ['missing requester',f=>delete f.context.requester,'UNKNOWN_REQUESTER'],
 ['missing requester identity',f=>delete f.context.requester.id,'UNKNOWN_REQUESTER'],
 ['unknown participant',f=>f.context.requester.id='outsider','NOT_SESSION_PARTICIPANT'],
 ['missing membership',f=>delete f.context.session.participantIds,'INVALID_MEMBERSHIP'],
 ['invalid membership',f=>f.context.session.participantIds=['driver-17',null],'INVALID_MEMBERSHIP'],
 ['missing functions',f=>delete f.context.requester.assignedFunctions,'INVALID_FUNCTIONS'],
 ['unknown assigned function',f=>f.context.requester.assignedFunctions=['admin'],'INVALID_FUNCTIONS'],
 ['missing acting function',f=>delete f.context.requester.actingFunction,'FUNCTION_NOT_ASSIGNED'],
 ['unassigned acting function',f=>f.context.requester.actingFunction='traceur','FUNCTION_NOT_ASSIGNED'],
 ['missing reference',f=>delete f.context.reference,'INVALID_REFERENCE'],
 ['missing reference identity',f=>delete f.context.reference.id,'INVALID_REFERENCE'],
 ['wrong requested reference',f=>f.request.referenceId='reference-other','REFERENCE_MISMATCH'],
 ['reference from another session',f=>f.context.reference.sessionId='session-other','REFERENCE_SESSION_MISMATCH'],
 ['missing provenance',f=>delete f.context.reference.provenance,'INVALID_REFERENCE_PROVENANCE'],
 ['unknown provenance',f=>f.context.reference.provenance='screen-coach','INVALID_REFERENCE_PROVENANCE'],
 ['missing owner and poser',f=>{delete f.context.reference.ownerParticipantId;delete f.context.reference.poserParticipantId;},'INVALID_REFERENCE_IDENTITY'],
 ['unknown reference owner',f=>f.context.reference.ownerParticipantId='outsider','INVALID_REFERENCE_IDENTITY'],
 ['unknown reference poser',f=>f.context.reference.poserParticipantId='outsider','INVALID_REFERENCE_IDENTITY']
];
for(const [name,change,reason] of negatives)test(`default refusal: ${name}`,()=>{const f=fixture();change(f);expectDecision(f,false,reason);});
for(const provenance of ['gpx','recorded-mock','recorded-gps'])test(`explicit provenance ${provenance} is accepted without generating data`,()=>{
 const f=fixture('traceur','full_blind');f.context.reference.provenance=provenance;expectDecision(f,true,'REFERENCE_VISIBLE');
});
function deepFreeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;}
test('frozen inputs remain unchanged for allowed and refused decisions',()=>{
 for(const mode of ['normal','full_blind']){
  const f=deepFreeze(fixture('driver',mode)),before=structuredClone(f);
  decide(f);assert.deepEqual(f,before);
 }
});
test('same explicit context gives deterministic and independent results',()=>{
 const f=fixture(),first=decide(f),second=decide(structuredClone(f));
 assert.deepEqual(first,second);first.allowed=false;assert.equal(decide(f).allowed,true);
});
test('refusal exposes no spatial values or private fields',()=>{
 const f=fixture('driver','full_blind');f.context.reference.coordinates={x:143,y:97};f.context.reference.secret='PRIVATE-SENTINEL';
 const result=decide(f);assert.deepEqual(Object.keys(result),['allowed','reason']);
 assert.ok(!JSON.stringify(result).includes('PRIVATE-SENTINEL'));assert.equal(result.allowed,false);
});
