import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as model from '../src/coaching.mjs';
import {createPreparation,preparationView} from '../src/coaching-preparation.mjs';
const dogs=[{id:'action-dog',name:'Nox'}];
const track=()=>({id:'action-track-17',name:'Simulated reference',source:'draw',ownerId:'alex',start:{x:173,y:91,space:'mock-map'}});
const draft=(user={user_id:'action-user-29',name:'Fixture'})=>model.updateDraft(model.createDraft(user,dogs),{mode:'normal',traceType:'prepared'});
const author=(userId='action-user-29',participantId='self')=>({userId,participantId,source:'mock-auth',assurance:'local-simulation'});
const selection=(patch={})=>({actionId:'action-select-41',type:'reference-selection',author:author(),occurredAt:'2026-10-10T10:01:00.000Z',origin:'simulation:track-library-selection',sessionId:null,referenceId:'action-track-17',beneficiaryParticipantId:null,...patch});
const assignment=(patch={})=>({actionId:'action-role-43',type:'function-assignment',author:author(),occurredAt:'2026-10-10T10:02:00.000Z',origin:'simulation:coaching-role-selection',sessionId:null,referenceId:null,beneficiaryParticipantId:'alex',assignedFunction:'traceur',...patch});
const creation=(patch={})=>({actionId:'action-create-47',type:'session-creation',author:author(),occurredAt:'2026-10-10T10:03:00.000Z',origin:'simulation:coaching-session-creation',sessionId:null,referenceId:'action-track-17',beneficiaryParticipantId:null,selectionActionId:'action-select-41',...patch});
const selected=()=>model.selectPreparation(draft(),track(),selection());
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
test('selection retains caller envelope with author, original date and reference before session',()=>{
 const d=selected();assert.deepEqual(d.preparationActions,[selection()]);assert.equal(d.session,null);assert.equal(d.preparationActions[0].sessionId,null);assert.equal(d.preparationTrack.ownerId,'alex');assert.notEqual(d.preparationActions[0].author.participantId,d.preparationTrack.ownerId);
});
test('unknown author is never silently replaced by self',()=>{
 const d=model.selectPreparation(draft(null),track(),selection({author:author(null,null)}));assert.deepEqual(d.preparationActions[0].author,author(null,null));
});
test('GPX fixture is a simulated selection, never a real import',()=>{
 const d=model.updateDraft(draft(),{traceType:'gpx'}),t={...track(),source:'gpx',fileName:'fixture.gpx'},e=selection({origin:'simulation:gpx-fixture-selection'});
 const next=model.selectPreparation(d,t,e);assert.equal(next.preparationActions[0].origin,e.origin);assert.equal(next.preparationActions[0].type,'reference-selection');assert.equal(next.preparationActions.length,1);assert.ok(!('events' in next));
});
test('function assignment retains author distinct from beneficiary and no reference attribution',()=>{
 const d=model.assignRole(draft(),'traceur','alex',assignment());assert.deepEqual(d.preparationActions,[assignment()]);assert.equal(d.roles.traceur,'alex');assert.equal(d.preparationActions[0].referenceId,null);assert.ok(!('assignments' in d));
});
test('explicit removal of function retains null beneficiary',()=>{
 const d=model.assignRole(draft(),'coach',null,assignment({beneficiaryParticipantId:null,assignedFunction:'coach'}));assert.equal(d.roles.coach,null);assert.equal(d.preparationActions[0].beneficiaryParticipantId,null);
});
test('creation binds selection explicitly without rewriting selection date or session id',()=>{
 const before=selected(),next=model.createSession(before,creation()),e=next.preparationActions.at(-1);
 assert.equal(e.sessionId,next.session.id);assert.equal(e.selectionActionId,'action-select-41');assert.equal(e.referenceId,'action-track-17');assert.equal(next.preparationActions[0].occurredAt,selection().occurredAt);assert.equal(next.preparationActions[0].sessionId,null);
 assert.deepEqual(next.sessionCreation,{sessionId:next.session.id,creatorUserId:'action-user-29',creatorParticipantId:'self',createdAt:creation().occurredAt,actionId:creation().actionId});assert.equal(before.session,null);
});
test('creator remains immutable under active creator-function changes and idempotent creation',()=>{
 const ready=model.createSession(selected(),creation()),snapshot=structuredClone(ready.sessionCreation);
 const changed=model.selectCreatorRole(ready,'coach');assert.deepEqual(changed.sessionCreation,snapshot);
 assert.equal(model.createSession(ready,creation({actionId:'another-action'})),ready);assert.ok(Object.isFrozen(ready.sessionCreation));
});
test('creation without explicit selection binding does not infer one',()=>{
 const {selectionActionId,...e}=creation();const d=model.createSession(selected(),e);assert.ok(!('selectionActionId' in d.preparationActions.at(-1)));
});
test('unknown creator retained as unknown with supplied date',()=>{
 const d=model.selectPreparation(draft(null),track(),selection({author:author(null,null)}));const next=model.createSession(d,creation({author:author(null,null)}));assert.equal(next.sessionCreation.creatorUserId,null);assert.equal(next.sessionCreation.creatorParticipantId,null);
});
test('historical calls generate no action id, date or creator identity',()=>{
 let d=model.selectPreparation(draft(),track());d=model.assignRole(d,'traceur','alex');d=model.createSession(d);assert.equal(d.preparationActions,undefined);assert.equal(d.sessionCreation,undefined);
 assert.equal(model.draftFromTrack({name:'Legacy'},dogs,track()).preparationActions,undefined);
});
test('library reuse accepts explicit selection and retains legacy reference fields',()=>{
 const d=model.draftFromTrack({user_id:'action-user-29',name:'Fixture'},dogs,track(),selection());assert.deepEqual(d.preparationActions,[selection()]);assert.deepEqual(d.preparationTrack,track());
});
test('sync rename, deletion and reselection preserve history without changing action data',()=>{
 let d=selected(),snapshot=structuredClone(d.preparationActions);d=model.syncPreparation(d,[{...track(),name:'Renamed'}]);assert.equal(d.preparationTrack.name,'Renamed');assert.deepEqual(d.preparationActions,snapshot);
 d=model.syncPreparation(d,[]);assert.equal(d.preparationTrack,null);assert.deepEqual(d.preparationActions,snapshot);
 d=model.selectPreparation(d,track(),selection({actionId:'reselect'}));assert.equal(d.preparationActions.length,2);
});
test('draft transitions preserve action history',()=>{
 const d=selected(),s=d.preparationActions;
 for(const next of [model.updateDraft(d,{mode:'normal'}),model.goToStep(d,'roles'),model.setObservers(d,['lea']),model.selectCreatorRole(d,'traceur'),model.setTrackingScenario(d,'self_trace')])assert.deepEqual(next.preparationActions,s);
});
test('frozen inputs and prior histories remain unchanged; stored actions are independent',()=>{
 const d=freeze(draft()),t=freeze(track()),e=selection(),snapshot=structuredClone({d,t,e});const next=model.selectPreparation(d,t,e);e.author.userId='changed';assert.deepEqual(d,snapshot.d);assert.deepEqual(t,snapshot.t);assert.deepEqual(next.preparationActions[0],snapshot.e);
 const after=model.assignRole(next,'traceur','alex',freeze(assignment()));assert.equal(next.preparationActions.length,1);assert.equal(after.preparationActions.length,2);assert.ok(Object.isFrozen(after.preparationActions[0].author));
});
test('permissions, session shape and preparation projection are identical to legacy flow',()=>{
 const tracked=model.createSession(selected(),creation()),legacy=model.createSession(model.selectPreparation(draft(),track()));
 const {id:a,code:b,...trackedSession}=tracked.session,{id:c,code:e,...legacySession}=legacy.session;assert.deepEqual(trackedSession,legacySession);
 // Compare the same session identity: sequential legacy creation increments its
 // existing mock counter, independently of action tracking.
 const x=preparationView(createPreparation(tracked.session)),y=preparationView(createPreparation({...legacy.session,id:tracked.session.id,code:tracked.session.code}));assert.deepEqual(x,y);
 assert.deepEqual(model.roleCapabilities('full_blind','coach'),{readReference:false,prepare:false,edit:false,manage:true,create:true});
});
for(const [name,patch] of [
 ['missing id',{actionId:null}],['missing date',{occurredAt:null}],['bad date',{occurredAt:'2026-02-30T10:01:00.000Z'}],['wrong reference',{referenceId:'another-reference'}],['premature session',{sessionId:'invented-session'}],['wrong type',{type:'pose_attestation'}],['non-simulated origin',{origin:'real-gpx-import'}],['wrong author',{author:author('other-user','self')}],['alias without identity',{author:author(null,'self')}],['false assurance',{author:{...author(),assurance:'server-authenticated'}}]
])test(`invalid selection context refused: ${name}`,()=>assert.throws(()=>model.selectPreparation(draft(),track(),selection(patch))));
test('duplicate action id refused',()=>assert.throws(()=>model.selectPreparation(selected(),track(),selection())));
test('function context must match actual function and beneficiary',()=>{
 assert.throws(()=>model.assignRole(draft(),'coach','alex',assignment()));assert.throws(()=>model.assignRole(draft(),'traceur','camille',assignment()));
});
test('creation must bind only a recorded current reference selection',()=>{
 assert.throws(()=>model.createSession(selected(),creation({selectionActionId:'missing-action'})));
 assert.throws(()=>model.createSession(selected(),creation({referenceId:'another-reference'})));
});
test('application creates envelopes at all four real entry points without importing policy',()=>{
 const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
 assert.match(app,/crypto\.randomUUID\(\)/);assert.match(app,/new Date\(\)\.toISOString\(\)/);
 for(const operation of ['selectPreparation','draftFromTrack','assignRole','createSession'])assert.match(app,new RegExp(`coaching\\.${operation}\\([^;]*coachingActionContext`));
 assert.doesNotMatch(app,/import[^\n]*coaching-(permissions|reference-provenance)/);
});
test('actual application envelope helper uses explicit caller clock and UUID, and suppresses stale identity',()=>{
 const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
 const helper=app.slice(app.indexOf('function coachingActionContext('),app.indexOf('\nlet trackLibrary='));
 const sandbox={coachingDraft:draft(),currentUser:{user_id:'action-user-29'},crypto:{randomUUID:()=> 'application-fixture-uuid'},Date:class extends Date{constructor(){super('2026-10-10T11:00:00.000Z');}}};
 runInNewContext(helper+'\nthis.build=coachingActionContext;',sandbox);
 const e=JSON.parse(JSON.stringify(sandbox.build('reference-selection',{referenceId:track().id,origin:'simulation:track-library-selection'})));
 assert.equal(e.actionId,'application-fixture-uuid');assert.equal(e.occurredAt,'2026-10-10T11:00:00.000Z');assert.deepEqual(e.author,author());
 assert.deepEqual(model.selectPreparation(draft(),track(),e).preparationActions,[e]);
 sandbox.currentUser={user_id:'changed-user'};
 const unknown=JSON.parse(JSON.stringify(sandbox.build('reference-selection',{referenceId:track().id,origin:'simulation:track-library-selection'})));
 assert.deepEqual(unknown.author,author(null,null));assert.equal(unknown.sessionId,null);
});
test('selection and assignment dates remain separate from creator metadata after editing',()=>{
 let d=selected();d=model.assignRole(d,'traceur','alex',assignment());d=model.createSession(d,creation());
 assert.deepEqual(d.preparationActions.map(e=>e.occurredAt),[selection().occurredAt,assignment().occurredAt,creation().occurredAt]);
 assert.equal(d.sessionCreation.creatorParticipantId,'self');assert.equal(d.roles.traceur,'alex');assert.equal(d.session.preparation.ownerId,'alex');
});
