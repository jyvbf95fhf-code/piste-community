import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {createDraft,updateDraft,createSession,setObservers} from '../src/coaching.mjs';
import {createPreparation,simulate} from '../src/coaching-preparation.mjs';
import {createSearch} from '../src/coaching-search.mjs';
import * as tracer from '../src/coaching-tracer.mjs';
import {CoachScreen,ObserverScreen} from '../src/coaching-session-screen.mjs';
const fixture=(mode='normal',role='coach')=>simulate(createPreparation(createSession(setObservers(updateDraft(createDraft({name:'Driver'},[{id:'dog',name:'Nox'}]),{mode,traceType:'direct'}),['lea'])).session),{viewerRole:role,gps:'fresh'});
for(const mode of ['normal','simple_blind','full_blind'])test(`Coach exchanges with Traceur and Driver without altering tracking: ${mode}`,()=>{
 const p=fixture(mode),s={...createSearch(),phase:'SEARCH_RUNNING',actorId:p.session.roles.driver},t=tracer.createTracer(),before=structuredClone({p,s,t});
 const next=tracer.replyCoachMock(t,p,s,'  Bien reçu  ');
 assert.deepEqual({p,s,t},before);assert.deepEqual(next.segments,t.segments);assert.equal(next.seconds,t.seconds);
 const own=tracer.sessionMessages(next,p);assert.equal(own.unread,0);assert.equal(own.messages.at(-1).outgoing,true);assert.equal(own.messages.at(-1).text,'Bien reçu');
 const driver=simulate(p,{viewerRole:'driver'}),traceur=simulate(p,{viewerRole:'traceur'});
 assert.equal(tracer.sessionMessages(next,driver).unread,1);assert.equal(tracer.sessionMessages(next,traceur).unread,1);
 const read=tracer.readMessages(next,driver);
 assert.equal(tracer.sessionMessages(read,driver).unread,0);assert.equal(tracer.sessionMessages(read,traceur).unread,1);
 assert.equal(read.messages.at(-1).sessionId,p.session.id);assert.equal(read.messages.at(-1).participantId,p.session.roles.coach);
});
for(const phase of ['PREPARATION','LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING'])test(`Coach can coordinate during ${phase}`,()=>{const p=fixture();assert.equal(tracer.replyCoachMock(tracer.createTracer(),p,{...createSearch(),phase},'J’arrive').messages.length,1);});
for(const phase of ['SEARCH_FINISHED','DEBRIEF','ARCHIVED','unknown'])test(`Coach refuses writes during ${phase}`,()=>{assert.throws(()=>tracer.replyCoachMock(tracer.createTracer(),fixture(),{phase},'Hello'));});
for(const role of ['driver','traceur','observer'])test(`Coach reply refuses active function ${role}`,()=>{assert.throws(()=>tracer.replyCoachMock(tracer.createTracer(),fixture('normal',role),createSearch(),'Hello'));});
for(const value of ['', '   ','x'.repeat(121)])test(`Coach refuses invalid text length ${value.length}`,()=>assert.throws(()=>tracer.replyCoachMock(tracer.createTracer(),fixture(),createSearch(),value)));
test('message projection filters other sessions and spatial payloads',()=>{
 const p=fixture('full_blind'),state={...tracer.createTracer(),messages:[{id:1,sessionId:'other',text:'secret'},{id:2,sessionId:p.session.id,participantId:p.session.roles.traceur,sender:'Alex',role:'Traceur',text:'Hello',time:'mock',readBy:[],position:{x:1,y:2},reference:{name:'secret'}}]};
 const v=tracer.sessionMessages(state,p);assert.equal(v.messages.length,1);assert.equal(v.unread,1);assert.ok(!('position' in v.messages[0]));assert.ok(!('reference' in v.messages[0]));
 assert.deepEqual(tracer.sessionMessages(state,simulate(p,{viewerRole:'observer'})),{messages:[],unread:0});
});
test('Traceur and Driver authored replies are unread to the Coach',()=>{
 const p=fixture(),traceur=simulate(p,{viewerRole:'traceur'}),driver=simulate(p,{viewerRole:'driver'});
 let t=tracer.replyMock(tracer.createTracer(),'Je suis en place',traceur);
 t=tracer.replySearchMock(t,driver,{...createSearch(),phase:'SEARCH_RUNNING',actorId:driver.viewerId},'Bien reçu');
 assert.equal(tracer.sessionMessages(t,p).unread,2);assert.equal(tracer.sessionMessages(t,driver).unread,1);
 assert.equal(tracer.sessionMessages(tracer.readMessages(t,p),p).unread,0);
});
test('Double blind preserves the masked Traceur identity in message panels',()=>{
 const p=fixture('full_blind'),poseur=simulate(p,{viewerRole:'traceur'}),t=tracer.replyMock(tracer.createTracer(),'Je suis en place',poseur);
 for(const role of ['coach','driver']){const message=tracer.sessionMessages(t,simulate(p,{viewerRole:role})).messages[0];assert.equal(message.sender,'Traceur — masqué');assert.equal(message.participantId,null);}
 assert.equal(tracer.sessionMessages(t,poseur).messages[0].sender,'Alex');
 assert.doesNotMatch(CoachScreen(createSearch(),p,t,{messagesOpen:true}),/>Alex</);
});
test('reading simulated incoming messages is isolated by participant',()=>{
 const p=fixture(),t=tracer.receiveMessages(tracer.createTracer(),2),read=tracer.readMessages(t,p);
 assert.equal(tracer.sessionMessages(read,p).unread,0);assert.equal(tracer.sessionMessages(read,simulate(p,{viewerRole:'traceur'})).unread,2);
});
test('Coach panel escapes text and preserves Double blind map masking',()=>{
 const p=fixture('full_blind'),s=createSearch(),t=tracer.replyCoachMock(tracer.createTracer(),p,s,'<script>hello</script>');
 const html=CoachScreen(s,p,t,{messagesOpen:true});assert.match(html,/data-coach-reply/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|data-map-path|data-map-marker/);
 assert.doesNotMatch(ObserverScreen(s,simulate(p,{viewerRole:'observer'}),t),/data-coach-message|data-coach-reply/);
 assert.doesNotMatch(CoachScreen({...s,phase:'ARCHIVED'},p,t,{messagesOpen:true}),/data-coach-reply/);
});
function application(){
 const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8'),start=app.indexOf('function handleCoachingCoachMessages(');
 assert.ok(start>=0,'Coach application handler missing');
 const p=fixture(),ctx=createContext({tracer,preparationState:p,searchState:createSearch(),tracerState:tracer.createTracer(),preparationUI:{},location:{pathname:'/coaching/session'},render(){}});
 runInContext(app.slice(start,app.indexOf('function confirmCoachingArchiveAction(',start)),ctx);return ctx;
}
test('actual Coach handler requires open panel and matching session and author',()=>{
 const c=application(),control={dataset:{coachMessage:'open',sessionId:c.preparationState.session.id,authorId:c.preparationState.viewerId}};
 c.handleCoachingCoachMessages(control);assert.equal(c.preparationUI.messagesOpen,true);
 control.dataset.coachMessage='reply';c.handleCoachingCoachMessages(control,'Bien reçu');assert.equal(c.tracerState.messages.at(-1).role,'Coach');
 const before=c.tracerState;control.dataset.sessionId='stale';c.handleCoachingCoachMessages(control,'Hello');assert.equal(c.tracerState,before);
});
for(const reason of ['closed','role','phase','author','route'])test(`actual Coach handler rejects ${reason}`,()=>{
 const c=application(),control={dataset:{coachMessage:'reply',sessionId:c.preparationState.session.id,authorId:c.preparationState.viewerId}};c.preparationUI.messagesOpen=true;
 if(reason==='closed')c.preparationUI.messagesOpen=false;
 if(reason==='role')c.preparationState=simulate(c.preparationState,{viewerRole:'observer'});
 if(reason==='phase')c.searchState.phase='ARCHIVED';
 if(reason==='author')control.dataset.authorId='other';
 if(reason==='route')c.location.pathname='/sessions/old';
 const before=c.tracerState;c.handleCoachingCoachMessages(control,'Hello');assert.equal(c.tracerState,before);assert.ok(c.preparationUI.messageNotice);
});
test('actual click and submit listeners connect the Coach panel and message form',()=>{
 const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8'),c=application(),dataset={sessionId:c.preparationState.session.id,authorId:c.preparationState.viewerId};
 c.document={querySelector(){return {focus(){}};}};
 c.event={target:{closest(selector){return selector==='[data-coach-message]'?{dataset:{...dataset,coachMessage:'open'}}:null;}}};
 let start=app.indexOf(" const coachMessage=event.target.closest('[data-coach-message]');");assert.ok(start>=0);
 runInContext('(function(){'+app.slice(start,app.indexOf(" const coachControl=",start))+'})()',c);
 assert.equal(c.preparationUI.messagesOpen,true);
 c.event={preventDefault(){},target:{matches(selector){return selector==='[data-coach-reply]';},dataset,elements:{reply:{value:'J’arrive'}}}};
 start=app.indexOf(" if(event.target.matches('[data-coach-reply]'))");assert.ok(start>=0);
 runInContext('(function(){'+app.slice(start,app.indexOf(" if(event.target.matches('[data-search-reply]'))",start))+'})()',c);
 assert.equal(c.tracerState.messages.at(-1).text,'J’arrive');assert.equal(c.tracerState.messages.at(-1).participantId,dataset.authorId);
});
test('messages refuse a Coach whose session designation has changed',()=>{
 const p=fixture();p.session.roles.coach='foreign';
 assert.throws(()=>tracer.replyCoachMock(tracer.createTracer(),p,createSearch(),'Hello'));
 assert.deepEqual(tracer.sessionMessages(tracer.createTracer(),p),{messages:[],unread:0});
});
