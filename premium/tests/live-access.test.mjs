import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityStore} from '../src/community-store.mjs';
import {createCommunityLiveStore} from '../src/community-live-store.mjs';
import {resolveCommunityLiveProjection} from '../src/community-live-routes.mjs';

test('Live route rechecks contact, authorization, and session sharing on every open',()=>{
 const community=createCommunityStore({profiles:[{id:'self',displayName:'Moi'},{id:'alex',displayName:'Alex'}],contacts:[{userIds:['self','alex'],live_access_authorized:true}],posts:[],contactRequests:[],follows:[],notifications:[]});
 const live=createCommunityLiveStore({communityStore:community});
 live.setSessionPolicy({sessionType:'ops',sessionId:'mission-safe',patch:{share_live:true,projectionOptions:{showDog:true}}});
 const mission={id:'mission-safe',kind:'operational',status:'En cours',trackingState:'active',dog:{name:'Nox'},person:{identity:'SECRET PERSON'},places:{interventionAddress:'SECRET ADDRESS'},context:{risks:'SECRET RISK'},details:{notes:'SECRET NOTE'},trace:[],events:[],time:{}};
 const open=()=>resolveCommunityLiveProjection({type:'ops',id:'mission-safe',viewerId:'alex',liveStore:live,mission});
 assert.equal(open().role,'ops_trace_observer');assert.doesNotMatch(JSON.stringify(open()),/SECRET PERSON|SECRET ADDRESS|SECRET RISK|SECRET NOTE/);
 community.setContactPermission('alex','live_access_authorized',false);assert.equal(open(),null);
 community.setContactPermission('alex','live_access_authorized',true);community.removeContact?.('alex');assert.equal(open(),null);
});
