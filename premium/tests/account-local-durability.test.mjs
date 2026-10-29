import test from 'node:test';import assert from 'node:assert/strict';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
import {createTrackLibrary} from '../src/track-library.mjs';
import {preparePersistenceCandidate} from '../src/persistence-domain-adapters.mjs';
const disk=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('an OPS draft saved before any GPS fix survives a reload without starting a sensor',()=>{
 const storage=disk(),a=createOperationalMissionStore({ownerId:'a',storage}),m=a.createDraft({dog:{id:'d',name:'Nox'},handler:{id:'a',name:'A'},details:{notes:'Contexte terrain'}});
 const b=createOperationalMissionStore({ownerId:'a',storage}),restored=b.get(m.id);assert.equal(restored.details.notes,'Contexte terrain');assert.equal(restored.status,'Brouillon');assert.equal(restored.gpsTrack,undefined);assert.equal(createOperationalMissionStore({ownerId:'b',storage}).list().length,0);
});
test('account round trip preserves the creation date of a prepared track',()=>{
 const createdAt='2025-01-02T03:04:05.000Z',payload=preparePersistenceCandidate({kind:'track',localId:'t',value:{name:'Piste ancienne',createdAt,geometry:{points:[{x:7,y:48,space:'wgs84'},{x:7.001,y:48.001,space:'wgs84'}]}}}).payload;
 assert.equal(payload.createdAt,createdAt);
 const library=createTrackLibrary({ownerId:'a',storage:disk()}),restored=library.restoreCloud({schemaVersion:1,kind:'track',id:crypto.randomUUID(),revision:1,updatedAt:new Date().toISOString(),deletedAt:null,payload});assert.equal(restored.createdAt,createdAt);
});
test('deleting a pre-GPS draft removes its durable copy and cannot resurrect on reload',()=>{
 const storage=disk(),a=createOperationalMissionStore({ownerId:'a',storage}),m=a.createDraft({dog:{id:'d',name:'Nox'},handler:{id:'a',name:'A'}});assert.equal(a.remove(m.id,{ownerId:'a'}).ok,true);assert.equal(createOperationalMissionStore({ownerId:'a',storage}).get(m.id),null);
});
