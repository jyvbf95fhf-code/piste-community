import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityFriendshipService} from '../src/server/community-friendship-service.mjs';
import {createHistoryHandler} from '../supabase/functions/piste-history/handler.mjs';
import {createPersonalDataRepository} from '../src/server/personal-data-repository.mjs';
const actor='11111111-1111-4111-8111-111111111111',peer='22222222-2222-4222-8222-222222222222';
for(const code of ['PT409','40001']) {
 test('contacts '+code+' returns a single controlled conflict',async()=>{
  let calls=0;
  const service=createCommunityFriendshipService({rpc:async()=>{calls++;return {error:{code}};}});
  await assert.rejects(service.command(actor,{peerId:peer,commandId:actor,expectedVersion:0,action:'remove-contact'}),e=>e.status===409);
  assert.equal(calls,1);
 });
 test('history '+code+' refuses stale deletion with an actionable reason',async()=>{
  let calls=0;
  const chain={select(){return this;},eq(){return this;},async maybeSingle(){return {data:{id:actor}};}};
  const handler=createHistoryHandler({admin:{from:()=>chain,rpc:async()=>{calls++;return {error:{code}};}},authenticate:async()=>({id:actor})});
  const response=await handler(new Request('https://test.local',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({operation:'batch',items:[{key:'track:'+peer,action:'delete',expectedVersion:1}]})}));
  assert.equal(response.status,200);
  const result=(await response.json()).results[0];
  assert.equal(result.status,'refused');assert.match(result.reason,/actualisez/);assert.equal(calls,1);
 });
 test('personal data '+code+' refuses an obsolete upload as a conflict',async()=>{
  let calls=0;const repository=createPersonalDataRepository({rpc:async()=>{calls++;return {error:{code}};}},actor);
  await assert.rejects(repository.put({kind:'track',id:peer,commandId:actor,expectedRevision:0,payload:{}}),e=>e.status===409);
  assert.equal(calls,1);
 });
}
test('contacts still refuse a forbidden account',async()=>{
 const s=createCommunityFriendshipService({rpc:async()=>({error:{code:'42501'}})});
 await assert.rejects(s.snapshot(actor),e=>e.status===403);
});
test('personal data still refuses unauthorized writes',async()=>{
 const r=createPersonalDataRepository({rpc:async()=>({error:{code:'42501'}})},actor);
 await assert.rejects(r.put({kind:'track',id:peer,commandId:actor,expectedRevision:0,payload:{}}),e=>e.status===403);
});
