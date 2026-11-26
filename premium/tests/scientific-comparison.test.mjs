import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';
import {compareScientificCohorts} from '../src/scientific-comparison.mjs';

test('cohort comparison reports observed sample differences with sample sizes',()=>{
 const rows=generateJumolfSyntheticDataset().sessions,result=compareScientificCohorts({sessions:rows.filter(row=>row.kind==='training')},{sessions:rows.filter(row=>row.kind==='operational')});
 assert.equal(result.sampleA,100);assert.equal(result.sampleB,50);assert.match(result.caveat,/Différence observée dans cet échantillon/);assert.ok(result.metrics.some(item=>item.key==='confidence'));
});

test('track age comparison keeps terrain fixed and separates missing and intermediate ages',async()=>{
 const {compareScientificTrackAges}=await import('../src/scientific-comparison.mjs');
 const rows=[0,3599,3600,10800,10801,null].map(seconds=>({environment:{primary:'Forêt'},trackAge:{seconds}}));
 rows.push({environment:{primary:'Route'},trackAge:{seconds:200}});
 const compared=compareScientificTrackAges(rows,'Forêt');
 assert.equal(compared.sampleA,2);
 assert.equal(compared.sampleB,1);
 assert.deepEqual(compared.ageGroups,{terrain:'Forêt',missingAge:1,between:2});
});
