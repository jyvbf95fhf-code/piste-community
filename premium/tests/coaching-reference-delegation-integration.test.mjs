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
 const c=createContext({coaching,preparation,tracer,search,createReferenceAssignmentState,applyReferenceAssignmentAction,getReferenceAssignment,createCoachingQa,selectQaPerspective,
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

function delegationView(a){return runInContext('typeof coachingReferenceDelegationView === "function" ? coachingReferenceDelegationView() : null',a.c);}
function delegationSubmit(a,type='grant',patch={}){
 const v=delegationView(a),record=v?.records.find(d=>d.status==='active');
 a.c.event={preventDefault(){},target:{matches:s=>s==='[data-reference-delegation]',dataset:{command:type,sessionId:v?.sessionId,revision:String(v?.revision??0),delegationId:record?.id,...patch},elements:{beneficiary:{value:patch.beneficiary??(type==='revoke'?record?.beneficiaryParticipantId:'camille')}}}};
 a.c.dialog=null;
 const start=app.indexOf(" if(event.target.matches('[data-reference-delegation]'))");
 if(start>=0)runInContext(`(function(){${app.slice(start,app.indexOf('\n',start))}})()`,a.c);
 return a.c.dialog;
}
const ledger=a=>a.assignment.state.delegationLedger;
function grant(a){assert.ok(delegationSubmit(a),'Explicit grant confirmation is required');a.confirm();return ledger(a);}
function html(a){return CoachingScreen(a.c.coachingDraft,'',[],[],{},a.view,delegationView(a));}

test('creator sees Coach delegation controls without protected reference metadata',()=>{
 const a=application();assert.ok(delegationView(a));assert.doesNotMatch(html(a),/data-reference-delegation/);
 assert.doesNotMatch(html(a),/DÉLÉGATIONS COACH/);
});
test('grant is confirmed, explicit and recorded without changing references or projections',()=>{
 const a=application(),before=structuredClone({session:a.c.coachingDraft.session,projection:a.projection(),state:a.assignment.state});
 delegationSubmit(a);assert.equal(ledger(a),undefined);a.confirm();const l=ledger(a),action=l.actions[0];
 assert.equal(l.revision,1);assert.equal(l.records[0].status,'active');assert.equal(action.type,'delegation-grant');assert.equal(action.authorParticipantId,'self');assert.equal(action.beneficiaryParticipantId,'camille');assert.equal(action.permission,'reference.assign');assert.equal(action.expectedRevision,0);assert.equal(action.origin,'simulation:coaching-reference-delegation');assert.equal(action.assurance,'local-simulation');assert.equal(action.occurredAt,'2026-10-10T13:00:00.000Z');assert.notEqual(action.actionId,action.delegationId);
 assert.deepEqual(plain(a.assignment.state.references),plain(before.state.references));assert.deepEqual(plain(a.assignment.state.actions),[]);assert.deepEqual(a.projection(),before.projection);assert.deepEqual(a.c.coachingDraft.session,before.session);
});
test('cancelled confirmation has no effect',()=>{const a=application();assert.ok(delegationSubmit(a));a.c.dialog=null;assert.equal(ledger(a),undefined);});
test('revocation requires confirmation, conserves grant and forbids revived authority',()=>{
 const a=application();grant(a);const initial=structuredClone(ledger(a));assert.ok(delegationSubmit(a,'revoke'));assert.equal(ledger(a).revision,1);a.confirm();
 assert.equal(ledger(a).revision,2);assert.equal(ledger(a).records[0].status,'revoked');assert.deepEqual(plain(ledger(a).actions[0]),plain(initial.actions[0]));assert.equal(ledger(a).records[0].transitions.length,2);assert.doesNotMatch(html(a),/data-reference-delegation/);assert.equal(delegationSubmit(a,'revoke'),null);
 const action={actionId:'delegated-after-revoke',sessionId:a.assignment.state.sessionId,referenceId:reference().id,authorParticipantId:'camille',beneficiaryParticipantId:'alex',type:'assign',occurredAt:'2026-10-10T14:00:00.000Z',origin:'simulation:test',assurance:'local-simulation',delegationId:initial.records[0].id,expectedRevision:0,assignmentId:'attempt'};
 assert.throws(()=>applyReferenceAssignmentAction(a.assignment.state,a.assignment.context,action),/INVALID_DELEGATION/);
});
test('new grant after revocation creates a distinct identity and preserves terminal history',()=>{const a=application();grant(a);delegationSubmit(a,'revoke');a.confirm();const id=ledger(a).records[0].id;grant(a);assert.equal(ledger(a).records.length,2);assert.notEqual(ledger(a).records[1].id,id);assert.equal(ledger(a).records[0].status,'revoked');});
for(const patch of [{beneficiary:'alex'},{beneficiary:'outsider'},{command:'invalidate'},{sessionId:'foreign'},{revision:'9'},{revision:'NaN'}])test(`invalid delegation submission refused ${JSON.stringify(patch)}`,()=>{const a=application();assert.equal(delegationSubmit(a,'grant',patch),null);assert.equal(ledger(a),undefined);});
test('duplicate active grant is refused without new history',()=>{const a=application();grant(a);assert.equal(delegationSubmit(a),null);assert.equal(ledger(a).revision,1);});
test('stale confirmation and replay cannot add another command',()=>{const a=application();delegationSubmit(a);const confirm=a.c.dialog.onConfirm;grant(a);confirm();assert.equal(ledger(a).revision,1);});
for(const mode of ['normal','simple_blind','full_blind'])test(`delegation conveys no reference.read right in ${mode}`,()=>{const a=application(draft(mode,'driver')),before=a.projection();grant(a);assert.deepEqual(a.projection(),before);assert.equal(Boolean(a.view),mode==='normal');});
for(const change of [a=>{a.c.authUser=null;},a=>{a.c.authUser={user_id:'outsider'};},a=>{a.c.preparationState=preparation.simulate(a.c.preparationState,{viewerRole:'coach'});},a=>{a.c.qaInitialized=true;},a=>{a.c.coachingDraft=coaching.updateDraft(a.c.coachingDraft,{mode:'normal'});},a=>{a.c.searchState.phase='ARCHIVED';}])test(`changed context refuses pending confirmation ${change}`,()=>{const a=application();delegationSubmit(a);change(a);a.confirm();assert.equal(ledger(a),undefined);assert.equal(delegationView(a),null);});
test('terminal sessions expose no delegation controls',()=>{const a=application();for(const phase of ['DEBRIEF','ARCHIVED']){a.c.searchState.phase=phase;assert.equal(delegationView(a),null);}});
test('context changes do not invent function removal evidence or invalidation',()=>{const a=application();grant(a);a.c.coachingDraft={...a.c.coachingDraft,session:{...a.c.coachingDraft.session,roles:{...a.c.coachingDraft.session.roles,coach:null}}};assert.equal(delegationView(a),null);assert.equal(ledger(a).records[0].status,'active');assert.deepEqual(plain(ledger(a).functionEvents),[]);});
test('no Coach means no grant control; markup escapes beneficiary name',()=>{const a=application();a.c.coachingDraft.session.participants.find(p=>p.id==='camille').name='<script>x</script>';assert.doesNotMatch(html(a),/data-reference-delegation/);assert.doesNotMatch(html(a),/<script>x/);const b=application(coaching.assignRole(draft(),'coach',null));assert.ok(delegationView(b));assert.doesNotMatch(html(b),/data-command="grant"/);});
test('same-session initialization preserves ledger instance across renders',()=>{const a=application();grant(a);const initial=a.assignment;for(let i=0;i<3;i++)runInContext('initializeCoachingReferenceAssignment();invalidateCoachingReferenceAssignment();',a.c);assert.equal(a.assignment,initial);assert.equal(ledger(a).revision,1);});


test('Observer perspective stays read-only even for session creator',()=>{
 const a=application(coaching.setObservers(draft(),['self']));a.c.preparationState=preparation.simulate(a.c.preparationState,{viewerFunction:'observer'});
 assert.equal(delegationView(a),null);assert.equal(delegationSubmit(a),null);
});
test('revocation remains available during search without modifying tracking state',()=>{
 const a=application();grant(a);a.c.searchState={...a.c.searchState,phase:'SEARCH_RUNNING',searchTrackingState:'active'};const before=structuredClone(a.c.searchState);
 assert.ok(delegationSubmit(a,'revoke'));a.confirm();assert.deepEqual(a.c.searchState,before);assert.equal(ledger(a).records[0].status,'revoked');
});
