import test from 'node:test';import assert from 'node:assert/strict';
import {preparePersistenceCandidate} from '../src/persistence-domain-adapters.mjs';
import {createRecommendationMemory} from '../src/jumolf-training-memory.mjs';
import {createTrackLibrary} from '../src/track-library.mjs';
const ownerId='11111111-1111-4111-8111-111111111111',dogId='22222222-2222-4222-8222-222222222222';
const memory=createRecommendationMemory({dogId,recommendationId:'r',objective:'Observer les reprises',protocol:{criteria:['Noter les aides'],preparation:['Adapter au chien'],steps:['Observer']}},{ownerId,dogId});
const track={name:'Préparation',dogId,notes:'x'.repeat(1000),geometry:{points:[{id:'a',x:7,y:48,space:'wgs84'},{id:'b',x:7.001,y:48.001,space:'wgs84'}]},trainingMemory:memory};
test('cloud backup and fresh-library restore retain structured preparation and full notes',()=>{
 const c=preparePersistenceCandidate({kind:'track',localId:'t',value:track},{ownerId});assert.deepEqual(c.payload.trainingMemory,memory);
 const storage=new Map(),library=createTrackLibrary({ownerId,storage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}});
 const t=library.restoreCloud({schemaVersion:1,kind:'track',id:'33333333-3333-4333-8333-333333333333',revision:1,updatedAt:new Date().toISOString(),deletedAt:null,payload:c.payload});
 assert.deepEqual(t.trainingMemory,memory);assert.equal(t.notes,track.notes);
});
test('session links preserve preparation but refuse another owner or dog',()=>{
 const value={sessionId:'session',dogId,trainingMemory:memory};
 assert.deepEqual(preparePersistenceCandidate({kind:'session-dog-link',localId:'session',value},{ownerId}).payload.trainingMemory,memory);
 assert.throws(()=>preparePersistenceCandidate({kind:'track',localId:'t',value:track},{ownerId:'other'}));
 assert.throws(()=>preparePersistenceCandidate({kind:'session-dog-link',localId:'session',value:{...value,dogId:'other'}},{ownerId}));
});

test('upload maps the dog reference inside the pedagogical memory to its cloud identity',async()=>{
 const {createPersistenceJournal}=await import('../src/persistence-journal.mjs');let state;
 const journal=createPersistenceJournal({ownerId,storage:{async update(key,fn){state=fn(structuredClone(state));return structuredClone(state);}}});
 const dog=await journal.stage({kind:'dog',localId:dogId,payload:{name:'Nox'}});
 const command=await journal.stage(preparePersistenceCandidate({kind:'track',localId:'t',value:track},{ownerId}));
 assert.equal(command.payload.dogId,dog.id);assert.equal(command.payload.trainingMemory.dogId,dog.id);assert.equal(command.payload.trainingMemory.ownerId,ownerId);
});

test('authenticated HTTP backup preserves memory and rejects a forged memory owner',async()=>{
 const {createPersonalDataHandler}=await import('../src/server/personal-data-http.mjs');let stored;
 const handler=createPersonalDataHandler({authenticate:async()=>({id:ownerId}),enabled:async()=>true,repositoryFor:()=>({put:async c=>(stored=c,{schemaVersion:1,kind:'track',id:c.id,revision:1,updatedAt:new Date().toISOString(),deletedAt:null,payload:c.payload})})});
 const request=value=>new Request('https://v2.invalid',{method:'POST',headers:{authorization:'Bearer synthetic','content-type':'application/json'},body:JSON.stringify({operation:'put',kind:'track',id:dogId,commandId:crypto.randomUUID(),expectedRevision:0,payload:value})});
 assert.equal((await handler(request(track))).status,200);assert.deepEqual(stored.payload.trainingMemory,memory);
 assert.equal((await handler(request({...track,trainingMemory:{...memory,ownerId:'other'}}))).status,400);
});

test('a legacy server dropping pedagogical memory cannot acknowledge a complete backup',async()=>{
 const {createPersistenceSync}=await import('../src/persistence-sync.mjs');let acknowledged=false;
 const command={operation:'put',id:dogId,kind:'track',commandId:'c',expectedRevision:0,payload:track};
 const sync=createPersistenceSync({ownerId,journal:{pending:async()=>acknowledged?[]:[command],acknowledge:async()=>{acknowledged=true;}},repository:{put:async()=>({schemaVersion:1,kind:'track',id:dogId,revision:1,updatedAt:new Date().toISOString(),deletedAt:null,payload:{...track,trainingMemory:undefined}})}});
 await assert.rejects(sync.flush(),/pédagogique/);assert.equal(acknowledged,false);
});

test('restoration validates the original dog binding before mapping cloud IDs to local IDs',async()=>{
 const {remapTrainingMemory}=await import('../src/jumolf-training-memory.mjs');
 assert.equal(typeof remapTrainingMemory,'function');
 assert.throws(()=>remapTrainingMemory({...memory,dogId:'foreign'},{ownerId,fromDogId:dogId,toDogId:'local-dog'}));
 const restored=remapTrainingMemory(memory,{ownerId,fromDogId:dogId,toDogId:'local-dog'});
 assert.equal(restored.dogId,'local-dog');assert.equal(restored.ownerId,ownerId);assert.equal(restored.objective,memory.objective);
});
