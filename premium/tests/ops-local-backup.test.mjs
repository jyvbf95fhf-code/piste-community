import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLocalOpsBackup,verifyLocalOpsBackup} from '../src/ops-local-backup.mjs';
const mission={kind:'operational',id:'ops-1',gpsTrack:{segments:[Array.from({length:7000},(_,i)=>({latitude:48+i/1e7,longitude:7+i/1e7,timestamp:i}))]},result:'positive',olfactoryCorridor:{enabled:true}};
test('full local OPS export is lossless and independently verifiable',async()=>{
 const backup=await buildLocalOpsBackup({missions:[mission]});
 assert.equal(backup.count,1);assert.deepEqual(backup.entries[0].mission,mission);
 assert.equal(await verifyLocalOpsBackup(JSON.parse(JSON.stringify(backup))),true);
});
test('tampering is rejected',async()=>{
 const backup=await buildLocalOpsBackup({missions:[mission]});backup.entries[0].mission.gpsTrack.segments[0].pop();
 await assert.rejects(()=>verifyLocalOpsBackup(backup),/altéré|incomplet/);
});
test('source is not modified',async()=>{
 const backup=await buildLocalOpsBackup({missions:[mission]});backup.entries[0].mission.result='negative';assert.equal(mission.result,'positive');
});
