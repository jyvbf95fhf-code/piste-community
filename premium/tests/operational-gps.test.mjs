import {test} from 'node:test';import assert from 'node:assert/strict';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
import {preparePersistenceCandidate} from '../src/persistence-domain-adapters.mjs';
const start=Date.parse('2026-10-13T18:00:00Z');
const dog={id:'dog',name:'Ninja'},handler={id:'mock-current-user',name:'Conducteur'};
const fix=(timestamp,longitude=7.39,accuracy=5)=>({timestamp,coords:{latitude:48.29,longitude,accuracy}});
function setup(storage=null){let now=start;const store=createOperationalMissionStore({idFactory:()=> 'ops',clock:()=>now,ownerId:'user-a',storage});const mission=store.createDraft({dog,handler,time:{disappearanceAt:new Date(start-3600000).toISOString()}});return {store,id:mission.id,at:v=>now=start+v,clock:()=>now};}
test('GPS activation is separate from starting and carries no invented point',()=>{const f=setup();assert.equal(typeof f.store.enableGps,'function');const m=f.store.enableGps(f.id,'user-a');assert.equal(m.status,'Brouillon');assert.equal(m.gpsTrack.phase,'before');assert.equal(m.gpsTrack.distanceM,0);assert.deepEqual(m.trace,[]);assert.throws(()=>f.store.enableGps(f.id,'user-b'));});
test('real tracking measures distance, preserves metadata and rejects simulated progression',()=>{const f=setup();assert.equal(typeof f.store.enableGps,'function');f.store.enableGps(f.id,'user-a');f.store.startTracking(f.id);f.store.appendGpsPoint(f.id,fix(start));f.at(10000);const m=f.store.appendGpsPoint(f.id,fix(start+10000,7.391));assert.ok(m.gpsTrack.distanceM>70);assert.equal(m.provenance.gpsTrack,'phone_gps');assert.equal(m.time.disappearanceAt,new Date(start-3600000).toISOString());assert.throws(()=>f.store.addProgressPoint(f.id,{x:50,y:50}));});
test('pause freezes active chrono, excludes paused movement and resumes with a gap',()=>{const f=setup();assert.equal(typeof f.store.enableGps,'function');f.store.enableGps(f.id,'user-a');f.store.startTracking(f.id);f.store.appendGpsPoint(f.id,fix(start));f.at(10000);f.store.appendGpsPoint(f.id,fix(start+10000,7.391));f.store.pauseTracking(f.id);const before=f.store.get(f.id).gpsTrack.distanceM;f.at(20000);f.store.appendGpsPoint(f.id,fix(start+20000,7.4));assert.equal(f.store.trackingElapsedMs(f.id),10000);assert.equal(f.store.get(f.id).gpsTrack.distanceM,before);f.store.resumeTracking(f.id);f.at(21000);const after=f.store.appendGpsPoint(f.id,fix(start+21000,7.401));assert.equal(after.gpsTrack.segments.length,2);assert.equal(after.gpsTrack.distanceM,before);});
test('stop freezes GPS and permits completion and archive without losing the trace',()=>{const f=setup();assert.equal(typeof f.store.enableGps,'function');f.store.enableGps(f.id,'user-a');f.store.startTracking(f.id);f.store.appendGpsPoint(f.id,fix(start));f.at(5000);const stopped=f.store.stopTracking(f.id);assert.equal(stopped.gpsTrack.phase,'finished');assert.equal(stopped.status,'À compléter');assert.throws(()=>f.store.appendGpsPoint(f.id,fix(start+5000)));f.store.complete(f.id);assert.equal(f.store.archive(f.id).gpsTrack.segments.flat().length,1);});
test('real field events use a fresh GPS point and do not invent an unavailable position',()=>{const f=setup();assert.equal(typeof f.store.enableGps,'function');f.store.enableGps(f.id,'user-a');f.store.startTracking(f.id);let m=f.store.addGpsEvent(f.id,{type:'Indice',note:'Repère',position:fix(start)});assert.equal(m.events[0].point.space,'wgs84');assert.equal(m.events[0].point.latitude,48.29);m=f.store.addGpsEvent(f.id,{type:'Rupture',position:fix(start-30000)});assert.equal(m.events[1].point,null);assert.throws(()=>f.store.addEvent(f.id,{type:'Indice',point:{x:1,y:2}}));});
test('reload restores owner-scoped real missions with a GPS gap and explicit resume requirement',()=>{const saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};const f=setup(storage);assert.equal(typeof f.store.enableGps,'function');f.store.enableGps(f.id,'user-a');f.store.startTracking(f.id);f.store.appendGpsPoint(f.id,fix(start));const reloaded=createOperationalMissionStore({clock:f.clock,ownerId:'user-a',storage});assert.equal(reloaded.get(f.id).gpsTrack.segments.flat().length,1);assert.equal(reloaded.get(f.id).gpsNeedsResume,true);assert.equal(reloaded.get(f.id).gpsTrack.gap,true);const other=createOperationalMissionStore({ownerId:'user-b',storage});assert.equal(other.get(f.id),null);});

test('reopening a cloud OPS mission preserves the GPS track and permits completion after reload', () => {
  const saved = new Map();
  const storage = {getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value)};
  const original = setup();
  original.store.enableGps(original.id, 'user-a');
  original.store.startTracking(original.id);
  original.at(10000);
  const payload = original.store.appendGpsPoint(original.id, fix(start + 10000));
  const options = {ownerId: 'user-a', storage, clock: () => start + 3600000};
  const store = createOperationalMissionStore(options);
  const cloud = store.restoreCloud({
    kind: 'ops', id: '236d2ca3-2413-4fe4-b470-e4b132a09c08', revision: 1,
    schemaVersion: 1, deletedAt: null, updatedAt: new Date(start).toISOString(), payload
  });
  const reopened = store.reopenSavedMission(cloud.id);
  assert.equal(reopened.status, 'À compléter');
  assert.equal(reopened.trackingStoppedAt, start + 10000);
  assert.equal(reopened.gpsTrack.phase, 'finished');
  assert.deepEqual(reopened.gpsTrack.segments, payload.gpsTrack.segments);
  assert.equal(reopened.liveSharing, false);

  const reloaded = createOperationalMissionStore(options);
  reloaded.updateDetails(cloud.id, {result: 'Résultat renseigné'});
  reloaded.complete(cloud.id);
  const archived = reloaded.archive(cloud.id);
  assert.equal(archived.details.result, 'Résultat renseigné');
  assert.equal(archived.originalId, original.id);
  assert.deepEqual(archived.gpsTrack.segments, payload.gpsTrack.segments);
  const backup = preparePersistenceCandidate({kind: 'ops', localId: cloud.id, value: archived});
  assert.equal(backup.payload.id, original.id);
  assert.equal(backup.payload.details.result, 'Résultat renseigné');
});

test('a stopped OPS cloud copy can be completed and archived directly', () => {
  const values = new Map();
  const storage = {getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value)};
  const original = setup();
  original.store.enableGps(original.id, 'user-a');
  original.store.startTracking(original.id);
  original.store.appendGpsPoint(original.id, fix(start));
  original.at(10000);
  const payload = original.store.stopTracking(original.id);
  const options = {ownerId: 'user-a', storage, clock: () => start + 3600000};
  const store = createOperationalMissionStore(options);
  const cloud = store.restoreCloud({
    kind: 'ops', id: '236d2ca3-2413-4fe4-b470-e4b132a09c08', revision: 1,
    schemaVersion: 1, deletedAt: null, updatedAt: new Date(start).toISOString(), payload
  });
  const archived = store.archiveSavedMission(cloud.id);
  assert.equal(archived.status, 'Archivée');
  assert.equal(archived.completedAt, new Date(options.clock()).toISOString());
  assert.deepEqual(archived.gpsTrack.segments, payload.gpsTrack.segments);
  assert.equal(createOperationalMissionStore(options).get(cloud.id).status, 'Archivée');
});
