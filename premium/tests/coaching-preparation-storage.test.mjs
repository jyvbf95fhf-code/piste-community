import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as coaching from '../src/coaching.mjs';
import {createPreparation,simulate,preparationView} from '../src/coaching-preparation.mjs';
import {createTracer} from '../src/coaching-tracer.mjs';
import {createSearch} from '../src/coaching-search.mjs';
import {syncSession} from '../src/coaching-session-flow.mjs';
import {CoachingScreen} from '../src/coaching-screen.mjs';
import {createReferenceAssignmentState,applyReferenceAssignmentAction,getReferenceAssignment} from '../src/coaching-reference-assignment.mjs';
const module=await import('../src/coaching-preparation-storage.mjs').catch(()=>({}));
const storage=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
let sequence=0;
export function snapshot(mode='normal',role='driver',scenario='connected_traceur'){
 let draft=coaching.updateDraft(coaching.createDraft({user_id:'owner',name:'Owner'},[{id:'nox',name:'Nox'}]),{mode,traceType:'prepared'});
 draft=coaching.selectCreatorRole(draft,role);draft=coaching.setTrackingScenario(draft,scenario);
 draft={...draft,preparationTrack:{id:'ref',name:'Reference',source:'draw',ownerId:'alex',start:{x:100,y:120,space:'mock-map'}},knownPeople:[]};
 const action={actionId:`creation-${++sequence}`,type:'session-creation',author:{userId:'owner',participantId:'self',source:'mock-auth',assurance:'local-simulation'},occurredAt:'2026-10-12T16:00:00.000Z',origin:'simulation:test',sessionId:null,referenceId:'ref',beneficiaryParticipantId:null};
 draft=coaching.createSession(draft,action);
 return {draft,preparationState:createPreparation(draft.session),tracerState:createTracer(),searchState:createSearch(),referenceAssignment:null,terrainOpen:false};
}
function api(disk){assert.equal(typeof module.createCoachingPreparationStorage,'function','preparation persistence is not implemented');return module.createCoachingPreparationStorage(disk);}
for(const mode of ['normal','simple_blind','full_blind'])for(const role of ['driver','coach','traceur'])test(`reload preserves preparation and visibility ${mode}/${role}`,()=>{
 const disk=storage(),first=api(disk),record=snapshot(mode,role);assert.equal(first.load('owner').ok,true);assert.equal(first.save('owner',record).ok,true);
 const loaded=api(disk).load('owner');assert.equal(loaded.ok,true);assert.deepEqual(loaded.snapshot,record);assert.deepEqual(preparationView(loaded.snapshot.preparationState),preparationView(record.preparationState));
});
for(const scenario of ['self_trace','external_traceur','external_driver_recorded'])test(`reload preserves ${scenario} preparation`,()=>{const disk=storage(),a=api(disk),record=snapshot('normal','driver',scenario);a.load('owner');assert.equal(a.save('owner',record).ok,true);assert.deepEqual(api(disk).load('owner').snapshot,record);});
for(const type of ['accept','decline'])test(`reload retains ${type} response without manufacturing another action`,()=>{
 const disk=storage(),a=api(disk),record=snapshot();const s=record.draft.session;
 const context={sessionId:s.id,creatorParticipantId:'self',assignmentAuthority:'coach-role',participants:s.participants.map(p=>({id:p.id,functions:[...['driver','traceur','coach'].filter(r=>s.roles[r]===p.id),...(s.roles.observers.includes(p.id)?['observer']:[])]})),references:[{id:'ref',layingStarted:false}],delegations:[]};
 let state=createReferenceAssignmentState(context);
 const action={actionId:'assign',type:'assign',sessionId:s.id,referenceId:'ref',authorParticipantId:'self',beneficiaryParticipantId:s.roles.traceur,assignmentId:'assignment',expectedRevision:0,delegationId:null,occurredAt:'2026-10-12T16:00:00.000Z',origin:'simulation:test',assurance:'local-simulation'};
 state=applyReferenceAssignmentAction(state,context,action);state=applyReferenceAssignmentAction(state,context,{...action,type,actionId:'response',authorParticipantId:s.roles.traceur,expectedRevision:1});record.referenceAssignment={context,state};
 a.load('owner');assert.equal(a.save('owner',record).ok,true);const loaded=api(disk).load('owner').snapshot;assert.deepEqual(loaded,record);assert.equal(getReferenceAssignment(loaded.referenceAssignment.state,'ref').status,type==='accept'?'accepted':'declined');assert.equal(loaded.referenceAssignment.state.actions.length,2);
});
test('storage is isolated by owner and refuses foreign identity',()=>{const disk=storage(),a=api(disk);a.load('owner');a.save('owner',snapshot());assert.equal(api(disk).load('other').snapshot,null);assert.equal(a.save('other',snapshot()).ok,false);assert.equal(api(disk).load('owner').snapshot.draft.identityContext.userId,'owner');});
test('stale tabs cannot overwrite or delete newer preparation',()=>{const disk=storage(),a=api(disk),b=api(disk);a.load('owner');b.load('owner');const first=snapshot();a.save('owner',first);assert.deepEqual(b.save('owner',snapshot()),{ok:false,reason:'conflict'});assert.deepEqual(b.clear('owner'),{ok:false,reason:'conflict'});assert.deepEqual(api(disk).load('owner').snapshot,first);});
test('corrupt data remains untouched and cannot be overwritten',()=>{const disk=storage(),a=api(disk);a.load('owner');a.save('owner',snapshot());const key=[...disk.data.keys()][0];disk.setItem(key,'{bad');const b=api(disk);assert.equal(b.load('owner').ok,false);assert.equal(b.save('owner',snapshot()).ok,false);assert.equal(disk.getItem(key),'{bad');});
test('pose or search in progress cannot be saved as preparation',()=>{const a=api(storage());a.load('owner');for(const patch of [{tracerState:{...createTracer(),phase:'active'}},{searchState:{...createSearch(),phase:'SEARCH_RUNNING'}},{preparationState:{...snapshot().preparationState,physicalLaid:true}}])assert.equal(a.save('owner',{...snapshot(),...patch}).ok,false);});
test('forged role functions and assignment state are refused',()=>{const disk=storage(),a=api(disk);a.load('owner');const record=snapshot();record.preparationState.team[0].functions.push('traceur');assert.equal(a.save('owner',record).ok,false);});
test('approach is restored without a fresh position being treated as current',()=>{const disk=storage(),a=api(disk),record=snapshot('normal','traceur');record.preparationState=simulate(record.preparationState,{gps:'fresh',phase:'approaching'});record.tracerState.phase='approaching';record.terrainOpen=true;a.load('owner');assert.equal(a.save('owner',record).ok,true);const loaded=api(disk).load('owner').snapshot;assert.equal(loaded.preparationState.phase,'approaching');assert.equal(loaded.preparationState.gps,'acquiring');assert.equal(loaded.terrainOpen,true);});
test('quota failure preserves prior snapshot',()=>{const disk=storage(),a=api(disk);a.load('owner');const record=snapshot();a.save('owner',record);disk.setItem=()=>{throw Error('quota');};assert.equal(a.save('owner',snapshot()).ok,false);assert.deepEqual(api(disk).load('owner').snapshot,record);});
test('clear removes only the current owner preparation',()=>{const disk=storage(),a=api(disk);a.load('owner');a.save('owner',snapshot());assert.equal(a.clear('owner').ok,true);assert.equal(api(disk).load('owner').snapshot,null);});
test('preparation remains recoverable after the real render phase synchronization',()=>{const disk=storage(),a=api(disk),record=snapshot();record.searchState=syncSession(record.searchState,record.preparationState,record.tracerState);a.load('owner');assert.equal(a.save('owner',record).ok,true);assert.deepEqual(api(disk).load('owner').snapshot,record);});
test('created screen accurately explains preparation recovery on this device',()=>{const html=CoachingScreen(snapshot().draft);assert.doesNotMatch(html,/Recharger efface cette session/);assert.match(html,/préparation.*cet appareil/i);});
