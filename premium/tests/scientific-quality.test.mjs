import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';
import {explainScientificQuality} from '../src/scientific-quality.mjs';
import {scientificProvenance} from '../src/scientific-provenance.mjs';

test('quality explains available and missing inputs without replacing missing data',()=>{
 const row=generateJumolfSyntheticDataset().sessions.find(item=>item.quality.missingInputs.length>0),dimensions=explainScientificQuality(row);
 assert.ok(dimensions.some(item=>item.status==='missing'));
 assert.ok(dimensions.every(item=>['high','medium','low','insufficient','missing'].includes(item.status)));
 assert.ok(dimensions.every(item=>typeof item.label==='string'));
});

test('provenance shows synthetic and calculated origins without invented timestamps',()=>{
 const row=generateJumolfSyntheticDataset().sessions[0],weather=scientificProvenance(row,'weather'),distance=scientificProvenance(row,'metrics.distanceM');
 assert.equal(weather.synthetic,true);assert.ok(weather.source);assert.equal(weather.timestamp,null);
 assert.equal(distance.method,'JUMOLF mock calculation');assert.equal(distance.synthetic,true);
 assert.equal(scientificProvenance(row,'unknown-field').status,'Indisponible');
});
