import test from 'node:test';
import assert from 'node:assert/strict';
import { OPERATIONAL_SCHEMA_VERSION, normalizeOperationalMission } from '../src/operational-data.mjs';

test('normalisation ajoute le modèle OPS commun sans écraser un snapshot legacy', () => {
  const legacy = {
    id: 'legacy-1', kind: 'operational', status: 'À compléter', trackingState: 'stopped',
    dogId: 'nox', details: { searchedPerson: 'Camille', lastContactAt: '2026-10-06T08:00:00Z', environment: 'Forêt' },
    trace: [{ x: 4, y: 8, role: 'departure' }], events: [{ type: 'Indice' }], journal: [{ kind: 'tracking_started' }],
    olfactoryCorridorEnabled: true, weatherDemo: { source: 'demo' }, gpxAttachment: { fixtureId: 'gpx-1', geometry: null }
  };
  const result = normalizeOperationalMission(legacy);

  assert.equal(result.schemaVersion, OPERATIONAL_SCHEMA_VERSION);
  assert.equal(result.entryMode, 'quick');
  assert.equal(result.details.searchedPerson, 'Camille');
  assert.equal(result.time.lastContactAt, '2026-10-06T08:00:00Z');
  assert.equal(result.context.environmentType, 'Forêt');
  assert.deepEqual(result.trace, legacy.trace);
  assert.deepEqual(result.events, legacy.events);
  assert.deepEqual(result.journal, legacy.journal);
  assert.equal(result.olfactoryCorridorEnabled, true);
  assert.deepEqual(result.weatherDemo, legacy.weatherDemo);
  assert.deepEqual(result.gpxAttachment, legacy.gpxAttachment);
  assert.deepEqual(result.places, {
    interventionAddress: null, interventionCommune: null, interventionSector: null,
    lastKnownPoint: null, lastKnownDescription: null, probableTrackStart: null, confirmedTrackStart: null
  });
  assert.deepEqual(result.pauseObservations, []);
  assert.equal(result.dogEvaluation.motivation, null);
});

test('normalisation est non destructive et conserve les provenances déjà présentes', () => {
  const input = { id: 'v2', schemaVersion: OPERATIONAL_SCHEMA_VERSION, entryMode: 'prepared', provenance: { context: 'user_confirmed' }, places: { interventionAddress: 'Gare' } };
  const result = normalizeOperationalMission(input);
  assert.equal(result.entryMode, 'prepared');
  assert.deepEqual(result.provenance, input.provenance);
  assert.equal(result.places.interventionAddress, 'Gare');
  assert.equal(result.places.lastKnownPoint, null);
  assert.equal(result.places.confirmedTrackStart, null);
  assert.deepEqual(input, { id: 'v2', schemaVersion: OPERATIONAL_SCHEMA_VERSION, entryMode: 'prepared', provenance: { context: 'user_confirmed' }, places: { interventionAddress: 'Gare' } });
});
