import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';
import {buildScientificDatasetView,scientificSessionDetail} from '../src/scientific-dataset.mjs';

test('scientific view reuses all 150 synthetic source sessions without mutating them',()=>{
 const source=generateJumolfSyntheticDataset(),before=structuredClone(source.sessions);
 const view=buildScientificDatasetView(source,{},[],[]);
 assert.equal(view.sessions.length,150);assert.equal(view.summary.training,100);assert.equal(view.summary.operational,50);
 assert.equal(view.summary.synthetic,true);assert.deepEqual(source.sessions,before);
 assert.equal(view.sessions[0].syntheticLabel,'Données synthétiques / Démonstration');
 assert.equal(scientificSessionDetail(view.sessions[0]).id,view.sessions[0].id);
});
