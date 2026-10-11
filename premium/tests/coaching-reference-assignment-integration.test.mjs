import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import * as coaching from '../src/coaching.mjs';
import * as preparation from '../src/coaching-preparation.mjs';
import * as search from '../src/coaching-search.mjs';
import * as tracer from '../src/coaching-tracer.mjs';
import {sessionView} from '../src/coaching-session-flow.mjs';
import {createCoachingQa,selectQaPerspective} from '../src/coaching-qa.mjs';
import {createReferenceAssignmentState,applyReferenceAssignmentAction,getReferenceAssignment} from '../src/coaching-reference-assignment.mjs';

const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
const user={user_id:'integration-user-83',name:'Simulation fixture'};
const dogs=[{id:'integration-dog-89',name:'Fixture dog'}];
const reference=()=>({id:'integration-reference-97',name:'Simulated selection',source:'draw',ownerId:'alex',start:{x:211,y:103,space:'mock-map'}});
const ready=(identity=user,type='prepared')=>coaching.selectPreparation(coaching.updateDraft(coaching.createDraft(identity,dogs),{mode:'normal',traceType:type}),{...reference(),...(type==='gpx'?{source:'gpx',fileName:'explicit-simulation.gpx'}:{})});
const plain=value=>JSON.parse(JSON.stringify(value));
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}

// Execute the actual application creation branch and lifecycle statements. Only
// the browser shell and local clock/UUID are replaced; all business modules are
// real. This is not a browser-rendering test or a real identity/GPS scenario.
function application(draft=ready(),identity=user){
 let nextId=0;
 const sandbox=createContext({coaching,preparation,search,tracer,createReferenceAssignmentState,applyReferenceAssignmentAction,getReferenceAssignment,createCoachingQa,selectQaPerspective,
  structuredClone,TypeError,currentUser:identity,coachingDraft:draft,qaInitialized:false,qaMode:'normal',qaScenario:'connected_traceur',mock:{dog:dogs[0]},
  searchState:search.createSearch(),searchUI:{},debriefUI:{},tracerState:tracer.createTracer(),tracerUI:{},terrainOpen:false,preparationState:null,preparationUI:{},qaUI:{},
  trackLibrary:{list:()=>[reference()]},crypto:{randomUUID:()=>`simulation-integration-action-${++nextId}`},
  Date:class extends Date{constructor(...args){super(...(args.length?args:['2026-10-10T12:00:00.000Z']));}},
  window:{scrollY:0,scrollTo(){}},document:{querySelector:()=>null},newCoachingDraft:()=>coaching.createDraft(identity,dogs)});
 const start=app.indexOf('let coachingReferenceAssignment=');
 runInContext(start<0?'let coachingReferenceAssignment=null;':app.slice(start,app.indexOf('let tracerState=',start)),sandbox);
 runInContext(app.slice(app.indexOf('function coachingActionContext('),app.indexOf('\nlet trackLibrary=')),sandbox);
 const renderStatements=app.slice(app.indexOf(' coachingDraft=coaching.syncPreparation('),app.indexOf(' const dogsRoute=resolveDogsRoute('));
 sandbox.render=()=>runInContext(renderStatements,sandbox);
 return {
  sandbox,
  create(){runInContext(`(function(){const action='create';${app.slice(app.indexOf("  if(action==='create')"),app.indexOf("  if(action==='restart')"))}})()`,sandbox);},
  initialize(){if(runInContext('typeof initializeCoachingReferenceAssignment',sandbox)==='function')runInContext('initializeCoachingReferenceAssignment();',sandbox);},
  get state(){return runInContext('coachingReferenceAssignment',sandbox);},
  render:sandbox.render,
  qa(){runInContext(app.slice(app.indexOf('function resetCoachingQa('),app.indexOf('function renderCoachingQa('))+'\nresetCoachingQa();',sandbox);},
  perspective(role){sandbox.event={target:{closest:()=>({dataset:{prepSim:'viewerRole'},type:'select',value:role})}};
   runInContext(`(function(){${app.slice(app.indexOf(" const sim=event.target.closest('[data-prep-sim]"),app.indexOf(" const observer=event.target.closest('[data-coaching-observer]'"))}})()`,sandbox);},
  restart(){runInContext(`(function(){const action='restart';${app.slice(app.indexOf("  if(action==='restart')"),app.indexOf("  render(action!=='creator');"))}})()`,sandbox);sandbox.render();}
 };
}
function created(draft=ready(),identity=user){const a=application(draft,identity);a.create();return a;}
function requireState(a){assert.ok(a.state,'The actual application creation branch must initialize compatible assignment state');return a.state;}

test('main application creation calls the existing assignment module for the actual session',()=>{
 const a=created(),{context,state}=requireState(a);
 assert.match(app,/import\s*\{\s*createReferenceAssignmentState\s*,\s*applyReferenceAssignmentAction\s*,\s*getReferenceAssignment\s*\}\s*from\s*['"]\.\/coaching-reference-assignment\.mjs['"]/);
 assert.equal(state.sessionId,a.sandbox.coachingDraft.session.id);assert.equal(context.sessionId,state.sessionId);
 assert.equal(context.creatorParticipantId,a.sandbox.coachingDraft.sessionCreation.creatorParticipantId);
 assert.deepEqual(plain(context.participants),[{id:'self',functions:['driver']},{id:'camille',functions:['coach']},{id:'alex',functions:['traceur']}]);
 assert.deepEqual(Object.keys(context).sort(),['assignmentAuthority','creatorParticipantId','delegations','participants','references','sessionId']);
});
test('selected reference is transmitted automatically without pose event',()=>{
 const {context,state}=requireState(created());
 assert.deepEqual(plain(context.references),[{id:reference().id,layingStarted:false}]);
 assert.deepEqual(Object.keys(state.references),[reference().id]);
 assert.equal(getReferenceAssignment(state,reference().id).status,'pending');assert.equal(state.actions[0].beneficiaryParticipantId,'alex');
 assert.equal(state.actions.length,1);assert.equal(state.events,undefined);
});
for(const role of ['driver','coach','traceur'])test(`immutable creator is independent of creator function ${role}`,()=>{
 const a=created(coaching.selectCreatorRole(ready(),role));const {context}=requireState(a);
 assert.equal(context.creatorParticipantId,'self');assert.equal(a.sandbox.coachingDraft.sessionCreation.creatorUserId,user.user_id);
 assert.ok(context.participants.find(p=>p.id==='self').functions.includes(role));
});
test('known creator remains independent of active Observer perspective',()=>{
 const a=created(coaching.setObservers(ready(),['self'])),initial=requireState(a);
 a.perspective('observer');assert.equal(preparation.preparationView(a.sandbox.preparationState).role,'observer');
 assert.equal(a.state,initial);assert.equal(initial.context.creatorParticipantId,'self');assert.deepEqual(plain(initial.context.participants.find(p=>p.id==='self').functions),['driver','observer']);
});
test('unknown creator identity remains explicit absence, never self',()=>{
 const a=created(ready(null),null);assert.equal(a.sandbox.coachingDraft.sessionCreation.creatorUserId,null);assert.equal(a.state,null);
});
test('creation without selected reference has no assignment state',()=>{
 const a=created(coaching.updateDraft(coaching.createDraft(user,dogs),{mode:'normal',traceType:'direct'}));
 assert.ok(a.sandbox.coachingDraft.session);assert.equal(a.state,null);
});
test('uncreated draft has no assignment state',()=>{const a=application();a.initialize();assert.equal(a.sandbox.coachingDraft.session,null);assert.equal(a.state,null);});
test('historical creation without immutable creator context has no assignment state',()=>{
 const a=application(coaching.createSession(ready()));a.initialize();assert.equal(a.state,null);
});
test('creation transmits to Traceur selected by assignRole',()=>{
 const a=created(coaching.assignRole(ready(),'traceur','hugo'));const {context,state}=requireState(a);
 assert.deepEqual(plain(context.participants.find(p=>p.id==='hugo').functions),['traceur']);assert.equal(state.references[reference().id].assignments[0].beneficiaryParticipantId,'hugo');
});
test('creation transmits selected GPX to chosen Traceur',()=>{
 const d=coaching.selectPreparation(ready(user,'gpx'),{...reference(),source:'gpx',fileName:'explicit-simulation.gpx'});
 const {state}=requireState(created(d));assert.equal(state.references[reference().id].assignments[0].beneficiaryParticipantId,'alex');assert.equal(state.actions.length,1);
});
test('initial context has role authority and no synthetic delegation',()=>{
 const {context,state}=requireState(created());assert.deepEqual(plain(context.delegations),[]);assert.equal(state.actions[0].origin,'simulation:coaching-reference-automatic');
 assert.equal(context.participants.find(p=>p.id==='camille').functions[0],'coach');assert.equal(state.delegations,undefined);
});
test('repeated creation and initialization preserve the same state instance',()=>{
 const a=created(),initial=requireState(a),draft=a.sandbox.coachingDraft;
 a.create();a.initialize();assert.equal(a.state,initial);assert.equal(a.sandbox.coachingDraft,draft);
});
test('screen changes and actual render maintenance do not rebuild state',()=>{
 const a=created(),initial=requireState(a);
 for(const step of ['prepare','roles','review']){a.sandbox.coachingDraft=coaching.goToStep(a.sandbox.coachingDraft,step);a.render();assert.equal(a.state,initial);}
 a.sandbox.trackLibrary={list:()=>[]};a.render();assert.equal(a.state,initial);
});
test('actual DEV perspective handler preserves state while changing only projection perspective',()=>{
 const a=created(coaching.setObservers(ready(),['lea'])),initial=requireState(a);
 for(const role of ['driver','coach','observer','traceur']){a.perspective(role);assert.equal(preparation.preparationView(a.sandbox.preparationState).role,role);assert.equal(a.state,initial);}
});
test('editing invalidates prior session state, next creation never transfers it',()=>{
 const a=created(),initial=requireState(a);a.sandbox.coachingDraft=coaching.updateDraft(a.sandbox.coachingDraft,{mode:'normal'});a.render();assert.equal(a.state,null);
 a.create();const next=requireState(a);assert.notEqual(next,initial);assert.notEqual(next.state.sessionId,initial.state.sessionId);assert.equal(next.state.actions.length,1);assert.notEqual(next.state.actions[0].actionId,initial.state.actions[0].actionId);
});
test('restart explicitly leaves absence until another compatible creation',()=>{const a=created();requireState(a);a.restart();assert.equal(a.state,null);assert.equal(a.sandbox.coachingDraft.session,null);});
test('entering QA clears main state and QA cannot initialize from stale main draft',()=>{
 const a=created(),initial=requireState(a),mainSession=a.sandbox.coachingDraft.session;
 a.qa();assert.equal(a.state,null);assert.notEqual(a.sandbox.preparationState.session.id,initial.state.sessionId);
 a.initialize();a.render();assert.equal(a.state,null);assert.equal(a.sandbox.coachingDraft.session,mainSession);
});
test('QA alone has no assignment context or side effects on historical participants',()=>{
 const a=application();a.qa();a.initialize();assert.equal(a.state,null);assert.equal(a.sandbox.coachingDraft.session,null);
});
test('preparation, search, session projections and role capabilities stay unchanged',()=>{
 const a=created();requireState(a);const p=a.sandbox.preparationState,t=a.sandbox.tracerState,s=a.sandbox.searchState;
 const before=structuredClone({preparation:preparation.preparationView(p),search:search.searchView(s,p,{now:1000}),session:sessionView(s,p,t),capabilities:coaching.roleCapabilities('full_blind','coach')});
 a.initialize();a.render();assert.deepEqual({preparation:preparation.preparationView(p),search:search.searchView(s,p,{now:1000}),session:sessionView(s,p,t),capabilities:coaching.roleCapabilities('full_blind','coach')},before);
 assert.equal(p.referenceAssignment,undefined);assert.equal(s.referenceAssignment,undefined);assert.equal(t.referenceAssignment,undefined);
});
test('frozen original session and preparation action timestamps remain unchanged and separate',()=>{
 const a=created();requireState(a);const d=freeze(a.sandbox.coachingDraft),before=structuredClone(d);a.initialize();a.render();assert.deepEqual(d,before);
 assert.equal(d.session.referenceAssignment,undefined);assert.equal(d.preparationActions.at(-1).occurredAt,'2026-10-10T12:00:00.000Z');
 assert.ok(Object.isFrozen(a.state.state));assert.notEqual(a.state.context.participants,d.session.participants);
});
for(const [name,alter] of [
 ['missing creator user',d=>({...d,sessionCreation:{...d.sessionCreation,creatorUserId:null}})],
 ['wrong creation session',d=>({...d,sessionCreation:{...d.sessionCreation,sessionId:'other-session'}})],
 ['creator outside membership',d=>({...d,sessionCreation:{...d.sessionCreation,creatorParticipantId:'outsider'}})],
 ['unidentifiable reference',d=>({...d,session:{...d.session,preparation:{...d.session.preparation,id:''}}})],
 ['unknown assigned participant',d=>({...d,session:{...d.session,roles:{...d.session.roles,traceur:'outsider'}}})],
 ['participant without function',d=>({...d,session:{...d.session,participants:[...d.session.participants,{id:'outsider'}]}})],
 ['duplicate participant',d=>({...d,session:{...d.session,participants:[...d.session.participants,d.session.participants[0]]}})],
 ['unknown function',d=>({...d,session:{...d.session,roles:{...d.session.roles,invented:'self'}}})]
])test(`incompatible context refuses state: ${name}`,()=>{
 const a=created();requireState(a);a.sandbox.coachingDraft=alter(a.sandbox.coachingDraft);a.initialize();assert.equal(a.state,null);
});
test('loss of current user invalidates local state without assigning identity to replacement',()=>{
 const a=created();requireState(a);a.sandbox.currentUser=null;a.render();assert.equal(a.state,null);
});


test('actual render maintenance preserves recorded grants and revocations without rebuilding ledger',()=>{
 const a=created();requireState(a);
 const command={actionId:'render-grant',type:'delegation-grant',sessionId:a.state.state.sessionId,authorParticipantId:'self',beneficiaryParticipantId:'camille',delegationId:'render-delegation',permission:'reference.assign',occurredAt:'2026-10-10T12:00:00.000Z',origin:'simulation:render-integration',assurance:'local-simulation',expectedRevision:0};
 for(const action of [command,{...command,actionId:'render-revoke',type:'delegation-revoke',expectedRevision:1}]){
  a.sandbox.delegationCommand=action;
  runInContext('coachingReferenceAssignment=Object.freeze({...coachingReferenceAssignment,state:applyReferenceAssignmentAction(coachingReferenceAssignment.state,coachingReferenceAssignment.context,delegationCommand)});',a.sandbox);
  const initial=a.state;for(let i=0;i<3;i++)a.render();assert.equal(a.state,initial);
 }
 assert.equal(a.state.state.delegationLedger.records[0].status,'revoked');assert.equal(a.state.state.delegationLedger.actions.length,2);
 a.restart();assert.equal(a.state,null);
});
