import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpsLiveRemote} from '../src/ops-live-remote.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const storage=()=>({getItem:()=>null,setItem(){}});
const conflict=()=>Object.assign(Error('conflict'),{status:409});
test('persistent read conflicts stop after three requests, including automatic refreshes',async()=>{
 let reads=0,total=0;const remote=createOpsLiveRemote({ownerId:owner,storage:storage(),call:async b=>{
  total++;if(b.operation==='list')return [{id:owner,version:1,generation:1}];
  if(b.operation==='read'){if(++reads>10)throw Error('unbounded retries');throw conflict();}return [];
 }});
 await remote.refresh({auxiliaryInterval:30000});assert.equal(reads,3);assert.equal(remote.view().retryPaused,true);
 const before=total;for(let i=0;i<10;i++)await remote.refresh({auxiliaryInterval:30000});assert.equal(total,before);
});
test('three failed automatic cycles pause requests; only explicit retry resumes them',async()=>{
 let calls=0,offline=true;const remote=createOpsLiveRemote({ownerId:owner,storage:storage(),call:async()=>{
  calls++;if(offline)throw Error('offline');return [];
 }});
 for(let i=0;i<8;i++)await remote.refresh({auxiliaryInterval:30000});
 assert.equal(calls,3);assert.equal(remote.view().retryPaused,true);
 offline=false;await remote.refresh();assert.equal(calls,3,'background refresh cannot reset a paused circuit');
 await remote.retry();assert.equal(remote.view().retryPaused,false);assert.equal(remote.view().connection,'connected');assert.equal(calls,6);
});
test('a conflict on a later GPS page restarts a clean snapshot without duplicate points',async()=>{
 let reads=0;const bodies=[];const point=n=>({sequence:n,segmentId:'a',latitude:48+n/1000,longitude:7,accuracy:5,capturedAt:'2026-11-12T08:00:00Z'});
 const remote=createOpsLiveRemote({ownerId:owner,storage:storage(),call:async b=>{
  if(b.operation==='list')return [{id:owner,version:1,generation:1}];
  if(b.operation!=='read')return [];bodies.push(b);reads++;
  if(reads===2)throw conflict();
  return {id:owner,version:reads>=3?2:1,generation:1,lastSequence:2,metadata:{},points:reads===1?[point(1)]:[point(1),point(2)]};
 }});
 await remote.refresh();assert.equal(remote.view().connection,'connected');assert.equal(reads,3);
 assert.equal(bodies[2].after,0);assert.equal(bodies[2].version,undefined);
 assert.equal(remote.projection(owner).gpsTrack.segments[0].length,2);
});
test('non-advancing pagination stops immediately instead of downloading forever',async()=>{
 let reads=0;const remote=createOpsLiveRemote({ownerId:owner,storage:storage(),call:async b=>{
 if(b.operation==='list')return [{id:owner,version:1,generation:1}];if(b.operation!=='read')return [];
 if(++reads>5)throw Error('unbounded pages');
 return {id:owner,version:1,generation:1,lastSequence:2,metadata:{},points:[{sequence:1,segmentId:'a',capturedAt:'2026-11-12T08:00:00Z'}]};
 }});
 await remote.refresh();assert.equal(reads,2);assert.equal(remote.view().connection,'offline');
});

