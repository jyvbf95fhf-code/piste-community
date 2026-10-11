import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {createDraft,updateDraft,createSession,setObservers} from '../src/coaching.mjs';
import {createPreparation,simulate} from '../src/coaching-preparation.mjs';
import {createSearch,advanceSearch} from '../src/coaching-search.mjs';
import * as tracer from '../src/coaching-tracer.mjs';
import {SearchScreen} from '../src/coaching-search-screen.mjs';
const fixture=(mode='normal')=>{
 const p=createPreparation(createSession(setObservers(updateDraft(createDraft({name:'Driver'},[{id:'dog',name:'Nox'}]),{mode,traceType:'direct'}),['lea'])).session);
 return {p,s:createSearch(),t:tracer.replyCoachMock(tracer.createTracer(),simulate(p,{viewerRole:'coach'}),createSearch(),'Attends 2 min')};
};
for(const mode of ['normal','simple_blind','full_blind'])for(const phase of ['PREPARATION','LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY'])test(`Driver waits and exchanges without starting search: ${mode}/${phase}`,()=>{
 const {p,s,t}=fixture(mode),state={...s,phase},before=structuredClone({p,state,t});
 const view=tracer.sessionMessages(t,p),html=SearchScreen(state,p,{messages:view.messages,unreadCount:view.unread,messagesOpen:true});
 assert.match(html,/data-search="messages"/);assert.match(html,/Messages · 1/);assert.match(html,/Attends 2 min/);assert.match(html,/data-search-reply/);assert.match(html,/maxlength="120"/);
 const next=tracer.replySearchMock(t,p,state,'  Bien reçu  ');assert.deepEqual({p,state,t},before);assert.deepEqual(next.segments,t.segments);assert.equal(next.seconds,t.seconds);assert.equal(next.messages.at(-1).text,'Bien reçu');
 assert.equal(tracer.sessionMessages(next,simulate(p,{viewerRole:'coach'})).unread,1);
 assert.equal(next.messages.at(-1).sessionId,p.session.id);assert.equal(next.messages.at(-1).participantId,p.session.roles.driver);
 if(phase!=='SEARCH_READY'){assert.throws(()=>advanceSearch(state,p,'start'));assert.doesNotMatch(html,/data-search="start"/);}
 else assert.match(html,/data-search="start"/);
});
for(const phase of ['SEARCH_FINISHED','DEBRIEF','ARCHIVED','unknown'])test(`Driver cannot exchange after search or outside valid phases: ${phase}`,()=>{
 const {p,s,t}=fixture();assert.throws(()=>tracer.replySearchMock(t,p,{...s,phase},'Hello'));
 if(phase!=='unknown')assert.doesNotMatch(SearchScreen({...s,phase},p,{messagesOpen:true,messages:t.messages}),/data-search-reply|data-search="messages"/);
});
test('foreign recording actor refuses waiting reply',()=>{const {p,s,t}=fixture();assert.throws(()=>tracer.replySearchMock(t,p,{...s,actorId:'foreign'},'Hello'));});
for(const role of ['coach','traceur','observer'])test(`waiting reply refuses ${role}`,()=>{const {p,s,t}=fixture();const other=simulate(p,{viewerRole:role});assert.throws(()=>tracer.replySearchMock(t,other,s,'Hello'));assert.doesNotMatch(SearchScreen(s,other,{messagesOpen:true,messages:t.messages}),/data-search-reply|data-search="messages"/);});
test('actual Driver handler sends during preparation and preserves recording state',()=>{
 const {p,s,t}=fixture(),app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8'),start=app.indexOf('function replyCoachingSearchMessage(');
 const c=createContext({tracer,preparationState:p,searchState:s,tracerState:t,searchUI:{messagesOpen:true,locked:false},render(){}});
 runInContext(app.slice(start,app.indexOf('function handleCoachingCoachMessages(',start)),c);
 c.replyCoachingSearchMessage('Bien reçu');assert.equal(c.searchState,s);assert.equal(c.tracerState.messages.at(-1).role,'Conducteur');assert.equal(c.searchUI.messagesOpen,true);
});
