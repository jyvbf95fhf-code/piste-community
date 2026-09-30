import assert from 'node:assert/strict';
import {
  SCIENTIFIC_PROVENANCE,
  createScientificSnapshot,
  scientificValue,
  unknownScientificValue,
  projectScientificSnapshot
} from '../scientific-snapshot.mjs';
import { createScientificFixtures } from './fixtures/v10-55-scientific-snapshot-fixtures.mjs';

const expected = ['measured', 'calculated', 'estimated', 'unknown'];
assert.deepEqual(Object.values(SCIENTIFIC_PROVENANCE), expected, 'provenance vocabulary must stay stable');

const fixtures = createScientificFixtures();
assert.deepEqual(Object.keys(fixtures).sort(), ['complete', 'corridor', 'empty', 'partial', 'poor']);

for (const [name, snapshot] of Object.entries(fixtures)) {
  assert.equal(snapshot.schema, 'scientificSnapshot');
  assert.equal(snapshot.version, '1.0');
  assert.ok(snapshot.fields && typeof snapshot.fields === 'object', `${name} fields missing`);
  for (const [fieldName, field] of Object.entries(snapshot.fields)) {
    assert.ok(expected.includes(field.category), `${name}.${fieldName} category invalid`);
    assert.ok(field.unit, `${name}.${fieldName} unit missing`);
    assert.ok(field.provenance && typeof field.provenance === 'object', `${name}.${fieldName} provenance missing`);
    if (field.category === 'unknown') assert.equal(field.value, null, `${name}.${fieldName} unknown must have null value`);
    if (field.category === 'estimated') assert.notEqual(field.provenance.kind, 'recorded', `${name}.${fieldName} estimated cannot be recorded`);
    if (field.category === 'measured') assert.notEqual(field.provenance.kind, 'model', `${name}.${fieldName} measured cannot be model output`);
  }
}

const reconstructedWeather = fixtures.poor.fields.weather;
assert.equal(reconstructedWeather.category, 'estimated');
assert.equal(reconstructedWeather.provenance.source, 'open-meteo-reconstruction');
const corridor = fixtures.corridor.fields.scentCorridor;
assert.equal(corridor.category, 'estimated');
assert.equal(corridor.provenance.kind, 'model');
assert.match(corridor.provenance.label, /estim/i);

const unknown = unknownScientificValue('m', 'timestamps-missing');
assert.equal(unknown.value, null);
assert.equal(unknown.category, 'unknown');
assert.equal(unknown.provenance.kind, 'missing');

assert.throws(() => scientificValue(1, { unit: 'm', category: 'measured', provenance: { kind: 'model' } }), /measured/);
assert.throws(() => scientificValue(1, { unit: '', category: 'calculated' }), /unit/);

const projected = projectScientificSnapshot(fixtures.complete, ['driverDistance']);
assert.ok(projected.fields.driverDistance);
assert.equal(projected.fields.weather.value, null);
assert.equal(projected.fields.weather.category, 'unknown');
assert.equal(projected.fields.weather.provenance.kind, 'permission-denied');

const first = JSON.stringify(createScientificFixtures());
const second = JSON.stringify(createScientificFixtures());
assert.equal(first, second, 'fixtures must be deterministic');

const sample = createScientificSnapshot({ fields: { duration: scientificValue(120, { unit: 's', category: 'calculated', provenance: { kind: 'derived', source: 'fixture' } }) } });
assert.equal(sample.fields.duration.value, 120);
console.log('PASS v10.55 scientific snapshot contract');
