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

function responseView(a){return runInContext('typeof coachingReferenceResponseView === "function" ? coachingReferenceResponseView() : null',a.c);}
function recipient(a,enabled=true){a.c.preparationState=preparation.simulate(a.c.preparationState,{viewerRole:'traceur'});a.c.preparationUI.referenceResponseActor=enabled?{sessionId:a.assignment.state.sessionId,participantId:a.c.preparationState.viewerId}:null;}
function transmit(a){assert.equal(a.assignment.state.references[reference().id].assignments[0].status,'pending');}
function respond(a,type='accept',patch={}){
 const v=responseView(a);a.c.form={dataset:{command:type,sessionId:v?.sessionId,referenceId:v?.referenceId,assignmentId:v?.assignmentId,revision:String(v?.revision),...patch}};a.c.dialog=null;
 runInContext('if(typeof confirmCoachingReferenceResponse === "function")confirmCoachingReferenceResponse(form);',a.c);return a.c.dialog;
}
test('transmission automatically uses selected Traceur without command',()=>{const a=application();assert.doesNotMatch(a.html(),/data-reference-assignment|reference-beneficiary/);assert.match(a.html(),/En attente d’acceptation/);assert.equal(a.assignment.state.actions[0].beneficiaryParticipantId,'alex');});
for(const type of ['accept','decline'])test(`recipient explicitly confirms ${type} with separate simulated author`,()=>{
 const a=application();transmit(a);recipient(a);assert.ok(responseView(a));assert.ok(respond(a,type));assert.equal(a.assignment.state.actions.length,1);a.confirm();
 const action=a.assignment.state.actions.at(-1);assert.equal(action.authorParticipantId,'alex');assert.equal(action.type,type);assert.equal(action.origin,'simulation:coaching-reference-response-dev');assert.equal(a.c.coachingDraft.identityContext.participantId,'self');assert.equal(a.assignment.state.references[reference().id].assignments[0].status,type==='accept'?'accepted':'declined');assert.equal(respond(a,type),null);
});
test('changing perspective alone cannot answer',()=>{const a=application();transmit(a);recipient(a,false);assert.equal(responseView(a),null);assert.equal(respond(a),null);});
test('recipient panel renders actual accept and refuse commands',()=>{const a=application();transmit(a);recipient(a);const h=PreparationScreen(a.c.preparationState,{referenceResponse:responseView(a)});assert.match(h,/data-reference-response/);assert.match(h,/Accepter/);assert.match(h,/Refuser/);assert.match(h,/Simulation/);});
for(const [name,alter] of [
 ['viewer changed',a=>{a.c.preparationState=preparation.simulate(a.c.preparationState,{viewerRole:'coach'});}],
 ['simulation disabled',a=>{a.c.preparationUI.referenceResponseActor=null;}],
 ['foreign session',a=>{a.c.preparationUI.referenceResponseActor.sessionId='foreign';}],
 ['pose started',a=>{a.c.tracerState.phase='laying';}],
 ['QA active',a=>{a.c.qaInitialized=true;}],
 ['identity lost',a=>{a.c.authUser=null;}]
])test(`confirmation revalidates ${name}`,()=>{const a=application();transmit(a);recipient(a);assert.ok(respond(a));alter(a);a.confirm();assert.equal(a.assignment.state.actions.length,1);});
for(const patch of [{command:'assign'},{revision:'99'},{assignmentId:'foreign'},{sessionId:'foreign'},{referenceId:'foreign'}])test(`reject malformed response ${JSON.stringify(patch)}`,()=>{const a=application();transmit(a);recipient(a);assert.equal(respond(a,'accept',patch),null);assert.equal(a.assignment.state.actions.length,1);});
test('accepted status remains visible to creator',()=>{const a=application();transmit(a);recipient(a);respond(a);a.confirm();a.c.preparationState=preparation.simulate(a.c.preparationState,{viewerRole:'driver'});assert.match(a.html(),/accepté/i);});
test('declined status is explicit and does not automatically retransmit',()=>{const a=application();transmit(a);recipient(a);respond(a,'decline');a.confirm();a.c.preparationState=preparation.simulate(a.c.preparationState,{viewerRole:'driver'});assert.match(a.html(),/refusé/i);assert.doesNotMatch(a.html(),/data-reference-assignment/);});

for(const mode of ['normal','simple_blind','full_blind'])test(`Traceur response respects assigned actor in ${mode}`,()=>{
 const a=application(draft(mode,'traceur'));transmit(a);assert.ok(responseView(a));assert.equal(responseView(a).simulated,false);assert.ok(respond(a));a.confirm();assert.equal(a.assignment.state.actions.at(-1).authorParticipantId,'self');assert.equal(a.assignment.state.actions.at(-1).origin,'simulation:coaching-reference-response');
});
test('real DEV checkbox handler enables only the current recipient then perspective clears it',()=>{
 const a=application();transmit(a);recipient(a,false);
 a.c.event={target:{matches:s=>s==='[data-reference-response-test]',checked:true}};
 const start=app.indexOf(" if(event.target.matches('[data-reference-response-test]')");const end=app.indexOf(" const sim=event.target.closest('[data-prep-sim]",start);
 runInContext(`(function(){${app.slice(start,end)}})()`,a.c);assert.ok(responseView(a));
 a.c.window={scrollY:0,scrollTo(){}};a.c.document={querySelector:()=>null};a.c.event={target:{matches:()=>false,closest:()=>({dataset:{prepSim:'viewerRole'},type:'select',value:'driver'})}};
 runInContext(`(function(){${app.slice(end,app.indexOf(" const observer=event.target.closest('[data-coaching-observer]'",end))}})()`,a.c);assert.equal(a.c.preparationUI.referenceResponseActor,null);
});
test('response leaves search and tracer state unchanged',()=>{const a=application();transmit(a);recipient(a);const before=structuredClone({s:a.c.searchState,t:a.c.tracerState,p:a.c.preparationState});respond(a);a.confirm();assert.deepEqual(plain({s:a.c.searchState,t:a.c.tracerState,p:a.c.preparationState}),plain(before));});
test('recipient retains explicit refusal status after confirming',()=>{const a=application();transmit(a);recipient(a);respond(a,'decline');a.confirm();const v=responseView(a);assert.equal(v?.status,'declined');const h=PreparationScreen(a.c.preparationState,{referenceResponse:v});assert.match(h,/Parcours refusé/);assert.doesNotMatch(h,/data-reference-response /);});
