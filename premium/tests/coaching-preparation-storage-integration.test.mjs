import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import * as coaching from '../src/coaching.mjs';
import * as tracer from '../src/coaching-tracer.mjs';
import * as search from '../src/coaching-search.mjs';
import {createPreparation} from '../src/coaching-preparation.mjs';
import {createSessionCatalog} from '../src/session-catalog.mjs';
import {createCoachingPreparationStorage,isRecoverableCoachingPreparation} from '../src/coaching-preparation-storage.mjs';
const source=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
function app(storage,user={user_id:'owner',name:'Owner'},sessionCatalog=createSessionCatalog()){
 const c=createContext({storage,currentUser:user,sessionCatalog,createCoachingPreparationStorage,isRecoverableCoachingPreparation,structuredClone,coaching,tracer,search,qaInitialized:false,coachingReferenceAssignment:null,preparationState:null,tracerState:tracer.createTracer(),searchState:search.createSearch(),preparationUI:{},tracerUI:{},searchUI:{},terrainOpen:false,coachingDraft:null,newCoachingDraft:()=>coaching.createDraft(c.currentUser,[{id:'nox',name:'Nox'}]),Toast:message=>{c.notice=message;}});
 c.coachingDraft=c.newCoachingDraft();const start=source.indexOf('const coachingPreparationStorage=');assert.ok(start>=0,'real application must integrate preparation persistence');runInContext(source.slice(start,source.indexOf('const newTrackUI=',start)),c);c.restoreCoachingPreparationForUser();return c;
}
function create(c){
 const d=coaching.updateDraft(c.newCoachingDraft(),{mode:'normal',traceType:'direct'});
 c.coachingDraft=coaching.createSession(d,{actionId:crypto.randomUUID(),type:'session-creation',author:{userId:c.currentUser.user_id,participantId:'self',source:'mock-auth',assurance:'local-simulation'},occurredAt:new Date().toISOString(),origin:'simulation:test',sessionId:null,referenceId:null,beneficiaryParticipantId:null});c.preparationState=createPreparation(c.coachingDraft.session);return c.coachingDraft.session.id;
}
test('actual application restores created session after a reload',()=>{const disk=memory(),first=app(disk),id=create(first);first.captureCoachingPreparation();const reload=app(disk);assert.equal(reload.coachingDraft.session.id,id);assert.deepEqual(reload.preparationState,first.preparationState);});
test('logout preserves saved preparation and isolates next profile',()=>{const disk=memory(),first=app(disk),id=create(first);first.captureCoachingPreparation();first.currentUser=null;first.restoreCoachingPreparationForUser();first.captureCoachingPreparation();assert.equal(first.preparationState,null);first.currentUser={user_id:'other'};first.restoreCoachingPreparationForUser();assert.equal(first.preparationState,null);assert.equal(app(disk).coachingDraft.session.id,id);});
test('restart clears only saved preparation without restoring it on next render',()=>{const disk=memory(),c=app(disk);create(c);c.captureCoachingPreparation();c.coachingDraft=c.newCoachingDraft();c.preparationState=null;c.captureCoachingPreparation();c.restoreCoachingPreparationForUser();assert.equal(c.preparationState,null);assert.equal(app(disk).preparationState,null);});
test('entering pose discards preparation recovery instead of restoring an earlier phase',()=>{const disk=memory(),c=app(disk);create(c);c.captureCoachingPreparation();c.tracerState.phase='active';c.captureCoachingPreparation();assert.equal(app(disk).preparationState,null);});
test('QA never saves or erases regular preparation',()=>{const disk=memory(),c=app(disk),id=create(c);c.captureCoachingPreparation();c.qaInitialized=true;c.tracerState.phase='active';c.captureCoachingPreparation();assert.equal(app(disk).coachingDraft.session.id,id);});
test('conflicting tab warns and preserves the other tab snapshot',()=>{const disk=memory(),a=app(disk),b=app(disk),id=create(a);a.captureCoachingPreparation();create(b);b.captureCoachingPreparation();b.showCoachingPreparationWarning();assert.match(b.notice,/autre onglet/i);assert.equal(app(disk).coachingDraft.session.id,id);});
test('render restores before projection and captures preparation before shell',()=>{const body=source.slice(source.indexOf('function render('),source.indexOf('function resetCoachingQa('));assert.ok(body.includes('restoreCoachingPreparationForUser();'));assert.ok(body.includes('captureCoachingPreparation();'));assert.ok(body.indexOf('restoreCoachingPreparationForUser();')<body.indexOf('coaching.syncPreparation'));assert.ok(body.includes('showCoachingPreparationWarning();'));});
for(const phase of ['DEBRIEF','ARCHIVED'])test(`completed ${phase} history takes precedence over a stale preparation of the same session`,()=>{const disk=memory(),first=app(disk),id=create(first);first.captureCoachingPreparation();const catalog=createSessionCatalog();catalog.capture({session:first.coachingDraft.session,preparationState:first.preparationState,tracerState:first.tracerState,searchState:{...first.searchState,phase}});const reload=app(disk,first.currentUser,catalog);assert.equal(reload.preparationState,null);assert.equal(reload.coachingDraft.session,null);assert.equal(reload.sessionCatalog.get(id).searchState.phase,phase);assert.equal(createCoachingPreparationStorage(disk).load('owner').snapshot,null);});
