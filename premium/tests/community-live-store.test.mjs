import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityStore} from '../src/community-store.mjs';
import {createCommunityLiveStore} from '../src/community-live-store.mjs';

const relationships=()=>createCommunityStore({profiles:[{id:'self',displayName:'Moi'},{id:'alex',displayName:'Alex'},{id:'lea',displayName:'Léa'}],contacts:[{userIds:['self','alex'],live_access_authorized:true}],contactRequests:[{id:'pending',fromUserId:'self',toUserId:'lea',status:'pending'}],follows:[{fromUserId:'self',toUserId:'lea'}],posts:[],notifications:[]});

test('Coaching and OPS sessions start unshared with conservative projection options',()=>{
 const live=createCommunityLiveStore({communityStore:relationships()});
 assert.equal(live.getSessionPolicy('coaching','c-1').share_live,false);
 assert.equal(live.getSessionPolicy('ops','o-1').share_live,false);
 assert.deepEqual(live.getSessionPolicy('ops','o-1').projectionOptions,{showDog:false,showHandler:false,showEvents:false,showTrackAge:false,showCorridor:false});
});

test('accepted Contact Live permission and explicit session sharing are both required',()=>{
 const community=relationships(),live=createCommunityLiveStore({communityStore:community});
 live.setSessionPolicy({sessionType:'coaching',sessionId:'c-1',ownerUserId:'self',patch:{share_live:true}});
 assert.equal(live.canViewSession('coaching','c-1','alex'),true);
 assert.equal(live.canViewSession('coaching','c-1','lea'),false);
 community.setContactPermission('alex','live_access_authorized',false);
 assert.equal(live.canViewSession('coaching','c-1','alex'),false);
 community.setContactPermission('alex','live_access_authorized',true);
 community.removeContact('alex');
 assert.equal(live.canViewSession('coaching','c-1','alex'),false);
});

test('Follow, pending requests, notification preference and shared state are independent',()=>{
 const community=relationships(),live=createCommunityLiveStore({communityStore:community});
 live.setSessionPolicy({sessionType:'ops',sessionId:'o-2',ownerUserId:'self',patch:{share_live:true,notify_observers:false}});
 assert.equal(live.canViewSession('ops','o-2','lea'),false);
 assert.deepEqual(live.eligibleContacts('ops','o-2'),['alex']);
 assert.equal(live.canViewSession('ops','unshared','alex'),false);
 assert.equal(live.canViewSession('ops','o-2','self'),true);
});

test('only the owner can change policy and snapshots are detached',()=>{
 const live=createCommunityLiveStore({communityStore:relationships()});
 assert.throws(()=>live.setSessionPolicy({sessionType:'ops',sessionId:'o-3',ownerUserId:'alex',patch:{share_live:true}}),/propriétaire|owner/i);
 const policy=live.getSessionPolicy('ops','o-3');policy.projectionOptions.showDog=true;
 assert.equal(live.getSessionPolicy('ops','o-3').projectionOptions.showDog,false);
});
