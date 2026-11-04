import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeCommunityPublication} from '../src/community-publication.mjs';
import {createCommunityFeedService} from '../src/server/community-feed-service.mjs';
const a='11111111-1111-4111-8111-111111111111';
test('publication keeps geographic gaps and strips actor/photograph claims',()=>{
 const segments=[[{x:7,y:48},{x:7.1,y:48.1}],[{x:7.2,y:48.2},{x:7.3,y:48.3}]];
 const p=normalizeCommunityPublication({text:'Piste',authorId:'other',attachment:{type:'track',sourceId:'source',fields:{dog:{id:'dog',name:'Chien',personalPhotoDataUrl:'private'},map:{coordinateSpace:'wgs84',segments}}}});
 assert.equal(p.visibility,'contacts');assert.equal(p.authorId,undefined);assert.equal(p.attachment.fields.dog.personalPhotoDataUrl,undefined);assert.deepEqual(p.attachment.fields.map.segments,segments);
 for(const map of [{paths:[{d:'M0 0'}]},{coordinateSpace:'wgs84',segments:[[{x:'7',y:48},{x:7,y:48}]]},{coordinateSpace:'wgs84',segments:[[{x:7,y:91},{x:7,y:48}]]}])assert.throws(()=>normalizeCommunityPublication({attachment:{type:'track',sourceId:'s',fields:{map}}}));
 assert.throws(()=>normalizeCommunityPublication({attachment:{type:'operational',sourceId:'s',fields:{title:'OPS'}}}));assert.throws(()=>normalizeCommunityPublication({}));
});
test('feed service uses verified actor and validates command UUID',async()=>{let args;const s=createCommunityFeedService({rpc:async(name,value)=>{args={name,value};return {data:{version:1}};}});await s.command(a,{action:'create-post',commandId:crypto.randomUUID(),actorId:'spoof',post:{text:'Bonjour'}});assert.equal(args.value.p_actor,a);assert.equal(args.value.p_body.actorId,undefined);assert.throws(()=>s.command(a,{action:'create-post',commandId:'bad',post:{text:'x'}}));});
