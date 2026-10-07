import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_STATUS,
  canViewCommunityPost,
  contactStatus,
  projectCommunitySource,
  buildCommunitySharePayload,
  searchCommunity
} from '../src/community-model.mjs';
import {resolveCommunityRoute} from '../src/community-routes.mjs';

const post={id:'post-1',authorId:'alex',visibility:'contacts',text:'Piste du matin'};
const relationships={
  contacts:[],
  contactRequests:[{id:'r1',fromUserId:'alex',toUserId:'viewer',status:'pending'}],
  follows:[{fromUserId:'viewer',toUserId:'alex'}]
};

test('Contact-only content is hidden from a follower and from either pending-request side',()=>{
  assert.equal(canViewCommunityPost(relationships,post,'viewer'),false);
  const outgoing={...relationships,contactRequests:[{id:'r2',fromUserId:'viewer',toUserId:'alex',status:'pending'}]};
  assert.equal(canViewCommunityPost(outgoing,post,'viewer'),false);
});

test('an accepted Contact relation grants contact visibility in both directions',()=>{
  const state={...relationships,contacts:[{userIds:['viewer','alex']}],contactRequests:[]};
  assert.equal(canViewCommunityPost(state,post,'viewer'),true);
  assert.equal(contactStatus(state,'alex','viewer'),CONTACT_STATUS.ACCEPTED);
});

test('contact states preserve the direction of a pending request',()=>{
  assert.equal(contactStatus(relationships,'viewer','alex'),CONTACT_STATUS.INCOMING_PENDING);
  assert.equal(contactStatus({contacts:[],contactRequests:[{fromUserId:'viewer',toUserId:'alex',status:'pending'}]},'viewer','alex'),CONTACT_STATUS.OUTGOING_PENDING);
  assert.equal(contactStatus({contacts:[],contactRequests:[]},'viewer','alex'),CONTACT_STATUS.NONE);
});

test('source projection keeps only selected allowlisted values and rejects OPS',()=>{
  const source={dog:{id:'nox',name:'Nox',notes:'private note'},distance:'850 m',trackAge:'00:12:00',environment:'Forêt',secret:'never share',points:[{x:1,y:2,secret:'x'}]};
  const result=projectCommunitySource('session','s-1',source,['distance','dog','points','secret']);
  assert.deepEqual(result,{type:'session',sourceId:'s-1',readOnly:true,fields:{distance:'850 m',dog:{id:'nox',name:'Nox'},points:[{x:1,y:2}]}});
  assert.throws(()=>projectCommunitySource('operational','mission-1',source,['distance']),/OPS|source/i);
});

test('publication sharing and track sharing use different payloads and links',()=>{
  const post={id:'p-1',text:'Une piste',title:'Lisière',attachment:{type:'track',sourceId:'t-1',fields:{distance:'850 m'}}};
  assert.deepEqual(buildCommunitySharePayload('post',post,'https://piste.example'),{
    kind:'post',title:'Une piste',url:'https://piste.example/community/post/p-1',text:'Une piste · PISTE Community'
  });
  assert.deepEqual(buildCommunitySharePayload('track',post,'https://piste.example'),{
    kind:'track',title:'Lisière',url:'https://piste.example/community/post/p-1?share=track',text:'Lisière · tracé partagé dans PISTE Community'
  });
});

test('search returns only visible posts and tracks explicitly shared by those posts',()=>{
  const state={viewerId:'viewer',profiles:[{id:'viewer',displayName:'Moi'},{id:'alex',displayName:'Alex'}],contacts:[],contactRequests:[],follows:[],posts:[
    {id:'private-track',authorId:'alex',visibility:'contacts',text:'secret sentier',attachment:{type:'track',fields:{}}},
    {id:'shared-track-post',authorId:'alex',visibility:'community',text:'Trace en forêt',attachment:{type:'track',sourceId:'t-1',fields:{provenance:'Piste forestière'}}}
  ]};
  const privateTracks=[{id:'local-track',name:'Secret sentier'}];
  assert.deepEqual(searchCommunity({state,viewerId:'viewer',query:'secret',tracks:privateTracks}),[]);
  const results=searchCommunity({state,viewerId:'viewer',query:'trace',tracks:privateTracks});
  assert.ok(results.some(item=>item.type==='track'&&item.id==='shared-track-post'));
  assert.ok(!results.some(item=>item.id==='local-track'));
});

test('Community routes decode IDs and reject malformed or unrelated paths',()=>{
  assert.deepEqual(resolveCommunityRoute('/community'),{type:'feed'});
  assert.deepEqual(resolveCommunityRoute('/community/profile/me'),{type:'profile',id:'self'});
  assert.deepEqual(resolveCommunityRoute('/community/profile/alex%3Aone'),{type:'profile',id:'alex:one'});
  assert.deepEqual(resolveCommunityRoute('/community/post/p-1'),{type:'post',id:'p-1'});
  assert.deepEqual(resolveCommunityRoute('/community/new?source=track'),{type:'new'});
  assert.equal(resolveCommunityRoute('/community/profile/%E0%A4%A'),null);
  assert.equal(resolveCommunityRoute('/dogs'),null);
});
