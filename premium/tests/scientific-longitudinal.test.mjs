import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';
import {buildScientificLongitudinal} from '../src/scientific-longitudinal.mjs';
import {explainScientificAnomaly} from '../src/scientific-anomalies.mjs';

test('longitudinal series remain linked to source session IDs and include context groups',()=>{
 const rows=generateJumolfSyntheticDataset().sessions,result=buildScientificLongitudinal(rows);
 assert.equal(result.series.length,rows.length);assert.ok(result.series.every(point=>point.sourceSessionIds.length===1));assert.ok(result.groups.environment.length>0);assert.ok(result.groups.ageBand.length>0);
});
test('anomaly explanation includes context, reason and synthetic quality',()=>{
 const rows=generateJumolfSyntheticDataset().sessions,row=rows.find(item=>item.atypicalCode),result=explainScientificAnomaly({sessionId:row.id,why:'Test d’anomalie'},row,rows);
 assert.equal(result.sessionId,row.id);assert.equal(result.quality,row.quality.level);assert.match(result.reason,/Test d’anomalie/);assert.equal(result.synthetic,true);
});
