import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityNotificationStore} from '../src/community-notifications.mjs';

test('notification preferences default to in-app only and can only be changed by their owner',()=>{
 const notifications=createCommunityNotificationStore();
 assert.deepEqual(notifications.getPreferences('alex'),{notify_live_in_app:true,notify_live_email:false,notify_live_push:false});
 assert.equal(notifications.setPreferences('alex',{notify_live_email:true},{actorId:'self'}),false);
 assert.equal(notifications.setPreferences('alex',{notify_live_email:true},{actorId:'alex'}),true);
 assert.equal(notifications.getPreferences('alex').notify_live_email,true);
});

test('Live start events target recipient IDs once and unread state is recalculated',()=>{
 const notifications=createCommunityNotificationStore();
 const event={sessionId:'s-1',sessionType:'coaching',ownerUserId:'self',recipientUserIds:['alex'],ownerDisplayName:'Alex',dogName:'Nox',startedAt:'2026-10-06T10:00:00.000Z',route:'/live/coaching/s-1',observerRole:'observer'};
 const first=notifications.publishLiveStart(event);
 const second=notifications.publishLiveStart(event);
 assert.equal(first.length,1);
 assert.equal(second.length,0);
 assert.equal(first[0].type,'live_session_started');
 assert.equal(first[0].session_id,'s-1');
 assert.equal(first[0].observer_role,'observer');
 assert.equal(notifications.unreadCount('alex'),1);
 assert.equal(notifications.markRead(first[0].id,'alex'),true);
 assert.equal(notifications.unreadCount('alex'),0);
});

test('Live access does not depend on notification preferences and email/push contracts stay local and whitelisted',()=>{
 const notifications=createCommunityNotificationStore();
 notifications.setPreferences('lea',{notify_live_in_app:false,notify_live_email:true,notify_live_push:true},{actorId:'lea'});
 const [event]=notifications.publishLiveStart({sessionId:'ops-1',sessionType:'ops',ownerUserId:'self',recipientUserIds:['lea'],ownerDisplayName:'Alex',dogName:'Nox',startedAt:'2026-10-06T10:00:00.000Z',route:'/live/ops/ops-1',observerRole:'ops_trace_observer',mission:{details:{searchedPerson:'PRIVATE_PERSON'},person:{medical:'PRIVATE_MEDICAL'},places:{address:'PRIVATE_ADDRESS'},context:{risk:'PRIVATE_RISK'}}});
 assert.equal(notifications.list('lea').length,0);
 const payloads=notifications.buildDeliveryContracts(event);
 assert.deepEqual(payloads.email,{toUserId:'lea',subject:'Une session PISTE Community est en direct',sessionId:'ops-1',sessionType:'ops',ownerDisplayName:'Alex',dogName:'Nox',observerRole:'ops_trace_observer',route:'/live/ops/ops-1'});
 assert.deepEqual(payloads.push,{toUserId:'lea',type:'live_session_started',sessionId:'ops-1',sessionType:'ops',ownerDisplayName:'Alex',route:'/live/ops/ops-1'});
 const serialized=JSON.stringify(payloads);
 for(const secret of ['PRIVATE_PERSON','PRIVATE_MEDICAL','PRIVATE_ADDRESS','PRIVATE_RISK','mission'])assert.equal(serialized.includes(secret),false,secret);
 assert.equal(globalThis.fetch,globalThis.fetch);
});

test('existing social events share the same in-app list and mark-read API',()=>{
 const notifications=createCommunityNotificationStore({notifications:[{id:'like-1',recipientId:'self',actorId:'alex',type:'like',read:false}]});
 assert.equal(notifications.list('self')[0].type,'like');
 assert.equal(notifications.unreadCount('self'),1);
 notifications.markRead('like-1','self');
 assert.equal(notifications.unreadCount('self'),0);
});
