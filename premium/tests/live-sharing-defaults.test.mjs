import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {operationalMissionView} from '../src/operational-views.mjs';
import {OperationalScreen} from '../src/operational-screen.mjs';
import {createCommunityStore} from '../src/community-store.mjs';
import {createCommunityLiveStore} from '../src/community-live-store.mjs';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
const dog={id:'dog',name:'Ninja'},handler={id:'owner',name:'Conducteur'};
test('new OPS sharing is enabled and an explicit opt out survives reload in the same account',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const store=createOperationalMissionStore({ownerId:'owner',storage,idFactory:()=> 'new'});
 const mission=store.createDraft({dog,handler});
 assert.equal(mission.liveSharing,true);
 store.setLiveSharing(mission.id,false);
 const restored=createOperationalMissionStore({ownerId:'owner',storage});
 assert.equal(restored.get(mission.id).liveSharing,false);
 assert.equal(createOperationalMissionStore({ownerId:'other',storage}).get(mission.id),null);
 restored.setLiveSharing(mission.id,true);
 assert.equal(createOperationalMissionStore({ownerId:'owner',storage}).get(mission.id).liveSharing,true);
});
test('legacy missions do not acquire automatic sharing on restore',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const store=createOperationalMissionStore({ownerId:'owner',storage,idFactory:()=> 'old'});
 store.createDraft({dog,handler});
 const key='piste-v2-ops-gps:owner',saved=JSON.parse(data.get(key));delete saved.missions[0].liveSharing;data.set(key,JSON.stringify(saved));
 assert.equal(createOperationalMissionStore({ownerId:'owner',storage}).get('old').liveSharing,undefined);
});

test('OPS application policy uses the saved default without widening contact permissions',()=>{
 const operationalStore=createOperationalMissionStore({idFactory:()=> 'new'});
 const community=createCommunityStore({profiles:[{id:'self'},{id:'friend'},{id:'stranger'}],contacts:[{userIds:['self','friend'],live_access_authorized:true}],posts:[],notifications:[]});
 const communityLiveStore=createCommunityLiveStore({communityStore:community});
 const source=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
 const body=source.match(/function opsLivePolicy\(id\)\{([\s\S]*?)\n\}/)[1];
 const policy=new Function('operationalStore','communityLiveStore','id',body).bind(null,operationalStore,communityLiveStore);
 const mission=operationalStore.createDraft({dog,handler});
 assert.equal(policy(mission.id).share_live,true);
 assert.match(OperationalScreen({route:{type:'mission'},view:operationalMissionView(mission),livePolicy:policy(mission.id)}),/data-live-policy="share_live"[^>]*checked/);
 assert.equal(communityLiveStore.canViewSession('ops',mission.id,'friend'),true);
 assert.equal(communityLiveStore.canViewSession('ops',mission.id,'stranger'),false);
 operationalStore.setLiveSharing(mission.id,false);
 assert.equal(policy(mission.id).share_live,false);
 assert.doesNotMatch(OperationalScreen({route:{type:'mission'},view:operationalMissionView(operationalStore.get(mission.id)),livePolicy:policy(mission.id)}),/data-live-policy="share_live"[^>]*checked/);
 assert.equal(communityLiveStore.canViewSession('ops',mission.id,'friend'),false);
 assert.equal(policy('legacy').share_live,false);
});
