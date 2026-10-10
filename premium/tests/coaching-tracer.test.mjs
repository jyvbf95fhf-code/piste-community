import {test} from 'node:test';import assert from 'node:assert/strict';
import {createDraft,updateDraft,createSession,setObservers} from '../src/coaching.mjs';
import {createPreparation,simulate} from '../src/coaching-preparation.mjs';
import {createTracer,advanceTracer,tracerView,receiveMessages,readMessages,replyMock} from '../src/coaching-tracer.mjs';
const prep=(patch={})=>simulate(createPreparation(createSession(setObservers(updateDraft(createDraft({name:'Sébastien'},[{id:'nox',name:'Nox'}]),{mode:'normal',traceType:'direct'}),['lea','hugo'])).session),{viewerRole:'traceur',gps:'fresh',phase:'ready',...patch});
test('phase guards and explicit mock counters; finish is separate from in-place',()=>{let s=createTracer();const p=prep();assert.throws(()=>advanceTracer(s,p,'finish'));s=advanceTracer(s,p,'start');s=advanceTracer(s,p,'progress');assert.equal(s.phase,'active');assert.equal(s.seconds,30);assert.ok(s.distance>0);s=advanceTracer(s,p,'finish');assert.equal(s.phase,'finished');assert.throws(()=>advanceTracer(s,p,'progress'));s=advanceTracer(s,p,'in-place');assert.equal(s.phase,'in_place');assert.equal(advanceTracer(s,p,'in-place').phase,'in_place');});
test('interruptions never fabricate points or connect missing segments; resume same phase',()=>{assert.throws(()=>advanceTracer(createTracer(),prep({gps:'acquiring'}),'start'),/Position.*indisponible/);let s=advanceTracer(createTracer(),prep(),'start');s=advanceTracer(s,prep(),'progress');const old=structuredClone(s.segments);s=advanceTracer(s,prep({gps:'unavailable'}),'progress');assert.deepEqual(s.segments,old);assert.equal(s.gap,true);s=advanceTracer(s,prep(),'progress');assert.equal(s.phase,'active');assert.equal(s.segments.length,2);assert.equal(s.segments[1].length,1);assert.equal(s.resumed,true);});
test('only currently internal Traceur can perform actions; all three modes preserve available actors',()=>{for(const mode of ['normal','simple_blind','full_blind']){const p=prep({mode});assert.equal(tracerView(createTracer(),p).markers.length,5);assert.equal(tracerView(createTracer(),simulate(p,{positionsPresent:false})).markers.length,0);}for(const role of ['coach','driver','observer'])assert.throws(()=>advanceTracer(createTracer(),prep({viewerRole:role}),'start'));assert.throws(()=>advanceTracer(createTracer(),prep({traceurKind:'external'}),'start'));});
test('stale/unavailable and individually missing positions cannot append a point',()=>{for(const patch of [{gps:'stale'},{gps:'unavailable'},{missingActors:['alex']},{positionsPresent:false}]){const s=advanceTracer(advanceTracer(createTracer(),prep(),'start'),prep(patch),'progress');assert.equal(s.segments[0].length,1);assert.equal(s.distance,0);}});
test('mock messages: no unread badge at zero, receive/read/reply in memory',()=>{let s=createTracer();assert.equal(tracerView(s,prep()).unread,0);s=receiveMessages(s,2);assert.equal(tracerView(s,prep()).unread,2);s=readMessages(s);assert.equal(tracerView(s,prep()).unread,0);s=replyMock(s,'J’arrive');assert.equal(s.messages.at(-1).text,'J’arrive');assert.equal(s.messages.at(-1).outgoing,true);assert.throws(()=>replyMock(s,' '));assert.throws(()=>replyMock(s,'x'.repeat(121)));});
import {TracerScreen} from '../src/coaching-tracer-screen.mjs';
test('terrain actions and messages are persistent; recenter belongs exclusively to the map',()=>{const html=TracerScreen(createTracer(),prep());assert.match(html,/data-tracer="start"/);assert.match(html,/data-tracer="messages"/);assert.equal((html.match(/data-tracer="center"/g)||[]).length,1);assert.ok(html.indexOf('data-tracer="center"')<html.indexOf('class="tracer-hud"'));assert.ok(!html.includes('data-tracer-unread'));assert.ok(!html.includes('data-map-path="releve"'));assert.match(TracerScreen(receiveMessages(createTracer(),2),prep()),/data-tracer-unread>2/);});
test('dialog escapes message content; unavailable orientation is omitted',()=>{const s=replyMock(createTracer(),'<script>alert(1)</script>');const html=TracerScreen(s,prep({gps:'unavailable'}),{messagesOpen:true});assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('data-tracer-orientation'));assert.match(html,/aria-modal="true"/);});

import {preparationView} from '../src/coaching-preparation.mjs';
import {selectPreparation} from '../src/coaching.mjs';
import {createSearch,searchView,advanceSearch} from '../src/coaching-search.mjs';
import {syncSession,debriefView} from '../src/coaching-session-flow.mjs';

test('start requires a finite available own position and preserves originals',()=>{
 for(const patch of [{gps:'acquiring'},{gps:'unavailable'},{missingActors:['alex']},{positionsPresent:false}]){
  const p=prep(patch),s=createTracer(),before=structuredClone({p,s});
  assert.throws(()=>advanceTracer(s,p,'start'),/Position.*indisponible/);
  assert.deepEqual({p,s},before);
 }
 const p=prep();p.points[p.viewerId]={x:NaN,y:91};
 assert.throws(()=>advanceTracer(createTracer(),p,'start'),/Position.*indisponible/);
});

test('explicit mock recording supplies a post-session departure without creating a selected start',()=>{
 for(const point of [{x:173,y:91},{x:119,y:157}]){
  const p=prep();p.points[p.viewerId]={...point,accuracy:90};
  const before=structuredClone(p);
  let t=advanceTracer(createTracer(),p,'start');
  assert.deepEqual(t.segments[0][0],point);
  assert.equal(t.originSource,'mock-position');
  t=advanceTracer(t,p,'progress');
  assert.ok(t.segments.flat().every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)));
  let s=syncSession(createSearch(),p,t);s.phase='DEBRIEF';
  const original=structuredClone({s,t});
  const report=debriefView(s,p,t);
  assert.deepEqual(report.map.start,point);
  assert.equal(report.map.startSource,'recorded-mock');
  assert.equal(report.map.showStart,true);
  assert.equal(preparationView(p).start,null);
  report.map.start.x=-1;
  assert.deepEqual({s,t},original);assert.deepEqual(p,before);
  for(const mode of ['simple_blind','full_blind']){
   const live=searchView({...s,phase:'SEARCH_READY'},simulate(p,{mode,viewerRole:'driver'}));
   assert.equal(live.start,null);assert.equal(live.arrival,null);
   assert.ok(!live.paths.some(q=>['reference','pose'].includes(q.kind)));
   assert.ok(!live.markers.some(q=>q.role==='traceur'));
  }
 }
});

test('selected departure keeps precedence; empty and demonstration-only pose never invent a departure',()=>{
 const draft=selectPreparation(updateDraft(createDraft({name:'Test'},[{id:'dog',name:'Test'}]),{mode:'normal',traceType:'prepared'}),{id:'known',name:'Selected fixture',source:'mock',start:{x:47,y:83,space:'mock-map'}});
 const p=simulate(createPreparation(createSession(draft).session),{viewerRole:'traceur',gps:'fresh',phase:'ready'});
 const t=advanceTracer(createTracer(),p,'start');
 let s=syncSession(createSearch(),p,t);s.phase='DEBRIEF';
 assert.deepEqual(searchView(s,p).start,{x:47,y:83});
 assert.equal(searchView(s,p).startSource,'selected');
 for(const fixturePose of [false,true]){
  const view=searchView({...createSearch(),phase:'DEBRIEF',fixturePose},prep());
  assert.equal(view.start,null);assert.equal(view.showStart,false);assert.equal(view.startSource,null);
 }
});

test('search without own position keeps an unavailable origin until an explicit mock position arrives',()=>{
 const p=prep({viewerRole:'driver',positionsPresent:false});
 let s=advanceSearch({...createSearch(),phase:'SEARCH_READY'},p,'start');
 assert.equal(s.origin,null);assert.deepEqual(s.segments,[]);
 const available=simulate(p,{positionsPresent:true});available.points[available.viewerId]={x:163,y:137};
 s=advanceSearch(s,available,'progress');
 assert.deepEqual(s.segments,[[{x:163,y:137}]]);
});
