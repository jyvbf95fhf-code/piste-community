import {test} from 'node:test';import assert from 'node:assert/strict';import {createCoachingRemoteTransport} from '../src/coaching-remote-transport.mjs';import {createCoachingRemoteQueue} from '../src/coaching-remote-queue.mjs';
const client={auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}};
test('failed upload leaves sealed points intact, retry sends same batch identity and clears only after ack',async()=>{let disk=[],fail=true,ids=[];const queue=createCoachingRemoteQueue({storage:{async update(k,fn){disk=fn(disk);return disk;}},userId:'u',sessionId:'s'});await queue.appendPoint('pose',{sequence:1});await queue.appendPoint('pose',{sequence:2});const t=createCoachingRemoteTransport({client,queue,sessionId:'s',request:async(url,req)=>{const b=JSON.parse(req.body);if(b.operation==='read')return Response.json({projection:{id:'s',version:2}});ids.push(b.commandId);if(fail)throw Error('offline');return Response.json({projection:{id:'s',version:3},acknowledgedVersion:3});}});await assert.rejects(t.flush());assert.equal(disk.length,1);await queue.appendPoint('pose',{sequence:3});assert.equal(disk.length,2);fail=false;await t.flush();assert.equal(ids[0],ids[1]);assert.equal(disk.length,0);});
test('out of order snapshots never roll back geometry; unauthorized response clears the projection',async()=>{let next=5,seen=[];const t=createCoachingRemoteTransport({client,sessionId:'s',onProjection:p=>seen.push(p),request:async()=>next===403?Response.json({error:'denied'},{status:403}):Response.json({projection:{id:'s',version:next}})});await t.getProjection();next=2;await t.getProjection();assert.equal(seen.at(-1).version,5);next=403;await assert.rejects(t.getProjection());assert.equal(seen.at(-1),null);});
test('disconnect prevents a pending response from restoring a private projection',async()=>{let finish,seen=[];const t=createCoachingRemoteTransport({client,sessionId:'s',onProjection:p=>seen.push(p),request:()=>new Promise(resolve=>finish=resolve)});const pending=t.getProjection();await new Promise(resolve=>setImmediate(resolve));t.disconnect();finish(Response.json({projection:{id:'s',version:8}}));await assert.rejects(pending,/fermée/);assert.equal(seen.at(-1),null);});
test('finish is not sent while a GPS batch has no server acknowledgement',async()=>{let disk=[],commands=[];const queue=createCoachingRemoteQueue({storage:{async update(k,fn){disk=fn(disk);return disk;}},userId:'u',sessionId:'s'});await queue.appendPoint('search',{sequence:1});const t=createCoachingRemoteTransport({client,queue,sessionId:'s',request:async(url,req)=>{const body=JSON.parse(req.body);if(body.operation==='read')return Response.json({projection:{id:'s',version:1}});commands.push(body.type);throw Error('network lost');}});await assert.rejects(t.sendCommand('finish-search'));assert.deepEqual(commands,['gps-batch']);assert.equal(disk.length,1);});
test('finish drains points queued during an upload before closing the pose',async()=>{
 let disk=[],phase='LAYING',version=1,commands=[];
 const queue=createCoachingRemoteQueue({storage:{async update(k,fn){disk=fn(disk);return disk;}},userId:'u',sessionId:'s'});
 await queue.appendPoint('pose',{sequence:1});
 const t=createCoachingRemoteTransport({client,queue,sessionId:'s',request:async(url,req)=>{
  const b=JSON.parse(req.body);
  if(b.operation==='command'){
   commands.push(b.type);
   if(b.type==='gps-batch'&&b.payload.points[0].sequence===1)await queue.appendPoint('pose',{sequence:2});
   if(b.type==='finish-pose')phase='TRACK_FINISHED';version++;
  }
  return Response.json({projection:{id:'s',phase,version}});
 }});
 await t.sendCommand('finish-pose');
 assert.deepEqual(commands,['gps-batch','gps-batch','finish-pose']);assert.equal(disk.length,0);
});
test('a restored late pose batch stays local without blocking in-place after server closure',async()=>{
 let disk=[],commands=[],phase='TRACK_FINISHED',version=4;
 const queue=createCoachingRemoteQueue({storage:{async update(k,fn){disk=fn(disk);return disk;}},userId:'u',sessionId:'s'});
 await queue.appendPoint('pose',{sequence:34});
 const t=createCoachingRemoteTransport({client,queue,sessionId:'s',request:async(url,req)=>{
  const b=JSON.parse(req.body);
  if(b.type==='gps-batch')return Response.json({error:'Lot GPS non autorisé.'},{status:400});
  if(b.type){commands.push(b.type);phase='SEARCH_READY';version++;}
  return Response.json({projection:{id:'s',phase,version}});
 }});
 await t.sendCommand('in-place');assert.deepEqual(commands,['in-place']);
 assert.equal(disk.length,1);assert.equal(disk[0].points[0].sequence,34);
});
