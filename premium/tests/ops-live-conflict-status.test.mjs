import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpsLiveProposedHandler} from '../src/server/ops-live-http.mjs';
const id='11111111-1111-4111-8111-111111111111';
for(const operation of ['read','command'])test('PT409 '+operation+' reaches the client as HTTP 409 without retry',async()=>{
 let calls=0;
 const handler=createOpsLiveProposedHandler({
 authClient:{auth:{getUser:async()=>({data:{user:{id}}})}},
 admin:{rpc:async()=>{calls++;return {error:{code:'PT409',message:'version_conflict'}};}},
 isAccountEnabled:async()=>true,enabled:true});
 const body={operation,id,after:1,version:1,commandId:id,expectedVersion:1,type:'close',payload:{}};
 const response=await handler(new Request('https://local.test',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify(body)}));
 assert.equal(response.status,409);assert.equal(calls,1);assert.equal((await response.json()).error,'Conflit de synchronisation.');
});
