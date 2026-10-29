import test from 'node:test';import assert from 'node:assert/strict';
import {createAccountAutoSync} from '../src/account-auto-sync.mjs';
import {createPersistenceJournal} from '../src/persistence-journal.mjs';
import {createProfileStore} from '../src/profile-store.mjs';
import {createMemoryPersistenceServer} from './helpers/persistence-memory-repository.mjs';
const storage=()=>{const states=new Map();return {async update(k,fn){const next=fn(structuredClone(states.get(k)));states.set(k,next);return structuredClone(next);}};};
const points=[{id:'a',x:7,y:48,space:'wgs84'},{id:'b',x:7.001,y:48.001,space:'wgs84'}];
function device(server,{disk=storage(),ownerId='a',source={profile:createProfileStore().snapshot(),dogs:[],tracks:[],missions:[],associations:[]}}={}){
 let active=ownerId,online=false,now=100000,restores=0,writes=0,lists=0;
 const repo=server.client(ownerId),journal=createPersistenceJournal({ownerId,storage:disk,locks:{request:async(n,...args)=>args.at(-1)()}});
 const groups={dog:'dogs',track:'tracks',ops:'missions','session-dog-link':'associations'};
 const local=(kind,id)=>kind==='profile'?source.profile:source[groups[kind]].find(v=>(kind==='session-dog-link'?v.sessionId:v.id)===id);
 const engine=createAccountAutoSync({ownerId,getOwnerId:()=>active,journal,repository:{...repo,put:async c=>{writes++;return repo.put(c);},list:async a=>{lists++;return repo.list(a);}},getSources:()=>source,online:()=>online,clock:()=>now,hasLocal:(kind,id)=>!!local(kind,id),restoreRecord:async(r,known,resolveDog)=>{restores++;const p=structuredClone(r.payload);if(p.dogId)p.dogId=await resolveDog(p.dogId);if(r.kind==='profile'){source.profile=p;return 'self';}const id=known||r.id;source[groups[r.kind]]=source[groups[r.kind]].filter(v=>(r.kind==='session-dog-link'?v.sessionId:v.id)!==id);source[groups[r.kind]].push({...p,id,...(r.kind==='track'?{ownerId:'self'}:{})});return id;}});
 return {engine,journal,source,disk,ownerId,online:v=>online=v,tick:()=>now+=61000,changeOwner:v=>active=v,stats:()=>({restores,writes,lists})};
}
test('offline save survives engine reload, uploads automatically, and another device retrieves it without extra writes',async()=>{
 const server=createMemoryPersistenceServer(),a=device(server);
 a.source.dogs.push({id:'dog-local',name:'Nox',breed:'Malinois',status:'active',disciplines:['tracking']});a.source.tracks.push({id:'track-local-1',ownerId:'self',name:'Piste',dogId:'dog-local',geometry:{points}});
 await a.engine.cycle();const queued=await a.journal.pending();assert.equal(queued.length,2);assert.equal(a.stats().writes,0);assert.equal(a.engine.view().state,'offline');
 const reload=device(server,{disk:a.disk,source:a.source});reload.online(true);await reload.engine.cycle();assert.equal((await reload.journal.pending()).length,0);
 const b=device(server);b.online(true);await b.engine.cycle();assert.equal(b.source.tracks.length,1);assert.equal(b.source.dogs.length,1);assert.equal(b.source.tracks[0].dogId,b.source.dogs[0].id);assert.equal(b.stats().writes,0);
 const writes=reload.stats().writes,lists=b.stats().lists;await reload.engine.cycle();await b.engine.cycle();assert.equal(reload.stats().writes,writes);assert.equal(b.stats().lists,lists);
});
test('concurrent edits remain separate until an explicit choice; latest local choice uploads at latest revision',async()=>{
 const server=createMemoryPersistenceServer(),a=device(server);a.source.tracks.push({id:'t',ownerId:'self',name:'Original',geometry:{points}});a.online(true);await a.engine.cycle();
 const b=device(server);b.online(true);await b.engine.cycle();a.source.tracks[0].name='A';b.source.tracks[0].name='B';a.online(false);b.online(false);await a.engine.cycle();await b.engine.cycle();a.online(true);await a.engine.cycle();b.online(true);await b.engine.cycle();
 assert.equal(b.engine.view().state,'conflict');assert.equal(b.source.tracks[0].name,'B');const c=(await b.journal.conflicts())[0];await b.engine.resolve({kind:c.kind,id:c.id,choice:'local'});assert.equal((await b.journal.conflicts()).length,0);a.tick();await a.engine.cycle();assert.equal(a.source.tracks[0].name,'B');
});
test('switching identity prevents background sends and demonstrations never upload',async()=>{
 const a=device(createMemoryPersistenceServer());a.source.dogs.push({id:'fixture',name:'Démo',breed:'M',status:'active',isDemonstration:true});await a.engine.cycle();assert.equal((await a.journal.pending()).length,0);a.changeOwner('b');a.online(true);await a.engine.cycle();assert.equal(a.stats().writes,0);
});

test('a fresh default profile cannot overwrite an existing account preference',async()=>{
 const server=createMemoryPersistenceServer(),a=device(server);a.source.profile.avatar='terrain';a.online(true);await a.engine.cycle();const b=device(server);b.online(true);await b.engine.cycle();assert.equal(b.source.profile.avatar,'terrain');assert.equal(b.stats().writes,0);
});
test('choosing the online conflict version restores it and retains a recovery copy of local commands',async()=>{
 const server=createMemoryPersistenceServer(),a=device(server);a.source.tracks.push({id:'t',ownerId:'self',name:'Original',geometry:{points}});a.online(true);await a.engine.cycle();const b=device(server);b.online(true);await b.engine.cycle();a.source.tracks[0].name='Online';b.source.tracks[0].name='Offline';a.online(false);b.online(false);await a.engine.cycle();await b.engine.cycle();a.online(true);await a.engine.cycle();b.online(true);await b.engine.cycle();const c=(await b.journal.conflicts())[0];await b.engine.resolve({kind:c.kind,id:c.id,choice:'remote'});assert.equal(b.source.tracks[0].name,'Online');assert.equal((await b.journal.snapshot()).recovery.length,1);
});
test('local-only removal hides an item on that device without removing it from another device',async()=>{
 const server=createMemoryPersistenceServer(),a=device(server);a.source.tracks.push({id:'t',ownerId:'self',name:'Piste',geometry:{points}});a.online(true);await a.engine.cycle();a.source.tracks=[];a.tick();await a.engine.cycle();assert.equal(a.source.tracks.length,0);const b=device(server);b.online(true);await b.engine.cycle();assert.equal(b.source.tracks.length,1);
});
test('invalid oversized data stays local and cannot produce a saved status on later scans',async()=>{
 const a=device(createMemoryPersistenceServer());a.source.dogs.push({id:'big',name:'Nox',breed:'Malinois',status:'active',notes:'x'.repeat(210000)});a.online(true);await a.engine.cycle();assert.equal(a.engine.view().state,'error');await a.engine.cycle();assert.equal(a.engine.view().state,'error');assert.equal(a.source.dogs[0].notes.length,210000);
});

test('a failed active OPS snapshot cannot disappear behind the upload throttle',async()=>{
 const {createOperationalMissionStore}=await import('../src/operational-missions.mjs');const server=createMemoryPersistenceServer(),a=device(server);a.source.dogs.push({id:'d',name:'Nox',breed:'Malinois',status:'active'});const store=createOperationalMissionStore({ownerId:'a'}),id=store.createDraft({dog:{id:'d',name:'Nox'},handler:{id:'a',name:'A'}}).id;store.startTracking(id);a.source.missions=[store.get(id)];a.online(true);await a.engine.cycle();a.source.missions[0].details.notes='x'.repeat(210000);a.tick();await a.engine.cycle();assert.equal(a.engine.view().state,'error');await a.engine.cycle();assert.equal(a.engine.view().state,'error');
});

test('a saved local edit arriving during a pull becomes a conflict instead of being overwritten',async()=>{
 const server=createMemoryPersistenceServer(),a=device(server);a.source.dogs.push({id:'d',name:'Original',breed:'Malinois',status:'active'});a.online(true);await a.engine.cycle();
 const repo=server.client('a'),r=(await repo.list({kind:'dog'})).records[0];await repo.put({kind:'dog',id:r.id,commandId:crypto.randomUUID(),expectedRevision:r.revision,payload:{...r.payload,name:'Remote'}});
 // Inject one local save while the remote list is awaited.
 const client=server.client.bind(server);let changed=false;server.client=owner=>{const c=client(owner);return {...c,list:async q=>{const v=await c.list(q);if(q.kind==='dog'&&!changed){changed=true;a.source.dogs[0].name='Saved during fetch';}return v;}};};
 const reload=device(server,{disk:a.disk,source:a.source});reload.online(true);await reload.engine.cycle({forcePull:true});assert.equal(a.source.dogs[0].name,'Saved during fetch');assert.equal(reload.engine.view().state,'conflict');
});
test('automatic hydration cannot restore protected LOBO demonstrations',async()=>{
 const {PROTECTED_DOG_ID}=await import('../src/dogs.mjs');const {LOBO_DEMO_MANIFEST}=await import('../src/lobo-demo-identity.mjs');const server=createMemoryPersistenceServer(),repo=server.client('a');
 for(const [kind,id,payload] of [['dog',PROTECTED_DOG_ID,{name:'LOBO',status:'active'}],['ops',LOBO_DEMO_MANIFEST.opsIds[0],{kind:'operational',status:'Archivée',trackingState:'stopped'}]])await repo.put({kind,id,payload,commandId:crypto.randomUUID(),expectedRevision:0});
 const a=device(server);a.online(true);await a.engine.cycle();assert.equal(a.source.dogs.length,0);assert.equal(a.source.missions.length,0);assert.equal(a.engine.view().state,'online');
});
