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
import {PreparationScreen} from '../src/coaching-preparation-screen.mjs';
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

test('creation automatically records one pending transmission to selected Traceur',()=>{const a=application();const s=a.assignment.state;assert.equal(s.actions.length,1);assert.equal(s.actions[0].type,'assign');assert.equal(s.actions[0].beneficiaryParticipantId,a.c.coachingDraft.session.roles.traceur);assert.equal(s.actions[0].origin,'simulation:coaching-reference-automatic');assert.equal(s.references[reference().id].assignments[0].status,'pending');assert.equal(s.delegationLedger,undefined);});
test('session screen has no transmission or delegation command',()=>{const a=application();const h=CoachingScreen(a.c.coachingDraft,'',[],[],{},a.view,runInContext('coachingReferenceDelegationView()',a.c));assert.doesNotMatch(h,/data-reference-assignment|data-reference-delegation|DÉLÉGATIONS COACH/);assert.match(h,/En attente d’acceptation/);});
test('repeated creation retains exact transmission state',()=>{const a=application(),before=a.assignment;runInContext(`(function(){const action='create';${app.slice(app.indexOf("  if(action==='create')"),app.indexOf("  if(action==='restart')"))}})()`,a.c);assert.equal(a.assignment,before);assert.equal(a.assignment.state.actions.length,1);});
test('designated Coach assigns by role without creating a delegation',()=>{const a=application();const context=a.assignment.context;const empty=createReferenceAssignmentState(context);const action={...a.assignment.state.actions[0],actionId:'coach-role-action',assignmentId:'coach-role-assignment',authorParticipantId:'camille',delegationId:null};const s=applyReferenceAssignmentAction(empty,context,action);assert.equal(s.actions[0].authorParticipantId,'camille');assert.equal(s.delegationLedger,undefined);});
test('loss of Coach role removes assignment authority',()=>{const a=application();const context=structuredClone(a.assignment.context);context.participants.find(p=>p.id==='camille').functions=['observer'];const action={...a.assignment.state.actions[0],authorParticipantId:'camille'};assert.throws(()=>applyReferenceAssignmentAction(createReferenceAssignmentState(context),context,action),/NOT_ASSIGNMENT_AUTHORITY/);});
for(const mode of ['normal','simple_blind','full_blind'])test(`automatic transmission does not change visibility ${mode}`,()=>{const a=application(draft(mode));assert.equal(a.assignment.state.actions.length,1);if(mode!=='normal')assert.equal(a.view,null);assert.equal(a.c.preparationState.physicalLaid,false);assert.equal(a.c.searchState.phase,'PREPARATION');});
for(const type of ['direct','none'])test(`no automatic transmission without selected reference: ${type}`,()=>{const d=coaching.updateDraft(coaching.createDraft(user,dogs),{mode:'normal',traceType:type});const a=application(d);assert.equal(a.assignment,null);});
for(const scenario of ['external_traceur','external_driver_recorded'])test(`external Traceur receives no synthetic assignment: ${scenario}`,()=>{const a=application(coaching.setTrackingScenario(draft(),scenario));assert.equal(a.c.coachingDraft.session.roles.traceur,null);assert.equal(a.assignment.state.actions.length,0);});
test('self Traceur can explicitly accept automatic transmission',()=>{const a=application(coaching.setTrackingScenario(draft(),'self_trace'));const v=runInContext('coachingReferenceResponseView()',a.c);assert.equal(v?.status,'pending');assert.equal(v.simulated,false);});
test('unknown authority policy is rejected instead of granting role rights',()=>{const a=application();assert.throws(()=>createReferenceAssignmentState({...a.assignment.context,assignmentAuthority:'all'}),/INVALID_ASSIGNMENT_AUTHORITY/);});
for(const author of ['alex','self'])test(`role policy author retains expected permissions: ${author}`,()=>{const a=application();const action={...a.assignment.state.actions[0],authorParticipantId:author};if(author==='alex')assert.throws(()=>applyReferenceAssignmentAction(createReferenceAssignmentState(a.assignment.context),a.assignment.context,action),/NOT_ASSIGNMENT_AUTHORITY/);else assert.equal(applyReferenceAssignmentAction(createReferenceAssignmentState(a.assignment.context),a.assignment.context,action).actions.length,1);});
