import {isExitClosure,isCollectivelyClosed,canParticipate} from '../src/coaching-session-control.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import * as coaching from '../src/coaching.mjs';
import * as preparation from '../src/coaching-preparation.mjs';
import * as tracer from '../src/coaching-tracer.mjs';
import * as search from '../src/coaching-search.mjs';
import {sessionView} from '../src/coaching-session-flow.mjs';
import {createCoachingQa,selectQaPerspective} from '../src/coaching-qa.mjs';
import {createReferenceAssignmentState,applyReferenceAssignmentAction,getReferenceAssignment} from '../src/coaching-reference-assignment.mjs';
import {CoachingScreen} from '../src/coaching-screen.mjs';

const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
const user={user_id:'creator-fixture-user-113',name:'Simulated creator'};
const dogs=[{id:'creator-fixture-dog-127',name:'Fixture'}];
const reference=()=>({id:'creator-fixture-reference-131',name:'Visible fixture reference',source:'draw',ownerId:'alex',start:{x:217,y:139,space:'mock-map'}});
function draft(mode='normal',role='driver',combined=false){
 let d=coaching.selectCreatorRole(coaching.updateDraft(coaching.createDraft(user,dogs),{mode,traceType:'prepared'}),role);
 if(combined)d=coaching.assignRole(d,'traceur',d.roles.coach);
 // Explicit scenario data: reference selected by another participant, not a
 // simulated click by a blind Conducteur or evidence of an actual remote user.
 return {...d,preparationTrack:reference(),knownPeople:[]};
}
const plain=value=>JSON.parse(JSON.stringify(value));
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function application(d=draft()){
 let sequence=0;
 const c=createContext({isExitClosure,isCollectivelyClosed,canParticipate,cleanupCoachingExit:()=>{},exitSavePending:false,normalCoachingBeforeQa:null,coaching,preparation,tracer,search,createReferenceAssignmentState,applyReferenceAssignmentAction,getReferenceAssignment,createCoachingQa,selectQaPerspective,
  structuredClone,TypeError,coachingDraft:d,currentUser:user,authUser:user,qaInitialized:false,qaMode:'normal',qaScenario:'connected_traceur',mock:{dog:dogs[0]},
  tracerState:tracer.createTracer(),searchState:search.createSearch(),tracerUI:{},searchUI:{},debriefUI:{},preparationState:null,preparationUI:{},terrainOpen:false,
  crypto:{randomUUID:()=>`simulation-creator-uuid-${++sequence}`},Date:class extends Date{constructor(...args){super(...(args.length?args:['2026-10-10T13:00:00.000Z']));}},
  Toast:message=>{c.notice=message;},ConfirmationDialog:options=>{c.dialog=options;},trackLibrary:{list:()=>[reference()]}});
 c.auth={getSession:()=>({user:c.authUser})};
 const start=app.indexOf('let coachingReferenceAssignment=');
 runInContext(app.slice(start,app.indexOf('let tracerState=',start)),c);
 runInContext(app.slice(app.indexOf('function coachingActionContext('),app.indexOf('\nlet trackLibrary=')),c);
 c.render=()=>{};
 runInContext(`(function(){const action='create';${app.slice(app.indexOf("  if(action==='create')"),app.indexOf("  if(action==='restart')"))}})()`,c);
 // Isolated legacy command fixture: actual creation is verified by automatic integration tests.
 runInContext('const legacyContext=coachingReferenceAssignment.context;coachingReferenceAssignment=Object.freeze({context:legacyContext,state:createReferenceAssignmentState(legacyContext)});',c);
 return {
  c,
  get assignment(){return runInContext('coachingReferenceAssignment',c);},
  get view(){return runInContext('typeof coachingReferenceAssignmentView === "function" ? coachingReferenceAssignmentView() : null',c);},
  submit(patch={}){
   const state=this.assignment?.state,context=this.assignment?.context;
   const dataset={sessionId:state?.sessionId,referenceId:context?.references[0]?.id,revision:String(state?.references[reference().id]?.revision??0),...patch};
   c.event={preventDefault(){},target:{matches:selector=>selector==='[data-reference-assignment]',dataset,elements:{beneficiary:{value:patch.beneficiary??c.coachingDraft.session?.roles.traceur}}}};
   c.dialog=null;
   const start=app.indexOf(" if(event.target.matches('[data-reference-assignment]'))");
   if(start>=0)runInContext(`(function(){${app.slice(start,app.indexOf('\n',start))}})()`,c);
   return c.dialog;
  },
  confirm(){assert.ok(c.dialog,'The real application submit handler must open explicit confirmation');c.dialog.onConfirm();},
  html(){return CoachingScreen(c.coachingDraft,'',[],[],{},this.view);},
  projection(){const p=c.preparationState,s=c.searchState,t=c.tracerState;return {preparation:preparation.preparationView(p),search:search.searchView(s,p,{now:1000}),session:sessionView(s,p,t)};}
 };
}
function pending(a){const s=a.assignment.state;return getReferenceAssignment(s,reference().id);}
function confirmed(a){a.submit();a.confirm();return pending(a);}

test('actual submit opens confirmation and only explicit confirmation assigns to session Traceur',()=>{
 const a=application(),before=a.assignment;assert.ok(a.view,'Compatible creator must have an application entry point');
 const html=a.html();assert.doesNotMatch(html,/data-reference-assignment/);
 a.submit();assert.equal(a.assignment,before);a.confirm();const result=pending(a);
 assert.equal(result.status,'pending');assert.equal(result.current.beneficiaryParticipantId,a.c.coachingDraft.session.roles.traceur);assert.equal(result.revision,1);
 assert.match(a.html(),/En attente d’acceptation/);assert.doesNotMatch(a.html(),/data-reference-assignment(?:\s|>)/);
});
test('application action has exact required fields, explicit author, local clock and UUIDs',()=>{
 const a=application();confirmed(a);const action=a.assignment.state.actions[0];
 assert.deepEqual(Object.keys(action).sort(),['actionId','sessionId','referenceId','authorParticipantId','beneficiaryParticipantId','type','occurredAt','origin','assurance','delegationId','expectedRevision','assignmentId'].sort());
 assert.equal(action.authorParticipantId,a.c.coachingDraft.sessionCreation.creatorParticipantId);assert.equal(action.beneficiaryParticipantId,'alex');assert.equal(action.sessionId,a.c.coachingDraft.session.id);assert.equal(action.referenceId,reference().id);
 assert.equal(action.type,'assign');assert.equal(action.origin,'simulation:coaching-reference-assignment');assert.equal(action.assurance,'local-simulation');assert.equal(action.delegationId,null);assert.equal(action.expectedRevision,0);
 assert.equal(action.occurredAt,'2026-10-10T13:00:00.000Z');assert.match(action.actionId,/^simulation-creator-uuid-/);assert.match(action.assignmentId,/^simulation-creator-uuid-/);assert.notEqual(action.actionId,action.assignmentId);
});
test('assignment never accepts, creates pose evidence, delegates or mutates source state',()=>{
 const a=application(),before=a.assignment,snapshot=structuredClone(before),session=freeze(a.c.coachingDraft.session),original=structuredClone(session);
 confirmed(a);assert.deepEqual(plain(before),plain(snapshot));assert.deepEqual(session,original);assert.equal(pending(a).current.status,'pending');assert.deepEqual(pending(a).current.transitions.map(t=>t.status),['pending']);
 assert.equal(a.assignment.state.events,undefined);assert.equal(a.assignment.state.references[reference().id].locked,false);assert.deepEqual(plain(a.assignment.context.delegations),[]);
});
for(const mode of ['normal','simple_blind','full_blind'])for(const role of ['driver','coach','traceur'])test(`existing reference visibility controls creator action: ${mode}/${role}`,()=>{
 const a=application(draft(mode,role)),visible=coaching.canSeeReference(mode,role,false);
 assert.equal(Boolean(a.view),visible);if(visible){assert.equal(confirmed(a).status,'pending');}else{assert.doesNotMatch(a.html(),/data-reference-assignment/);assert.equal(a.submit(),null);assert.equal(pending(a).status,'none');}
});
for(const mode of ['normal','simple_blind','full_blind'])test(`Coach + Traceur follows existing visibility without extra read rights: ${mode}`,()=>{
 const a=application(draft(mode,'coach',true)),before=a.projection();confirmed(a);assert.deepEqual(a.projection(),before);assert.equal(pending(a).current.beneficiaryParticipantId,'self');
});
for(const mode of ['normal','simple_blind','full_blind'])test(`creator Observer perspective never adds reference rights: ${mode}`,()=>{
 const a=application(coaching.setObservers(draft(mode,'coach'),['self']));a.c.preparationState=preparation.simulate(a.c.preparationState,{viewerFunction:'observer'});
 assert.equal(preparation.preparationView(a.c.preparationState).role,'observer');
 const visible=coaching.canSeeReference(mode,'coach',false);assert.equal(Boolean(a.view),visible);
 if(visible)assert.equal(confirmed(a).current.createdByParticipantId,'self');else{assert.equal(a.submit(),null);assert.equal(pending(a).status,'none');}
});
test('non-creator user cannot act, including stale currentUser after auth identity changes',()=>{
 const a=application();a.c.authUser={user_id:'another-user'};assert.equal(a.view,null);assert.equal(a.submit(),null);assert.equal(pending(a).status,'none');
});
test('DEV perspective of another participant never acts as creator identity',()=>{
 const a=application();a.c.preparationState=preparation.simulate(a.c.preparationState,{viewerRole:'traceur'});assert.equal(a.c.preparationState.viewerId,'alex');assert.equal(a.view,null);assert.equal(a.submit(),null);assert.equal(pending(a).status,'none');
});
test('local alias without matching user identity cannot act',()=>{
 const a=application();a.c.coachingDraft={...a.c.coachingDraft,identityContext:{...a.c.coachingDraft.identityContext,userId:null}};assert.equal(a.view,null);assert.equal(a.submit(),null);assert.equal(pending(a).status,'none');
});
for(const beneficiary of ['camille','outside-participant'])test(`beneficiary refused before action generation: ${beneficiary}`,()=>{
 const a=application();assert.equal(a.submit({beneficiary}),null);assert.equal(pending(a).status,'none');assert.deepEqual(a.assignment.state.actions,[]);
});
for(const [name,patch] of [['wrong session',{sessionId:'another-session'}],['wrong reference',{referenceId:'another-reference'}],['stale revision',{revision:'3'}],['invalid revision',{revision:'NaN'}]])test(`submitted confirmation refused: ${name}`,()=>{
 const a=application();assert.equal(a.submit(patch),null);assert.equal(pending(a).status,'none');
});
test('missing reference cannot expose action or execute',()=>{
 const a=application();a.c.coachingDraft={...a.c.coachingDraft,session:{...a.c.coachingDraft.session,preparation:null}};assert.equal(a.view,null);assert.equal(a.submit(),null);assert.equal(pending(a).status,'none');
});
test('double click and concurrent stale dialog cannot create a second initial assignment',()=>{
 const a=application(),first=a.submit(),second=a.submit();assert.ok(first);assert.ok(second);first.onConfirm();const state=a.assignment;second.onConfirm();assert.equal(a.assignment,state);assert.equal(state.state.actions.length,1);assert.equal(a.submit(),null);
});
test('auth identity is rechecked at confirmation, leaving original state on refusal',()=>{
 const a=application();a.submit();const state=a.assignment;a.c.authUser={user_id:'other-user'};a.confirm();assert.equal(a.assignment,state);assert.equal(pending(a).status,'none');
});
test('beneficiary current function is rechecked before confirmation',()=>{
 const a=application();a.submit();const state=a.assignment;a.c.coachingDraft={...a.c.coachingDraft,session:{...a.c.coachingDraft.session,roles:{...a.c.coachingDraft.session.roles,traceur:'camille'}}};a.confirm();assert.equal(a.assignment,state);assert.equal(pending(a).status,'none');
});
test('session change invalidates state and an old confirmation cannot transfer assignment',()=>{
 const a=application();a.submit();const state=a.assignment;a.c.coachingDraft=coaching.updateDraft(a.c.coachingDraft,{mode:'normal'});runInContext('invalidateCoachingReferenceAssignment();',a.c);assert.equal(a.assignment,null);a.confirm();assert.equal(a.assignment,null);assert.deepEqual(state.state.actions,[]);
});
test('QA resets independently and an outstanding confirmation cannot populate QA',()=>{
 const a=application();a.submit();const start=app.indexOf('function resetCoachingQa(');runInContext(app.slice(start,app.indexOf('function renderCoachingQa(',start))+'\nresetCoachingQa();',a.c);a.confirm();assert.equal(a.assignment,null);
});
for(const phase of ['active','finished','in_place'])test(`already started pose blocks initial assignment without adding locks: ${phase}`,()=>{
 const a=application();a.c.tracerState={...a.c.tracerState,phase};assert.equal(a.view,null);assert.equal(a.submit(),null);assert.equal(pending(a).locked,false);assert.equal(pending(a).status,'none');
});
test('pose starting while dialog is open refuses confirmation',()=>{
 const a=application();a.submit();a.c.tracerState={...a.c.tracerState,phase:'active',segments:[[{x:221,y:173}]]};a.confirm();assert.equal(pending(a).status,'none');assert.equal(pending(a).locked,false);
});
test('existing module lock is respected without generating unlock or assignment',()=>{
 const a=application();a.c.locked=applyReferenceAssignmentAction(a.assignment.state,{...a.assignment.context,references:[{id:reference().id,layingStarted:true}]});runInContext('coachingReferenceAssignment=Object.freeze({...coachingReferenceAssignment,state:locked});',a.c);
 assert.equal(a.view,null);assert.equal(a.submit(),null);assert.equal(pending(a).locked,true);
});
test('rendering and cancelling confirmation produce no action or timestamp',()=>{
 const a=application(),state=a.assignment;for(let i=0;i<3;i++){a.html();assert.equal(a.assignment,state);}a.submit();assert.equal(a.assignment,state);assert.deepEqual(state.state.actions,[]);
});
test('assignment changes no original projections or historical role capabilities',()=>{
 const a=application(),before=structuredClone(a.projection()),capabilities=coaching.roleCapabilities('full_blind','driver');confirmed(a);assert.deepEqual(a.projection(),before);assert.deepEqual(coaching.roleCapabilities('full_blind','driver'),capabilities);assert.equal(capabilities.readReference,false);
});
test('historical screen output is identical without assignment presentation',()=>{
 const a=application(),normalize=html=>html.replace(/piste-emblem-\d+/g,'piste-emblem-N');
 assert.equal(normalize(CoachingScreen(a.c.coachingDraft)),normalize(CoachingScreen(a.c.coachingDraft,'',[],[],{},null)));
});
test('assignment widget exposes no geometry or new protected metadata',()=>{
 const a=application();assert.ok(a.view);assert.deepEqual(Object.keys(plain(a.view)).sort(),['sessionId','referenceId','referenceName','revision','status','beneficiaries','beneficiaryName'].sort());assert.equal(a.view.start,undefined);assert.equal(a.view.ownerId,undefined);
 assert.doesNotMatch(a.html(),/data-reference-assignment|data-reference-delegation/);
});
