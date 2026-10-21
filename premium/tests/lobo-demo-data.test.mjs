import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLoboDemoDataset,LOBO_DEMO_MANIFEST as manifest,LOBO_DEMO_OWNER_ID as ownerId,LOBO_DEMO_LABEL as label,isLoboDemoRecord,isLoboDemoSource,decorateLoboDemoRecord,deserializeLoboDemoRows,projectLoboDemoSession} from '../src/lobo-demo-data.mjs';
import {preparePersistenceCandidate} from '../src/persistence-domain-adapters.mjs';
import {projectRemoteSession} from '../src/server/coaching-service.mjs';
import {buildRealJumolfProfile} from '../src/jumolf-real-science.mjs';
const d=buildLoboDemoDataset();
test('Lobo manifest is deterministic: one fictional dog, twenty OPS and twenty Coaching, stable UUID identities',()=>{
 assert.deepEqual(buildLoboDemoDataset(),d);
 assert.equal(d.sources.length,40);assert.equal(d.personalRecords.filter(r=>r.kind==='dog').length,1);assert.equal(d.personalRecords.filter(r=>r.kind==='ops').length,20);assert.equal(d.coachingSessions.length,20);
 assert.equal(d.dog.name,'Lobo');assert.equal(d.dog.id,manifest.dogId);assert.equal(new Set(d.sources.map(s=>s.id)).size,40);
 assert.ok(d.sources.every(s=>isLoboDemoSource(s)&&s.dogId===manifest.dogId));
 assert.ok([...manifest.opsIds,...manifest.coachingIds,manifest.dogId].every(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(id)));
 assert.deepEqual(d.personalRecords[0].payload,preparePersistenceCandidate({kind:'dog',localId:d.dog.id,value:d.dog}).payload);
 assert.ok(d.personalRecords.filter(r=>r.kind==='session-dog-link').every(r=>r.payload.dogId===manifest.dogId&&manifest.coachingIds.includes(r.payload.sessionId)));
});
test('persisted fictional identities require fixed manifest, exact owner and an explicit marker',()=>{
 for(const row of [...d.personalRecords.filter(r=>r.kind!=='session-dog-link'),...d.coachingSessions])assert.ok(isLoboDemoRecord(row,{ownerId}));
 assert.equal(isLoboDemoRecord({...d.coachingSessions[0],owner_id:'other'},{ownerId}),false);
 const source=d.sources[0];for(const patch of [{id:'10b00000-0000-4000-8000-999999999999'},{ownerId:'another-owner'},{demoLabel:'',title:'Lobo',dog:'Lobo'},{synthetic:false},{dataOrigin:'account'},{dogId:'other'}])assert.equal(isLoboDemoSource({...source,...patch}),false);
 const account={id:'real-record',ownerId,dog:'Lobo'};assert.equal(decorateLoboDemoRecord(account),account);
 const projection=projectRemoteSession(d.coachingSessions[0].state,ownerId);assert.equal(projection.dataOrigin,undefined);assert.ok(projection.dog.includes(label));assert.ok(isLoboDemoRecord(projection));
 assert.equal(decorateLoboDemoRecord({...projection,ownerId:'another-owner'}).dataOrigin,undefined);
});
test('varied dated observations stay fictional with unknown fields, no canine GPS and no invented weights',()=>{
 assert.equal(new Set(d.sources.map(s=>s.startedAt)).size,40);assert.ok(new Set(d.sources.map(s=>s.metrics.distanceM)).size>10);assert.ok(new Set(d.sources.map(s=>s.metrics.durationSeconds)).size>10);assert.ok(new Set(d.sources.map(s=>s.trackAge?.seconds)).size>=4);
 assert.ok(d.sources.some(s=>!s.trace.length));assert.ok(d.sources.some(s=>!s.eventsComplete));assert.ok(d.sources.some(s=>s.eventsComplete&&s.events.length===0));assert.ok(d.sources.some(s=>s.weather===null));assert.ok(d.sources.some(s=>s.trackAge===null));
 for(const s of d.sources){assert.ok(Date.parse(s.finishedAt)>Date.parse(s.startedAt));assert.equal(s.provenance.caninePosition,'unavailable');for(let i=0;i<s.events.length;i+=2){assert.equal(s.events[i].type,'Rupture');assert.equal(s.events[i+1].type,'Reprise');assert.ok(Date.parse(s.events[i+1].timestamp)>Date.parse(s.events[i].timestamp));}}
 for(const r of d.personalRecords.filter(r=>r.kind==='ops')){assert.equal(r.payload.gpsTrack,null);assert.equal(r.payload.traceMetadata.sourceType,'demo');assert.ok(r.payload.details.notes.includes(label));}
 for(const row of d.coachingSessions){const p=projectLoboDemoSession(row);assert.equal(p.phase,'ARCHIVED');assert.equal(p.dataOrigin,'demo');assert.equal(row.owner_id,ownerId);assert.equal(row.state.session.dog.id,manifest.dogId);if(p.search){assert.equal(p.search.provenance,'simulated');assert.equal(p.search.subject,'handler-phone-simulation');assert.equal(p.search.actorId,ownerId);}assert.ok(p.notes[0].text.includes(label));}
 assert.doesNotMatch(JSON.stringify(d),/relative_weight_percent|confidence_score|canine-gps/);
});
test('roundtrip consumes only accepted stored data and keeps datasets out of real JUMOLF',()=>{
 const read=deserializeLoboDemoRows({...d,ownerId});assert.equal(read.sources.length,40);assert.equal(read.dog.name,'Lobo');assert.ok(read.sources.every(isLoboDemoSource));
 assert.equal(deserializeLoboDemoRows({...d,ownerId:'other'}).sources.length,0);
 assert.equal(deserializeLoboDemoRows({personalRecords:[],coachingSessions:d.coachingSessions,ownerId}).sources.length,0);
 const fewer={...d,personalRecords:d.personalRecords.filter(r=>r.id!==manifest.opsIds[0]),coachingSessions:d.coachingSessions.slice(1)};assert.equal(deserializeLoboDemoRows({...fewer,ownerId}).sources.length,38);
 const mutated=structuredClone(d);mutated.personalRecords.find(r=>r.kind==='ops').payload.events=[];mutated.coachingSessions[0].state.search.gpsSearch=null;
 const changed=deserializeLoboDemoRows({...mutated,ownerId});assert.deepEqual(changed.sources.find(s=>s.id===manifest.opsIds[0]).events,[]);assert.deepEqual(changed.sources.find(s=>s.id===manifest.coachingIds[0]).trace,[]);
 assert.equal(buildRealJumolfProfile(d.dog.id,read.sources,{consents:{dog_history:true,session_comparison:true,gps:true,weather:true,ai_analysis:true}}).sessionCount,0);
});
test('fixture and deserialization perform no network calls',()=>{const previous=globalThis.fetch;globalThis.fetch=()=>{throw Error('No network allowed');};try{const fixture=buildLoboDemoDataset();assert.equal(deserializeLoboDemoRows({...fixture,ownerId}).sources.length,40);}finally{globalThis.fetch=previous;}});
test('HTTP whitelist projections intersect actual persisted dog history, without Edge changes or fixture fallback',()=>{
 const projections=d.coachingSessions.map(row=>projectRemoteSession(row.state,ownerId,Date.parse(row.updated_at)));
 const read=deserializeLoboDemoRows({personalRecords:d.personalRecords,coachingSessions:projections,ownerId});
 assert.equal(read.sources.length,40);assert.equal(read.coachingProjections.length,20);assert.ok(read.sources.every(isLoboDemoSource));
 assert.ok(d.personalRecords[0].payload.sessions.every(s=>s.kind==='coaching'&&s.trace.length<=25&&(!s.referenceTrace||s.referenceTrace.length<=25)));
 assert.ok(new TextEncoder().encode(JSON.stringify(d.personalRecords[0])).byteLength+512<200000);
 const records=structuredClone(d.personalRecords);records[0].payload.sessions[0].observations='Stored note edited in the actual saved dog history';
 const changed=deserializeLoboDemoRows({personalRecords:records,coachingSessions:projections,ownerId});assert.equal(changed.sources.find(s=>s.id===manifest.coachingIds[0]).observations,'Stored note edited in the actual saved dog history');
 assert.equal(deserializeLoboDemoRows({personalRecords:records,coachingSessions:projections.slice(1),ownerId}).sources.length,39);
 const unmarked=projections.map(p=>({...p,dog:'Lobo'}));assert.equal(deserializeLoboDemoRows({personalRecords:records,coachingSessions:unmarked,ownerId}).sources.length,20);
 records[0].payload.sessions=[];assert.equal(deserializeLoboDemoRows({personalRecords:records,coachingSessions:projections,ownerId}).sources.length,20);
});
