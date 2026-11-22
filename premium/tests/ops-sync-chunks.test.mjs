import test from 'node:test';
import assert from 'node:assert/strict';
import {splitOpsPayload,joinOpsPayload} from '../src/ops-sync-chunks.mjs';
const example={kind:'operational',id:'mission-test',gpsTrack:{segments:[Array.from({length:6000},(_,i)=>({latitude:48.1+i/1e7,longitude:7.3-i/1e7,timestamp:1795000000000+i*1000,accuracy:5}))]},journal:['départ','pause','arrivée'],metadata:{note:'épreuve de conservation intégrale'}};
test('long OPS mission roundtrips without losing points or timestamps',async()=>{
 const b=await splitOpsPayload(example);assert.ok(b.chunks.length>1);assert.deepEqual(await joinOpsPayload(b),example);
 for(const c of b.chunks)assert.ok(c.bytes<=96000);
});
test('incomplete backup is rejected',async()=>{
 const b=await splitOpsPayload(example);b.chunks.pop();await assert.rejects(()=>joinOpsPayload(b),/manquant|incomplète/);
});
test('altered backup is rejected',async()=>{
 const b=await splitOpsPayload(example);b.chunks[0].data=b.chunks[0].data.replace(/^./,b.chunks[0].data[0]==='A'?'B':'A');await assert.rejects(()=>joinOpsPayload(b),/Intégrité|invalide|incompatible/);
});
test('small dossier roundtrips',async()=>{const p={kind:'operational',gpsTrack:null};assert.deepEqual(await joinOpsPayload(await splitOpsPayload(p)),p);});
