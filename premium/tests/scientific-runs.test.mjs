import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';
import {createScientificRun,reproduceScientificRun,compareScientificRuns} from '../src/scientific-runs.mjs';
import {createScientificStore} from '../src/scientific-store.mjs';

test('runs append immutable outputs and reproduce deterministically with same inputs',()=>{
 const row=generateJumolfSyntheticDataset().sessions[0],store=createScientificStore({actor:{name:'Sébastien',permissions:{research:true}},clock:()=> '2026-10-07T08:00:00Z'});
 const first=createScientificRun(row,{store}),again=reproduceScientificRun(row,first),second=createScientificRun(row,{store,engineVersion:'JUMOLF Engine 1.1.0'});
 assert.deepEqual(again.outputs,first.outputs);assert.equal(store.snapshot().runs.length,2);assert.notEqual(first.id,second.id);assert.equal(store.snapshot().runs[0].engine_version,'JUMOLF Engine 1.0.0');
 assert.ok(compareScientificRuns(first,second).metrics.length>0);
});
