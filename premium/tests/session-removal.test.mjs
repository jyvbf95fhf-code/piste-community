import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionRemovalPolicy,SessionRemovalMenu,SessionRemovalConfirmation} from '../src/session-removal.mjs';
import {createSessionCatalog} from '../src/session-catalog.mjs';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
import {SessionListScreen,SessionDetailScreen} from '../src/sessions-screen.mjs';
import {LOBO_DEMO_MANIFEST} from '../src/lobo-demo-data.mjs';
const record=id=>({session:{id,prototype:true},searchState:{phase:'DEBRIEF'},preparationState:{},tracerState:{}});
const owner={ownerId:'isolated-owner',localOwnerId:'isolated-owner'};

test('local Coaching requires a known matching account scope and refuses an explicit foreign owner',()=>{
 assert.equal(sessionRemovalPolicy(record('isolated-1'),{ownerId:owner.ownerId}).canRemoveLocal,false);
 assert.equal(sessionRemovalPolicy(record('isolated-1'),owner).canRemoveLocal,true);
 assert.equal(sessionRemovalPolicy({...record('isolated-1'),ownerId:'someone-else'},owner).canRemoveLocal,false);
 assert.equal(sessionRemovalPolicy(record('isolated-1'),{...owner,ownerId:'other'}).canRemoveLocal,false);
});

test('cloud Coaching deletion remains unavailable to owners and participants, with a precise backend reason',()=>{
 const policy=sessionRemovalPolicy({id:'isolated-shared',kind:'coaching',ownerId:owner.ownerId,phase:'ARCHIVED',source:'shared'},owner);
 assert.equal(policy.canRemoveCloud,false);assert.equal(policy.canRemoveLocal,false);
 assert.match(policy.cloudReason,/prise en charge du serveur/);
 assert.doesNotMatch(SessionRemovalMenu(policy),/data-session-remove=/);
 assert.equal(SessionRemovalConfirmation(policy,{scope:'cloud'}),null);
 assert.equal(sessionRemovalPolicy({id:'other-shared',kind:'coaching',ownerId:'other',phase:'ARCHIVED'},owner).canRemoveCloud,false);
});

test('all exact LOBO manifest IDs are protected including local cloud aliases',()=>{
 for(const id of [...LOBO_DEMO_MANIFEST.opsIds,...LOBO_DEMO_MANIFEST.coachingIds]){
  const p=sessionRemovalPolicy({id:'cloud-'+id,cloudId:id,kind:'operational',ownerUserId:owner.ownerId,cloudReadOnly:true,cloudRevision:1,status:'Archivée'},owner);
  assert.equal(p.canRemoveLocal,false);assert.equal(p.canRemoveCloud,false);assert.match(p.localReason,/LOBO/);
 }
});

test('OPS cloud removal requires a known revision; active sessions remain protected',()=>{
 const base={id:'isolated-ops',kind:'operational',ownerUserId:owner.ownerId,cloudReadOnly:true,cloudId:'isolated-cloud',cloudRevision:2,status:'Terminée'};
 assert.equal(sessionRemovalPolicy(base,owner).canRemoveCloud,true);
 assert.equal(sessionRemovalPolicy({...base,cloudRevision:undefined},owner).canRemoveCloud,false);
 assert.equal(sessionRemovalPolicy({...base,status:'En cours'},owner).canRemoveLocal,false);
 assert.equal(sessionRemovalPolicy({...base,ownerUserId:null},owner).canRemoveLocal,false);
});

test('catalog removal deletes the exact snapshot and keeps other sessions isolated',()=>{
 const catalog=createSessionCatalog();catalog.capture(record('isolated-one'));catalog.capture(record('isolated-two'));
 assert.equal(catalog.remove('isolated-one',{ownerId:owner.ownerId}).ok,false);
 assert.equal(catalog.remove('isolated-one',owner).ok,true);
 assert.deepEqual(catalog.list().map(r=>r.session.id),['isolated-two']);
 assert.equal(catalog.remove('isolated-two',{...owner,currentSessionId:'isolated-two'}).ok,true);
});

test('OPS deletion removes an isolated last GPS record durably without touching unrelated keys',()=>{
 const data=new Map([['unrelated','keep']]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const store=createOperationalMissionStore({ownerId:owner.ownerId,storage,idFactory:()=> 'isolated-gps'});
 store.createDraft({dog:{id:'isolated-dog',name:'Test'},handler:{id:owner.ownerId,name:'Test'}});
 store.enableGps('isolated-gps',owner.ownerId);
 assert.equal(store.remove('isolated-gps',{ownerId:'other'}).ok,false);
 assert.equal(store.remove('isolated-gps',owner).ok,true);
 assert.deepEqual(store.list(),[]);
 assert.deepEqual(createOperationalMissionStore({ownerId:owner.ownerId,storage}).list(),[]);
 assert.equal(data.get('unrelated'),'keep');
});

test('removal menus are outside card links and expose separate local/cloud confirmation scopes',()=>{
 const policy=sessionRemovalPolicy(record('isolated-card'),owner);
 const html=SessionListScreen([{id:policy.id,title:'Test',kind:'coaching',status:'Terminée',href:'/sessions/test',removal:policy}]);
 assert.match(html,/<\/a><details class="session-removal-menu">/);
 assert.match(html,/data-session-remove="local"/);
 assert.doesNotMatch(html,/data-session-remove="cloud"/);
 assert.match(SessionDetailScreen({id:policy.id,title:'Test',participants:[],removal:policy}),/session-removal-menu/);
 assert.match(SessionRemovalConfirmation(policy).description,/sauvegarde cloud éventuelle/);
});
