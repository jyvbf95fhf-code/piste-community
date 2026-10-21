import test from 'node:test';
import assert from 'node:assert/strict';
import { activeTrackingDogs, resolveDogId, resolveDefaultTrackingDog, isProtectedDog } from '../src/dog-selection.mjs';
import { createDogsStore } from '../src/dogs.mjs';
import { createProfileStore } from '../src/profile-store.mjs';

const dogs = [
  { id:'first', cloudId:'cloud-first', name:'Same', status:'active', disciplines:['tracking'] },
  { id:'second', name:'Same', status:'active', disciplines:['tracking','search'] },
  { id:'training', status:'training', disciplines:['tracking'] },
  { id:'retired', status:'retired', disciplines:['tracking'] },
  { id:'search', status:'active', disciplines:['search'] },
  { id:'legacy', status:'active', specialty:'Pistage' }
];
test('default selection filters eligibility and falls back in registration order', () => {
  assert.deepEqual(activeTrackingDogs(dogs).map(d=>d.id), ['first','second','legacy']);
  assert.equal(resolveDefaultTrackingDog(dogs)?.id,'first');
  assert.equal(resolveDefaultTrackingDog(dogs,'second')?.id,'second');
  for (const stale of ['missing','training','retired','search']) assert.equal(resolveDefaultTrackingDog(dogs,stale)?.id,'first');
  assert.equal(resolveDefaultTrackingDog([dogs[1]])?.id,'second');
  assert.equal(resolveDefaultTrackingDog([dogs[2]]),null);
});
test('identity aliases use explicit local/cloud IDs and never names or ambiguous cloud mappings', () => {
  assert.equal(resolveDogId(dogs,'cloud-first'),'first');
  assert.equal(resolveDefaultTrackingDog(dogs,'cloud-first')?.id,'first');
  assert.equal(resolveDogId(dogs,'Same'),null);
  assert.equal(resolveDogId([...dogs,{...dogs[0],id:'duplicate'}],'cloud-first'),null);
  assert.equal(resolveDogId(dogs,''),null);
});
test('existing profile primary dog field persists preference across owner-scoped reloads', () => {
  const entries=new Map(),storage={getItem:k=>entries.get(k),setItem:(k,v)=>entries.set(k,v)};
  const profile=createProfileStore({}, {ownerId:'owner',storage});
  profile.setPrimaryDog('second');
  assert.equal(resolveDefaultTrackingDog(dogs,createProfileStore({}, {ownerId:'owner',storage}).snapshot().primary_dog_id).id,'second');
});
test('stable protected dog identity blocks aliases independently of its display name', () => {
  const id='10b00000-0000-4000-8000-000000000001';
  assert.equal(isProtectedDog({id,name:'Renamed'}),true);
  assert.equal(isProtectedDog({id:'local',cloudId:id}),true);
  assert.equal(isProtectedDog({id:'ordinary',name:'LOBO'}),false);
});
test('local removal requires confirmation, persists atomically and preserves associated records', () => {
  const entries=new Map(),storage={getItem:k=>entries.get(k),setItem:(k,v)=>entries.set(k,v)};
  const records=dogs.map(d=>({...d,portrait:'silhouette',sessions:[{id:'historical'}]}));
  const store=createDogsStore({dogs:records,ownerId:'owner',storage});
  assert.throws(()=>store.remove('first'),/confirm/i);
  assert.throws(()=>store.remove('first',{confirmed:'yes'}),/confirm/i);
  assert.equal(store.get('first').sessions[0].id,'historical');
  const removed=store.remove('first',{confirmed:true});
  assert.equal(removed.id,'first');
  assert.equal(removed.sessions[0].id,'historical');
  assert.equal(createDogsStore({dogs:[],ownerId:'owner',storage}).get('first'),null);
  assert.equal(store.get('second').sessions[0].id,'historical');
  assert.equal(store.remove('missing',{confirmed:true}),null);
  const blocked=createDogsStore({dogs:[...records,{...records[0],id:'local-lobo',cloudId:'10b00000-0000-4000-8000-000000000001'}]});
  assert.throws(()=>blocked.remove('local-lobo',{confirmed:true}),/protégé/i);
  assert.ok(blocked.get('local-lobo'));
  storage.setItem=()=>{throw Error('full');};
  assert.throws(()=>store.remove('second',{confirmed:true}),/stockage/i);
  assert.ok(store.get('second'));
});

test('refreshing a cloud dog preserves registration order used for default fallback', () => {
  const store=createDogsStore({dogs:dogs.slice(0,2).map(d=>({...d,portrait:'silhouette'}))});
  store.restoreCloud({schemaVersion:1,kind:'dog',id:'10b00000-0000-4000-8000-000000000009',revision:2,updatedAt:'2026-10-21T00:00:00Z',deletedAt:null,payload:{name:'Updated',status:'active',disciplines:['tracking'],portrait:'silhouette'}},'first');
  assert.deepEqual(store.list().map(d=>d.id),['first','second']);
  assert.equal(resolveDefaultTrackingDog(store.list()).id,'first');
});
test('unreadable saved data cannot be overwritten by a confirmed removal', () => {
  let writes=0;
  const storage={getItem:()=>'{corrupt',setItem:()=>writes++};
  const store=createDogsStore({dogs:[{...dogs[0],portrait:'silhouette'}],ownerId:'owner',storage});
  assert.throws(()=>store.remove('first',{confirmed:true}),/illisible/i);
  assert.ok(store.get('first'));
  assert.equal(writes,0);
});
