import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityStore} from '../src/community-store.mjs';
import {createCommunityLiveStore} from '../src/community-live-store.mjs';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
import {operationalMissionView} from '../src/operational-views.mjs';
import {OperationalScreen} from '../src/operational-screen.mjs';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

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
 assert.match(html,/Partager le suivi Live OPS/);
 assert.match(html,/Prévenir mes observateurs autorisés/);
 assert.match(html,/Afficher le nom du chien/);
 assert.match(html,/Afficher le nom du conducteur/);
 assert.match(html,/Afficher les événements partageables/);
 assert.match(html,/Afficher l’âge ou le délai de piste/);
 assert.match(html,/Afficher le couloir olfactif estimé/);
 assert.doesNotMatch(html,/data-live-policy="share_live"[^>]*checked/);
 assert.doesNotMatch(html,/data-live-option="showDog"[^>]*checked/);
});

test('OPS presets select all five options and notifications, while sharing remains off and explicit choices persist',()=>{
 const {live}=setup(),policy=live.getSessionPolicy('ops','new');
 assert.equal(policy.share_live,false);assert.equal(policy.notify_observers,true);
 assert.deepEqual(Object.values(policy.projectionOptions),[true,true,true,true,true]);
 assert.deepEqual(Object.values(live.getSessionPolicy('coaching','new').projectionOptions),[false,false,false,false,false]);
 live.setSessionPolicy({sessionType:'ops',sessionId:'new',patch:{projectionOptions:{showDog:false},notify_observers:false}});
 live.setSessionPolicy({sessionType:'ops',sessionId:'new',patch:{share_live:true}});
 assert.equal(live.getSessionPolicy('ops','new').projectionOptions.showDog,false);
 assert.equal(live.getSessionPolicy('ops','new').notify_observers,false);
});
test('green start follows the map, and only the sharing checkbox precedes the closed options menu',()=>{
 const missions=createOperationalMissionStore({idFactory:()=> 'layout'});
 const mission=missions.createDraft({dog:{id:'nox',name:'Nox'},handler:{id:'self',name:'Moi'}});
 const {live}=setup();const html=OperationalScreen({route:{type:'mission'},view:operationalMissionView(mission),ui:{allowGps:true},livePolicy:live.getSessionPolicy('ops',mission.id)});
 assert.ok(html.indexOf('data-operational-action="gps-enable"')>html.indexOf('data-real-map-reader'));
 assert.ok(html.indexOf('data-operational-action="gps-enable"')<html.indexOf('data-live-policy-session'));
 assert.equal((html.match(/>Commencer le pistage</g)||[]).length,1);
 assert.match(html,/<details[^>]*data-operational-live-options>/);
 assert.doesNotMatch(html,/<details[^>]*data-operational-live-options[^>]*open/);
 assert.ok(html.indexOf('data-live-policy="share_live"')<html.indexOf('data-operational-live-options'));
 assert.ok(html.indexOf('data-live-policy="notify_observers"')>html.indexOf('data-operational-live-options'));
 for(const name of ['showDog','showHandler','showEvents','showTrackAge','showCorridor'])assert.match(html,new RegExp('data-live-option="'+name+'"[^>]*checked'));
});
test('changing OPS options updates policy without rerendering and closing the user menu',()=>{
 const {live}=setup();let renders=0;
 const source=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
 const start=source.indexOf(" if(field.matches('[data-live-policy]'))"),end=source.indexOf('\n',source.indexOf(" if(field.matches('[data-live-option]'))",start));
 const context=createContext({communityLiveStore:live,render:()=>renders++,Toast:message=>{throw Error(message);}});
 runInContext('function change(field){'+source.slice(start,end)+'}',context);
 context.change({matches:selector=>selector==='[data-live-option]',dataset:{sessionId:'new',liveOption:'showCorridor'},checked:false});
 context.change({matches:selector=>selector==='[data-live-policy]',dataset:{sessionId:'new',sessionType:'ops',livePolicy:'notify_observers'},checked:false});
 assert.equal(renders,0);assert.equal(live.getSessionPolicy('ops','new').projectionOptions.showCorridor,false);assert.equal(live.getSessionPolicy('ops','new').notify_observers,false);
});
