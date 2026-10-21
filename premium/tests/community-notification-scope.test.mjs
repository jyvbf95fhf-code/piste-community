import test from 'node:test';
import assert from 'node:assert/strict';
import {selectCommunityNotifications} from '../src/community-notifications.mjs';
import {createCommunityStore} from '../src/community-store.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const peer='22222222-2222-4222-8222-222222222222';
const stale={id:'request-old',recipientId:owner,actorId:peer,type:'contact_request'};
test('real account excludes the Lea demo fixture without deleting any notification',()=>{
 const base=createCommunityStore(),items=base.getNotificationStore().listAll();
 assert.ok(items.some(n=>n.id==='notification-lea-contact'));
 assert.deepEqual(selectCommunityNotifications({items,viewerId:owner}),[]);
 assert.ok(base.getNotificationStore().listAll().some(n=>n.id==='notification-lea-contact'));
});
test('authoritative requests remove only stale notices for this identity, retaining unrelated social and Live events',()=>{
 const like={id:'like',recipientId:owner,type:'like'},live={id:'live',recipient_user_id:owner,type:'live_session_started'},other={...stale,id:'other',recipientId:peer};
 const items=[stale,like,live,other];
 assert.deepEqual(selectCommunityNotifications({items,viewerId:owner,friendshipState:{contactRequests:[]}}),[like,live]);
 assert.equal(items.length,4);
 assert.deepEqual(selectCommunityNotifications({items,viewerId:peer,friendshipState:{contactRequests:[]}}),[]);
});
test('pending requests remain actionable and a refreshed deletion invalidates the notice',()=>{
 const state={contactRequests:[{id:'r',fromUserId:peer,toUserId:owner,status:'pending'}]};
 assert.deepEqual(selectCommunityNotifications({items:[stale],viewerId:owner,friendshipState:state}),[stale]);
 assert.deepEqual(selectCommunityNotifications({items:[stale],viewerId:owner}),[stale]);
 assert.deepEqual(selectCommunityNotifications({items:[stale],viewerId:owner,friendshipState:{contactRequests:[]}}),[]);
});
test('demo feed reconciles obsolete requests while preserving fixture source',()=>{
 const store=createCommunityStore();store.refuseContactRequest('request-lea-self');
 assert.ok(!store.getNotifications().some(n=>n.id==='notification-lea-contact'));
 assert.ok(store.getNotificationStore().listAll().some(n=>n.id==='notification-lea-contact'));
});
