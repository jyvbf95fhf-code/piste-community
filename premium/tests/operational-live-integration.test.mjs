import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityStore} from '../src/community-store.mjs';
import {createCommunityLiveStore} from '../src/community-live-store.mjs';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
import {operationalMissionView} from '../src/operational-views.mjs';
import {OperationalScreen} from '../src/operational-screen.mjs';

const setup=()=>{
 const communityStore=createCommunityStore({profiles:[{id:'self',displayName:'Sébastien'},{id:'alex',displayName:'Alex'}],contacts:[{userIds:['self','alex'],live_access_authorized:true}],posts:[],contactRequests:[],follows:[],notifications:[]});
 const notifications=communityStore.getNotificationStore();
 return {communityStore,notifications,live:createCommunityLiveStore({communityStore,notifications})};
};

test('OPS Live stays disabled by default and only a shared mission is visible to a permitted Contact',()=>{
 const {live}=setup();
 assert.equal(live.getSessionPolicy('ops','mission-1').share_live,false);
 assert.equal(live.canViewSession('ops','mission-1','alex'),false);
 live.setSessionPolicy({sessionType:'ops',sessionId:'mission-1',ownerUserId:'self',patch:{share_live:true}});
 assert.equal(live.canViewSession('ops','mission-1','alex'),true);
});

test('OPS Live emits one role-specific notification only when sharing and observer notification are enabled',()=>{
 const {live,notifications}=setup();
 live.setSessionPolicy({sessionType:'ops',sessionId:'mission-2',ownerUserId:'self',patch:{share_live:true,notify_observers:false}});
 assert.deepEqual(live.notifySessionStarted('ops','mission-2',{dogName:'Nox'}),[]);
 assert.equal(notifications.list('alex').length,0);
 live.setSessionPolicy({sessionType:'ops',sessionId:'mission-2',ownerUserId:'self',patch:{notify_observers:true,projectionOptions:{showDog:false}}});
 const created=live.notifySessionStarted('ops','mission-2',{dogName:'Nox',startedAt:'2026-10-06T10:00:00.000Z'});
 assert.equal(created.length,1);
 assert.equal(created[0].observer_role,'ops_trace_observer');
 assert.equal(created[0].route,'/live/ops/mission-2');
 assert.equal(created[0].dog_name,undefined);
 assert.deepEqual(live.notifySessionStarted('ops','mission-2',{dogName:'Nox'}),[]);
 assert.equal(notifications.list('alex').length,1);
});

test('Coaching Live notifications use the fixed Observer role and independent access policy',()=>{
 const {live,notifications}=setup();
 live.setSessionPolicy({sessionType:'coaching',sessionId:'coaching-1',ownerUserId:'self',patch:{share_live:true}});
 assert.equal(live.canViewSession('coaching','coaching-1','alex'),true);
 const [event]=live.notifySessionStarted('coaching','coaching-1',{dogName:'Nox'});
 assert.equal(event.observer_role,'observer');
 assert.equal(event.route,'/live/coaching/coaching-1');
 assert.equal(notifications.list('alex').length,1);
});

test('OPS sharing controls are explicit, disabled by default, and options are conservative',()=>{
 const missions=createOperationalMissionStore({idFactory:()=> 'mission-screen'});
 const mission=missions.createDraft({dog:{id:'nox',name:'Nox'},handler:{id:'self',name:'Moi'}});
 const view=operationalMissionView(mission);
 const html=OperationalScreen({route:{type:'mission'},view,livePolicy:{share_live:false,notify_observers:true,projectionOptions:{showDog:false,showHandler:false,showEvents:false,showTrackAge:false,showCorridor:false}}});
 assert.match(html,/Partager le suivi OPS en Live/);
 assert.match(html,/Prévenir mes observateurs autorisés/);
 assert.match(html,/Afficher le nom du chien/);
 assert.match(html,/Afficher le nom du conducteur/);
 assert.match(html,/Afficher les événements partageables/);
 assert.match(html,/Afficher l’âge ou le délai de piste/);
 assert.match(html,/Afficher le couloir olfactif estimé/);
 assert.doesNotMatch(html,/data-live-policy="share_live"[^>]*checked/);
 assert.doesNotMatch(html,/data-live-option="showDog"[^>]*checked/);
});
