import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoachingRemoteController} from '../src/coaching-remote-controller.mjs';
import {createCoachingRemoteTransport} from '../src/coaching-remote-transport.mjs';
import {createOpsLiveRemote} from '../src/ops-live-remote.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const identity={data:{user:{id:owner}}};
const client={auth:{getUser:async()=>identity,getSession:async()=>({data:{session:{access_token:'local-test',user:{id:owner}}}})},channel(){return {on(){return this;},subscribe(){},};},removeChannel:async()=>{}};
const memory=()=>{let rows=[];return {update:async(_key,fn)=>(rows=fn(rows))};};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
for(const phase of ['DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED','LEFT'])test(`no automatic Coaching requests after ${phase}`,async t=>{
 const timers=new Map();let next=0,calls=0;
 t.mock.method(globalThis,'setInterval',fn=>{timers.set(++next,fn);return next;});
 t.mock.method(globalThis,'clearInterval',id=>timers.delete(id));
 t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({projection:{id:'s',version:1,phase}});});
 const c=createCoachingRemoteController({client,storage:memory(),document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},navigator:{}});
 try{await c.connect('s');const initial=calls;for(const tick of [...timers.values()])tick();await settle();assert.equal(calls,initial);}finally{c.destroy();}
});
test('Coaching active poll stops when the final projection arrives, explicit reads still work',async t=>{
 const timers=new Map();let next=0,calls=0,phase='SEARCH_RUNNING',version=1;
 t.mock.method(globalThis,'setInterval',fn=>{timers.set(++next,fn);return next;});t.mock.method(globalThis,'clearInterval',id=>timers.delete(id));
 t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({projection:{id:'s',version:version++,phase}});});
 const c=createCoachingRemoteController({client,storage:memory(),document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},navigator:{}});
 try{await c.connect('s');assert.equal(timers.size,1);phase='DEBRIEF';for(const tick of [...timers.values()])tick();await settle();assert.equal(timers.size,0);const before=calls;await c.flush();assert.equal(calls,before+1);}finally{c.destroy();}
});
test('simultaneous Coaching refreshes share one HTTP read',async()=>{
 let release,calls=0;const pending=new Promise(r=>release=r);
 const transport=createCoachingRemoteTransport({client,sessionId:'s',request:async()=>{calls++;await pending;return Response.json({projection:{id:'s',version:1,phase:'SEARCH_RUNNING'}});}});
 const first=transport.getProjection(),second=transport.getProjection();await settle();release();await Promise.all([first,second]);assert.equal(calls,1);transport.disconnect();
});
test('automatic OPS polling reuses auxiliary reads for 30 seconds but explicit refresh is immediate',async()=>{
 let now=100000;const calls=[];const storage={getItem:()=>null,setItem:()=>{}};
 const c=createOpsLiveRemote({ownerId:owner,storage,clock:()=>now,call:async body=>{calls.push(body.operation);return [];}});
 await c.refresh({auxiliaryInterval:30000});now+=5000;await c.refresh({auxiliaryInterval:30000});
 assert.equal(calls.filter(x=>x==='list').length,2);assert.equal(calls.filter(x=>x==='notifications').length,1);assert.equal(calls.filter(x=>x==='invitations').length,1);
 await c.refresh();assert.equal(calls.filter(x=>x==='notifications').length,2);
 now+=30000;await c.refresh({auxiliaryInterval:30000});assert.equal(calls.filter(x=>x==='notifications').length,3);c.dispose();
});
test('OPS exposes verified final state even when list entry lacks closed flag',async()=>{
 const c=createOpsLiveRemote({ownerId:owner,storage:{getItem:()=>null,setItem:()=>{}},call:async b=>b.operation==='list'?[{id:'s',generation:1,version:1}]:b.operation==='read'?{id:'s',generation:1,version:1,lastSequence:0,points:[],metadata:{state:'Fin de piste'}}:[]});
 await c.refresh();assert.equal(c.view().sessions[0].ended,true);c.dispose();
});
test('closed local broadcast no longer keeps rapid OPS polling even if mission remains in progress',()=>{
 const storage={getItem:()=>JSON.stringify({ownerId:owner,missions:{m:{id:'s',closed:true}}}),setItem:()=>{}};
 const c=createOpsLiveRemote({ownerId:owner,storage,call:async()=>[]});
 const missions=[{id:'m',ownerUserId:owner,status:'En cours'}];
 assert.equal(c.hasActiveBroadcast(missions,()=>({share_live:true})),false);c.dispose();
});
test('an active owned mission keeps rapid OPS polling before first publication',()=>{
 const c=createOpsLiveRemote({ownerId:owner,storage:{getItem:()=>null,setItem:()=>{}},call:async()=>[]});
 const missions=[{id:'m',ownerUserId:owner,status:'En cours'}];
 assert.equal(c.hasActiveBroadcast(missions,()=>({share_live:true})),true);
 assert.equal(c.hasActiveBroadcast(missions,()=>({share_live:false})),false);c.dispose();
});
test('one minute of active OPS discovery uses 16 requests instead of 36',async()=>{
 let now=100000;const calls=[];
 const c=createOpsLiveRemote({ownerId:owner,clock:()=>now,storage:{getItem:()=>null,setItem:()=>{}},call:async b=>{calls.push(b.operation);return [];}});
 for(let tick=0;tick<12;tick++){await c.refresh({auxiliaryInterval:30000});now+=5000;}
 assert.equal(calls.length,16);assert.equal(calls.filter(x=>x==='list').length,12);c.dispose();
});
test('failed coalesced Coaching read can be retried without retaining a rejected promise',async()=>{
 let calls=0;
 const c=createCoachingRemoteTransport({client,sessionId:'s',request:async()=>{calls++;return calls===1?Response.json({error:'offline'},{status:503}):Response.json({projection:{id:'s',version:1,phase:'SEARCH_RUNNING'}});}});
 await assert.rejects(c.getProjection(),/offline/);await c.getProjection();assert.equal(calls,2);c.disconnect();
});
test('access loss stops the Coaching timer and clears its projection',async t=>{
 const timers=new Map();let next=0,denied=false;
 t.mock.method(globalThis,'setInterval',fn=>{timers.set(++next,fn);return next;});t.mock.method(globalThis,'clearInterval',id=>timers.delete(id));
 t.mock.method(globalThis,'fetch',async()=>denied?Response.json({error:'Access denied'},{status:403}):Response.json({projection:{id:'s',version:1,phase:'SEARCH_RUNNING'}}));
 const c=createCoachingRemoteController({client,storage:memory(),document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},navigator:{}});
 try{await c.connect('s');denied=true;await assert.rejects(c.flush(),/Access denied/);assert.equal(timers.size,0);assert.equal(c.view().projection,null);}finally{c.destroy();}
});
test('debrief keeps realtime note updates without restarting the polling timer',async t=>{
 const timers=new Map();let next=0,version=1,onVersion;
 const realtimeClient={...client,channel(){return {on(_kind,_filter,callback){onVersion=callback;return this;},subscribe(){}};}};
 t.mock.method(globalThis,'setInterval',fn=>{timers.set(++next,fn);return next;});t.mock.method(globalThis,'clearInterval',id=>timers.delete(id));
 t.mock.method(globalThis,'fetch',async()=>Response.json({projection:{id:'s',version,phase:'DEBRIEF',notes:[{text:'note '+version}]}}));
 const c=createCoachingRemoteController({client:realtimeClient,storage:memory(),document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},navigator:{}});
 try{await c.connect('s');version=2;onVersion();await settle();assert.equal(c.view().projection.notes[0].text,'note 2');assert.equal(timers.size,0);}finally{c.destroy();}
});
test('a version broadcast during an older read triggers a fresh trailing read',async()=>{
 let release,onVersion,calls=0;const pending=new Promise(r=>release=r),seen=[];
 const realtimeClient={...client,channel(){return {on(_kind,_filter,callback){onVersion=callback;return this;},subscribe(){}};}};
 const transport=createCoachingRemoteTransport({client:realtimeClient,sessionId:'s',onProjection:p=>{if(p)seen.push(p.version);},request:async()=>{const version=++calls;if(version===1)await pending;return Response.json({projection:{id:'s',version,phase:'DEBRIEF'}});}});
 try{await transport.subscribe();const reading=transport.getProjection();await settle();onVersion({payload:{version:2}});release();await reading;await settle();assert.equal(calls,2);assert.deepEqual(seen,[1,2]);}finally{transport.disconnect();}
});
test('local authentication expiry also clears Coaching projection and stops automatic polling',async t=>{
 const timers=new Map();let next=0,expired=false;
 const expiringClient={...client,auth:{...client.auth,getSession:async()=>({data:{session:expired?null:{access_token:'local-test'}}})}};
 t.mock.method(globalThis,'setInterval',fn=>{timers.set(++next,fn);return next;});t.mock.method(globalThis,'clearInterval',id=>timers.delete(id));
 t.mock.method(globalThis,'fetch',async()=>Response.json({projection:{id:'s',version:1,phase:'SEARCH_RUNNING'}}));
 const c=createCoachingRemoteController({client:expiringClient,storage:memory(),document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},navigator:{}});
 try{await c.connect('s');expired=true;await assert.rejects(c.flush(),/Connexion requise/);assert.equal(c.view().projection,null);assert.equal(timers.size,0);}finally{c.destroy();}
});
test('explicit OPS refresh upgrades an in-flight automatic refresh to include invitations',async()=>{
 let now=100000,release,block=false;const pending=new Promise(r=>release=r),calls=[];
 const c=createOpsLiveRemote({ownerId:owner,clock:()=>now,storage:{getItem:()=>null,setItem:()=>{}},call:async b=>{calls.push(b.operation);if(block&&b.operation==='list')await pending;return [];}});
 await c.refresh({auxiliaryInterval:30000});now+=5000;block=true;
 const automatic=c.refresh({auxiliaryInterval:30000});await settle();const manual=c.refresh();release();await Promise.all([automatic,manual]);
 assert.equal(calls.filter(x=>x==='list').length,2);assert.equal(calls.filter(x=>x==='notifications').length,2);assert.equal(calls.filter(x=>x==='invitations').length,2);c.dispose();
});
