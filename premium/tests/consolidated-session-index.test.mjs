import {test} from 'node:test';import assert from 'node:assert/strict';
import {createDogsStore} from '../src/dogs.mjs';
const api=await import('../src/consolidated-session-index.mjs').catch(()=>({}));
const disk=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),values};};
const p=(extra={})=>({id:'s',version:1,phase:'SEARCH_RUNNING',role:'driver',mode:'normal',dog:'Nox',pose:null,search:null,searchActiveMs:0,team:[],...extra});
test('shared index is account scoped, replaces stale lists and rejects late account responses',async()=>{
 assert.equal(typeof api.createSharedSessionIndex,'function');let resolve;const index=api.createSharedSessionIndex({ownerId:'a'});index.accept(p());assert.equal(index.list().length,1);
 const pending=index.refresh(()=>new Promise(r=>resolve=r));index.dispose();resolve([p({id:'late'})]);await pending;assert.deepEqual(index.list(),[]);
});
test('a late list cannot erase a just-created or newer projection',async()=>{const index=api.createSharedSessionIndex({ownerId:'a'});let resolve;const pending=index.refresh(()=>new Promise(r=>resolve=r));index.accept(p({version:3}));index.accept(p({id:'new'}));resolve([p({version:2})]);await pending;assert.equal(index.get('s').version,3);assert.ok(index.get('new'));});
test('explicit dog association survives reload by owner; equal names never infer identity',()=>{const storage=disk(),index=api.createSharedSessionIndex({ownerId:'a',storage});index.accept(p());assert.equal(index.dogId('s'),null);index.linkDog('s',{id:'dog-a',name:'Nox'});assert.equal(index.dogId('s'),'dog-a');const reload=api.createSharedSessionIndex({ownerId:'a',storage});reload.accept(p());assert.equal(reload.dogId('s'),'dog-a');assert.equal(api.createSharedSessionIndex({ownerId:'b',storage}).dogId('s'),null);});
test('associations are not permission data or geometry caches and unauthorized reads clear projections',async()=>{const storage=disk(),index=api.createSharedSessionIndex({ownerId:'a',storage});index.accept(p({pose:{segments:[[ {latitude:48,longitude:7} ]]}}));index.linkDog('s',{id:'nox',name:'Nox'});assert.doesNotMatch([...storage.values.values()].join(''),/latitude|role|segments/);await index.refresh(async()=>{throw Object.assign(Error('forbidden'),{status:403});});assert.equal(index.list().length,0);});
test('malformed dog registry is preserved rather than silently overwritten',()=>{const storage=disk();storage.setItem('piste-v2-session-dogs:a','broken');const index=api.createSharedSessionIndex({ownerId:'a',storage});index.accept(p());assert.throws(()=>index.linkDog('s',{id:'nox',name:'Nox'}));assert.equal(storage.getItem('piste-v2-session-dogs:a'),'broken');});
test('dog identities and edits persist additively per account without replacing the legacy store',()=>{const storage=disk();let n=0;const a=createDogsStore({dogs:[],ownerId:'a',storage,idFactory:()=>`uuid-${++n}`});const d=a.create({name:'Nox'});assert.equal(d.id,'dog-uuid-1');a.update(d.id,{notes:'Identité stable'});const reload=createDogsStore({dogs:[],ownerId:'a',storage});assert.equal(reload.get(d.id).notes,'Identité stable');assert.equal(createDogsStore({dogs:[],ownerId:'b',storage}).get(d.id),null);assert.equal(createDogsStore({dogs:[]}).create({name:'Nox'}).id,'dog-1');});
test('failed dog save cannot silently discard the existing list',()=>{const a=createDogsStore({dogs:[],ownerId:'a',storage:{getItem:()=>null,setItem(){throw Error('quota');}}});assert.throws(()=>a.create({name:'Nox'}));assert.equal(a.list().length,0);});
const views=await import('../src/session-views.mjs');
test('shared rows join the existing filters without synthetic sessions or name matching',()=>{
 const empty={list:()=>[]},sharedSessions=[p({phase:'ARCHIVED',search:{distanceM:1200},searchActiveMs:60000})];
 const rows=views.sessionListView(empty,{demoRows:false,sharedSessions,dogIds:{s:'dog-a'},dogId:'dog-a',filter:'Archivées'});
 assert.equal(rows.length,1);assert.equal(rows[0].dogId,'dog-a');assert.match(rows[0].href,/session=s/);assert.match(rows[0].distance,/1,20 km/);
 assert.equal(views.sessionListView(empty,{demoRows:false,sharedSessions,dogId:'dog-a'}).length,0);
 assert.equal(views.homeActiveSessionView(empty,[],{sharedSessions,includeDemoRows:false}).length,0);
 assert.equal(views.homeActiveSessionView(empty,[],{sharedSessions:[p()],includeDemoRows:false}).length,1);
});
test('shared track consultation retains segmented WGS84 geometry without mutating a session',()=>{
 const shared=p({phase:'ARCHIVED',search:{provenance:'device-geolocation',segments:[[{latitude:48,longitude:7},{latitude:48.001,longitude:7}],[{latitude:49,longitude:8},{latitude:49.001,longitude:8}]]}}),before=JSON.stringify(shared);
 const tracks=views.trackListView([],[],[shared]);assert.equal(tracks.length,1);assert.equal(tracks[0].points[2].breakBefore,true);assert.equal(tracks[0].points[0].space,'wgs84');assert.match(tracks[0].copySource.sessionId,/s/);assert.equal(JSON.stringify(shared),before);
});
const {SessionListScreen}=await import('../src/sessions-screen.mjs');
const {DogProfileScreen}=await import('../src/dogs-screen.mjs');
const {TrackDetailScreen}=await import('../src/tracks-screen.mjs');
test('consolidated screens preserve canonical source links and avoid a mock session heading',()=>{
 assert.doesNotMatch(SessionListScreen([],{consolidated:true}),/MOCK EN MÉMOIRE/);
 assert.match(DogProfileScreen({id:'d',name:'Nox',sessions:[{href:'/coaching/session?session=s',title:'Partagée'}]}),/href="\/coaching\/session\?session=s"/);
 assert.match(TrackDetailScreen({id:'t',sessionId:'s',sessionHref:'/coaching/session?session=s&tab=map',name:'Trace'}),/href="\/coaching\/session\?session=s&amp;tab=map"/);
});

test('revoked session is removed without deleting its local dog association',()=>{const index=api.createSharedSessionIndex({ownerId:'a'});index.accept(p());index.linkDog('s',{id:'d'});index.forget('s');assert.equal(index.get('s'),null);assert.equal(index.dogId('s'),'d');});
test('an earlier list response cannot restore a session revoked meanwhile',async()=>{const index=api.createSharedSessionIndex({ownerId:'a'});index.accept(p());let resolve;const pending=index.refresh(()=>new Promise(r=>resolve=r));index.forget('s');resolve([p()]);await pending;assert.equal(index.get('s'),null);});
test('explicit restored dog association overrides a source-device dogRef',()=>{const index=api.createSharedSessionIndex({ownerId:'a'});index.accept(p({dogRef:{ownerId:'a',id:'old-device-dog'}}));assert.equal(index.dogId('s'),'old-device-dog');index.linkDog('s',{id:'restored-cloud-dog'});assert.equal(index.dogId('s'),'restored-cloud-dog');});
