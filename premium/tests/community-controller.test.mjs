import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityController} from '../src/community-controller.mjs';
import {createCommunityStore} from '../src/community-store.mjs';

function storeWithTwoUsers(){return createCommunityStore({profiles:[{id:'self',displayName:'Moi',dogIds:[]},{id:'alex',displayName:'Alex',dogIds:[]}],posts:[],contacts:[],contactRequests:[],follows:[],notifications:[]});}

test('post creation is staged for confirmation and defaults to private with no selected source fields',()=>{
 const store=storeWithTwoUsers(),controller=createCommunityController({store,origin:'https://piste.test',sourceOptions:[{type:'track',id:'t-1',data:{distance:'850 m',hidden:'never'},availableFields:['distance']}]});
 const draft=controller.submit('post-create',{text:'Trace du matin',visibility:'contacts',sourceType:'track',sourceId:'t-1',fields:[]});
 assert.equal(draft.pending,true);
 assert.equal(store.getFeed().length,0);
 const post=controller.dispatch('confirm-post');
 assert.equal(post.text,'Trace du matin');
 assert.equal(post.visibility,'contacts');
 assert.deepEqual(post.attachment.fields,{});
 assert.equal(store.getFeed().length,1);
});

test('Contact and Follow controls remain independent through controller actions',()=>{
 const store=storeWithTwoUsers(),controller=createCommunityController({store});
 controller.dispatch('follow',{userId:'alex'});
 controller.dispatch('contact-request',{userId:'alex'});
 assert.equal(store.getRelation('alex').following,true);
 assert.equal(store.getRelation('alex').contactStatus,'outgoing_pending');
 assert.equal(controller.dispatch('cancel-contact',{userId:'alex'}),true);
 assert.equal(store.getRelation('alex').following,true);
 assert.equal(store.getRelation('alex').contactStatus,'none');
});

test('track sharing requires a visible track attachment and differs from post sharing',()=>{
 const store=storeWithTwoUsers(),controller=createCommunityController({store,origin:'https://piste.test'});
 const post=store.createPost({text:'Lisière',visibility:'community',source:{type:'track',id:'t-1',data:{distance:'850 m'},fields:['distance']}});
 assert.equal(controller.dispatch('share-post',{postId:post.id}).kind,'post');
 assert.equal(controller.dispatch('share-track',{postId:post.id}).kind,'track');
 const hidden=store.createPost({text:'Privé',source:{type:'track',id:'t-2',data:{distance:'1 km'},fields:['distance']}});
 const stranger=createCommunityController({store:storeWithTwoUsers(),origin:'https://piste.test'});
 // A different viewer cannot obtain even the ordinary publication share link.
 assert.throws(()=>stranger.dispatch('share-post',{postId:hidden.id}),/visible|indisponible/i);
});

test('source selection accepts only existing session and track options, never OPS',()=>{
 const store=storeWithTwoUsers(),controller=createCommunityController({store,sourceOptions:[
  {type:'session',id:'s-1',label:'Session terminée',data:{distance:'850 m'},availableFields:['distance']},
  {type:'track',id:'t-1',label:'Trace préparée',data:{provenance:'manual'},availableFields:['provenance']}
 ]});
 assert.equal(controller.changeSource('track','t-1'),'/community/new?sourceType=track&sourceId=t-1');
 assert.throws(()=>controller.changeSource('operational','mission-1'),/OPS|source/i);
 assert.throws(()=>controller.changeSource('track','missing'),/disponible|source/i);
});

test('contact search and Live authorization dispatch use the existing Contact store',()=>{
 const store=createCommunityStore({profiles:[{id:'self',displayName:'Moi',dogIds:[]},{id:'alex',displayName:'Alex Martin',role:'Conducteur',dogIds:[]}],contacts:[{userIds:['self','alex']}],posts:[],contactRequests:[],follows:[],notifications:[]});
 const controller=createCommunityController({store});
 assert.deepEqual(controller.dispatch('search-contacts',{query:'alex'}).map(item=>item.id),['alex']);
 assert.equal(controller.dispatch('set-contact-permission',{userId:'alex',permission:'live_access_authorized',enabled:true}),true);
 assert.equal(store.getContactPermissions('alex').live_access_authorized,true);
});
