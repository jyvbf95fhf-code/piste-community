import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityStore} from '../src/community-store.mjs';
import {contactStatus} from '../src/community-model.mjs';

const emptyStore=()=>createCommunityStore({profiles:[
  {id:'self',displayName:'Moi',dogIds:[]},{id:'alex',displayName:'Alex',dogIds:[]},{id:'lea',displayName:'Léa',dogIds:[]}
],posts:[],contacts:[],contactRequests:[],follows:[],notifications:[]});

test('the owner can edit the visible name while another profile cannot',()=>{
  const store=emptyStore();
  assert.equal(store.updateOwnProfile({displayName:'Pisteur'}).displayName,'Pisteur');
  assert.throws(()=>store.updateProfile('alex',{displayName:'Pirate'}),/autorisé|propre|profil/i);
  assert.throws(()=>store.updateOwnProfile({displayName:'   '}),/nom/i);
});

test('contact request progresses from outgoing pending to accepted for both users',()=>{
  const store=emptyStore();
  store.sendContactRequest('alex');
  assert.equal(store.getRelation('alex').contactStatus,'outgoing_pending');
  assert.equal(store.getContactRequests('alex').sent.length,1);
  assert.equal(store.acceptContactRequest(store.getContactRequests('alex').sent[0].id),false);
  assert.equal(store.getRelation('alex').contactStatus,'outgoing_pending');
});

test('recipient accepts an incoming request and both sides become Contacts',()=>{
  const store=createCommunityStore({viewerId:'alex',profiles:[{id:'alex',displayName:'Alex',dogIds:[]},{id:'self',displayName:'Moi',dogIds:[]}],posts:[],contacts:[],contactRequests:[{id:'in-1',fromUserId:'self',toUserId:'alex',status:'pending'}],follows:[],notifications:[]});
  assert.equal(store.getRelation('self').contactStatus,'incoming_pending');
  assert.equal(store.acceptContactRequest('in-1'),true);
  assert.equal(store.getRelation('self').contactStatus,'accepted');
  assert.equal(contactStatus(store.getState(),'self','alex'),'accepted');
  assert.equal(store.getContactRequests('self').contacts.length,1);
});

test('refusal and cancellation remove pending visibility without changing Follow',()=>{
  const store=emptyStore();
  store.sendContactRequest('alex');
  const request=store.getContactRequests('alex').sent[0];
  assert.equal(store.cancelContactRequest(request.id),true);
  assert.equal(store.getRelation('alex').contactStatus,'none');
  const incoming=createCommunityStore({viewerId:'self',profiles:[{id:'self',displayName:'Moi',dogIds:[]},{id:'lea',displayName:'Léa',dogIds:[]}],posts:[],contacts:[],contactRequests:[{id:'in-1',fromUserId:'lea',toUserId:'self',status:'pending'}],follows:[],notifications:[]});
  assert.equal(incoming.refuseContactRequest('in-1'),true);
  assert.equal(incoming.getRelation('lea').contactStatus,'none');
  incoming.follow('lea');
  assert.equal(incoming.getRelation('lea').following,true);
  assert.equal(incoming.getRelation('lea').contactStatus,'none');
});

test('Follow is directional, toggles, and never grants contact visibility',()=>{
  const store=emptyStore();
  store.follow('alex');
  assert.equal(store.getRelation('alex').following,true);
  assert.equal(store.getRelation('alex').followedBy,false);
  store.unfollow('alex');
  assert.equal(store.getRelation('alex').following,false);
  assert.equal(store.getRelation('alex').contactStatus,'none');
});

test('only accepted Contacts see contact posts; followers and pending users do not',()=>{
  const store=createCommunityStore({profiles:[{id:'self',displayName:'Moi',dogIds:[]},{id:'alex',displayName:'Alex',dogIds:[]}],contacts:[],contactRequests:[],follows:[],notifications:[],posts:[{id:'p',authorId:'alex',visibility:'contacts',text:'secret'}]});
  assert.equal(store.getVisiblePost('p'),null);
  store.follow('alex');
  assert.equal(store.getVisiblePost('p'),null);
  store.sendContactRequest('alex');
  assert.equal(store.getVisiblePost('p'),null);
});

test('like toggle and comment ownership produce matching notification records',()=>{
  const store=createCommunityStore({profiles:[{id:'self',displayName:'Moi',dogIds:[]},{id:'alex',displayName:'Alex',dogIds:[]}],contacts:[],contactRequests:[],follows:[],notifications:[],posts:[{id:'p',authorId:'alex',visibility:'community',text:'Piste'}]});
  assert.equal(store.toggleLike('p'),true);
  assert.equal(store.getVisiblePost('p').likes.length,1);
  assert.equal(store.toggleLike('p'),false);
  const comment=store.addComment('p','Belle piste');
  assert.equal(comment.text,'Belle piste');
  assert.equal(store.deleteOwnComment('p',comment.id),true);
  assert.equal(store.getVisiblePost('p').comments.length,0);
  assert.deepEqual(store.getState().notifications.map(n=>n.type),['like','comment']);
});

test('comments and likes cannot be used on a post that the viewer cannot see',()=>{
  const store=createCommunityStore({profiles:[{id:'self',displayName:'Moi',dogIds:[]},{id:'alex',displayName:'Alex',dogIds:[]}],contacts:[],contactRequests:[],follows:[],notifications:[],posts:[{id:'p',authorId:'alex',visibility:'contacts',text:'Privé'}]});
  assert.throws(()=>store.addComment('p','Bonjour'),/visible|disponible/i);
  assert.throws(()=>store.toggleLike('p'),/visible|disponible/i);
});

test('selected source fields default to none and cannot include OPS or mutate sources',()=>{
  const store=emptyStore();
  const source={distance:'850 m',dog:{id:'nox',name:'Nox'},trackAge:'00:08',points:[{x:1,y:2}],hidden:'private'};
  const post=store.createPost({text:'Retour terrain',visibility:'private',source:{type:'track',id:'t-1',data:source,fields:[]}});
  assert.deepEqual(post.attachment.fields,{});
  const shared=store.createPost({text:'Trace partagée',source:{type:'track',id:'t-1',data:source,fields:['distance','points']}});
  assert.deepEqual(shared.attachment.fields,{distance:'850 m',points:[{x:1,y:2}]});
  assert.deepEqual(source,{distance:'850 m',dog:{id:'nox',name:'Nox'},trackAge:'00:08',points:[{x:1,y:2}],hidden:'private'});
  assert.throws(()=>store.createPost({source:{type:'operational',id:'mission-1',data:source,fields:['distance']}}),/OPS|source/i);
  assert.throws(()=>store.createPost({source:{type:'track',id:'t-empty',data:source,fields:[]}}),/texte|photo|piste/i);
});

test('publication photos must use an existing local mock asset',()=>{
  const store=emptyStore();
  assert.throws(()=>store.createPost({text:'Photo',photo:'https://outside.example/image.jpg'}),/photo|locale|mock/i);
  assert.ok(store.createPost({text:'Photo',photo:'/src/assets/hero-terrain-sunset.png'}));
});

test('community post visibility defaults to private and owner can delete only own post',()=>{
  const store=emptyStore();
  const post=store.createPost({text:'Mon post'});
  assert.equal(post.visibility,'private');
  assert.equal(store.getVisiblePost(post.id).text,'Mon post');
  assert.throws(()=>store.deleteOwnPost('post-other'),/propre|introuvable|autorisé/i);
});

test('notifications include follow and contact request/acceptance events',()=>{
  const store=createCommunityStore({viewerId:'self',profiles:[{id:'self',displayName:'Moi',dogIds:[]},{id:'alex',displayName:'Alex',dogIds:[]}],contacts:[],contactRequests:[],follows:[],notifications:[],posts:[]});
  store.follow('alex');
  store.sendContactRequest('alex');
  const incoming=createCommunityStore({viewerId:'alex',profiles:[{id:'alex',displayName:'Alex',dogIds:[]},{id:'self',displayName:'Moi',dogIds:[]}],contacts:[],contactRequests:[{id:'r',fromUserId:'self',toUserId:'alex',status:'pending'}],follows:[],notifications:[],posts:[]});
  incoming.acceptContactRequest('r');
  assert.deepEqual(store.getState().notifications.map(n=>n.type),['follow','contact_request']);
  assert.deepEqual(incoming.getState().notifications.map(n=>n.type),['contact_accepted']);
});

test('report and hide are local moderation actions; profile and post snapshots are detached',()=>{
  const store=createCommunityStore({profiles:[{id:'self',displayName:'Moi',dogIds:[]},{id:'alex',displayName:'Alex',dogIds:[]}],contacts:[],contactRequests:[],follows:[],notifications:[],posts:[{id:'p',authorId:'alex',visibility:'community',text:'Piste'}]});
  const snapshot=store.getVisiblePost('p');snapshot.text='changed';
  assert.equal(store.getVisiblePost('p').text,'Piste');
  assert.equal(store.reportPost('p','incorrect'),true);
  assert.equal(store.hidePost('p'),true);
  assert.equal(store.getFeed().length,0);
});

test('accepted Contacts start with independent Live and quick-invite permissions disabled',()=>{
 const store=createCommunityStore({profiles:[{id:'self',displayName:'Moi',dogIds:[]},{id:'alex',displayName:'Alex',role:'Conducteur',specialty:'Pistage',dogIds:[]}],contacts:[{userIds:['self','alex']}],contactRequests:[],follows:[],notifications:[],posts:[]});
 assert.deepEqual(store.getContactPermissions('alex'),{live_access_authorized:false,quick_coaching_invite_authorized:false});
 assert.equal(store.setContactPermission('alex','live_access_authorized',true),true);
 assert.equal(store.getContactPermissions('alex').live_access_authorized,true);
 assert.equal(store.getContactPermissions('alex').quick_coaching_invite_authorized,false);
 assert.equal(store.setContactPermission('alex','quick_coaching_invite_authorized',true),true);
 assert.equal(store.getContactPermissions('alex').quick_coaching_invite_authorized,true);
 assert.equal(store.removeContact('alex'),true);
 assert.equal(store.getContactPermissions('alex'),null);
});

test('only accepted Contacts may change Live permissions and Contacts search matches name and role',()=>{
 const store=createCommunityStore({profiles:[{id:'self',displayName:'Moi',dogIds:[]},{id:'alex',displayName:'Alex Martin',role:'Conducteur cynophile',specialty:'Pistage',dogIds:[]},{id:'lea',displayName:'Léa Bernard',role:'Observatrice',specialty:'Recherche',dogIds:[]}],contacts:[],contactRequests:[{id:'r',fromUserId:'self',toUserId:'alex',status:'pending'}],follows:[{fromUserId:'self',toUserId:'lea'}],notifications:[],posts:[]});
 assert.equal(store.setContactPermission('alex','live_access_authorized',true),false);
 assert.deepEqual(store.searchContacts('condu').map(row=>row.id),['alex']);
 assert.deepEqual(store.searchContacts('pistage').map(row=>row.id),['alex']);
 assert.deepEqual(store.searchContacts('léa').map(row=>row.id),['lea']);
});
