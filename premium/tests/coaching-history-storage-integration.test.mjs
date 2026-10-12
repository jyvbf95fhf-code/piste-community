import {isExitClosure,isCollectivelyClosed,canParticipate} from '../src/coaching-session-control.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import * as coaching from '../src/coaching.mjs';
import {createSessionCatalog} from '../src/session-catalog.mjs';
import {createCoachingHistoryStorage} from '../src/coaching-history-storage.mjs';
import {createMockAuth} from '../src/mock-auth.mjs';
import {createCoachingQa,selectQaPerspective} from '../src/coaching-qa.mjs';
import {simulate,transition} from '../src/coaching-preparation.mjs';
import {advanceTracer} from '../src/coaching-tracer.mjs';
import {syncSession,advanceSessionSearch} from '../src/coaching-session-flow.mjs';
import {sessionDetailView} from '../src/session-views.mjs';
const source=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
function finished(){
 const qa=createCoachingQa('normal',{name:'Owner'},[{id:'nox',name:'Nox'}]);
 let p=transition(simulate(selectQaPerspective(qa.preparation,'traceur'),{gps:'fresh'}),'ready'),t=qa.tracer,s=qa.search;
 for(const action of ['start','progress','finish','in-place']){t=advanceTracer(t,p,action);s=syncSession(s,p,t);}
 p=selectQaPerspective(p,'driver');s=advanceSessionSearch(s,p,'start');s=advanceSessionSearch(s,p,'progress');s=advanceSessionSearch(s,p,'finish');
 return {session:p.session,preparationState:p,tracerState:t,searchState:s};
}
function app(storage,user={user_id:'owner-sebastien'}){
 const c=createContext({isExitClosure,isCollectivelyClosed,canParticipate,cleanupCoachingExit:()=>{},exitSavePending:false,normalCoachingBeforeQa:null,coaching,createSessionCatalog,createCoachingHistoryStorage,storage,currentUser:user,qaInitialized:false,coachingDraft:{identityContext:{userId:user?.user_id},session:null},preparationState:null,tracerState:null,searchState:null});
 const start=source.indexOf('const coachingHistoryStorage=');assert.ok(start>=0,'application history integration is missing');
 runInContext(source.slice(start,source.indexOf('let operationalStore=',start)),c);
 Object.defineProperty(c,'sessionCatalog',{get:()=>runInContext('sessionCatalog',c)});Object.defineProperty(c,'coachingHistoryNotice',{get:()=>runInContext('coachingHistoryNotice',c)});
 c.restoreCoachingHistoryForUser();return c;
}
function capture(c,record){c.coachingDraft={identityContext:{userId:c.currentUser.user_id},session:record.session};Object.assign(c,{preparationState:record.preparationState,searchState:record.searchState,tracerState:record.tracerState});c.captureCoachingHistory();}
test('real app restores terminal history after reload without restoring an active cockpit',()=>{
 const storage=memory(),record=finished(),first=app(storage);capture(first,record);const reload=app(storage);
 assert.equal(reload.coachingDraft.session,null);assert.equal(reload.preparationState,null);assert.equal(reload.sessionCatalog.list().length,1);assert.equal(sessionDetailView(reload.sessionCatalog.get(record.session.id)).canResume,false);
});
test('logout retains disk history, anonymous catalogue is empty, same profile recovers it',()=>{
 const storage=memory(),auth=createMockAuth(storage);auth.signIn();const c=app(storage,auth.getSession().user),record=finished();capture(c,record);auth.signOut();c.currentUser=auth.getSession().user;c.restoreCoachingHistoryForUser();assert.equal(c.sessionCatalog.list().length,0);auth.signIn();c.currentUser=auth.getSession().user;c.restoreCoachingHistoryForUser();assert.equal(c.sessionCatalog.list().length,1);
});
test('profile changes cannot capture a stale session belonging to the previous profile',()=>{
 const storage=memory(),c=app(storage),record=finished();capture(c,record);c.currentUser={user_id:'member-standard-01'};c.restoreCoachingHistoryForUser();c.captureCoachingHistory();assert.equal(c.sessionCatalog.list().length,0);assert.equal(createCoachingHistoryStorage(storage).load('member-standard-01').records.length,0);
});
test('QA sessions never alter persisted history or the regular catalogue',()=>{
 const storage=memory(),c=app(storage),record=finished();capture(c,record);const before=new Map(storage.data);c.qaInitialized=true;capture(c,finished());assert.deepEqual(storage.data,before);assert.equal(c.sessionCatalog.list().length,1);
});
test('active session is retained only in memory and terminal history survives',()=>{
 const storage=memory(),c=app(storage),record=finished();capture(c,record);const active=finished();active.searchState.phase='SEARCH_RUNNING';capture(c,active);assert.equal(c.sessionCatalog.list().length,2);assert.equal(app(storage).sessionCatalog.list().length,1);
});
test('app warns on failed persistence and continues to expose the in-memory report',()=>{
 const c=app({getItem:()=>null,setItem(){throw Error('quota');}}),record=finished();capture(c,record);assert.match(c.coachingHistoryNotice,/sauvegarde/i);assert.equal(c.sessionCatalog.list().length,1);
});
test('render connects restore, capture and storage warning after shell creation',()=>{
 const render=source.slice(source.indexOf('function render('),source.indexOf('function resetCoachingQa('));assert.ok(render.includes('restoreCoachingHistoryForUser();'));assert.ok(render.includes('captureCoachingHistory();'));assert.ok(render.indexOf('restoreCoachingHistoryForUser();')<render.indexOf('captureCoachingHistory();'));assert.ok(render.indexOf('showCoachingHistoryWarning();')>render.indexOf("document.querySelector('#app').innerHTML"));
});
