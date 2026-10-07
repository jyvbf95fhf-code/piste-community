import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';
import {compareScientificCohorts} from '../src/scientific-comparison.mjs';

test('cohort comparison reports observed sample differences with sample sizes',()=>{
 const rows=generateJumolfSyntheticDataset().sessions,result=compareScientificCohorts({sessions:rows.filter(row=>row.kind==='training')},{sessions:rows.filter(row=>row.kind==='operational')});
 assert.equal(result.sampleA,100);assert.equal(result.sampleB,50);assert.match(result.caveat,/Différence observée dans cet échantillon/);assert.ok(result.metrics.some(item=>item.key==='confidence'));
});
