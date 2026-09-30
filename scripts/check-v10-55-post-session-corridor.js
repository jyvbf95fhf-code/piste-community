import assert from 'node:assert/strict';
import { computeScentCorridor } from '../scent-corridor-engine.mjs';
import { buildPostSessionCorridorSnapshot, corridorSummaryState, unavailableCorridorSnapshot, adaptScientificMetric } from '../scientific-post-session.mjs';

const track = [
  { lat: 45, lon: 2, recorded_at: '2026-01-01T10:00:00Z' },
  { lat: 45.0005, lon: 2.0005, recorded_at: '2026-01-01T10:05:00Z' },
  { lat: 45.001, lon: 2.001, recorded_at: '2026-01-01T10:10:00Z' }
];
const weather = {
  source: 'weather_snapshot',
  provenance: 'measured',
  wind_direction_deg: 180,
  wind_speed_kmh: 8,
  wind_gusts_kmh: 12,
  temperature_c: 12,
  humidity_pct: 68,
  precipitation_mm: 0
};
const result = computeScentCorridor({ track, weather, trackStartedAt: track[0].recorded_at, currentTime: '2026-01-01T10:30:00Z', terrainContext: { environment: 'open', relief: 'known' } });
const complete = buildPostSessionCorridorSnapshot({ sessionId: 'fixture-complete', result, weather, referencePointCount: track.length, permission: true });
assert.equal(complete.fields.corridor.category, 'estimated');
assert.equal(complete.fields.corridor.provenance.kind, 'model');
assert.equal(complete.fields.corridor.provenance.source, 'scent-corridor-engine@1.0');
assert.equal(complete.fields.weather.category, 'measured');
assert.equal(corridorSummaryState(complete), 'complete');

const partialWeather = { ...weather, source: 'archive-reconstructed', provenance: 'reconstructed', humidity_pct: undefined };
const partialResult = computeScentCorridor({ track, weather: partialWeather, trackStartedAt: track[0].recorded_at, currentTime: '2026-01-01T10:30:00Z', terrainContext: { environment: 'open', relief: 'known' } });
const partial = buildPostSessionCorridorSnapshot({ sessionId: 'fixture-partial', result: partialResult, weather: partialWeather, referencePointCount: track.length, permission: true });
assert.equal(partial.fields.weather.category, 'estimated');
assert.equal(corridorSummaryState(partial), 'partial');
assert.ok(partial.metadata.missing.length > 0);

const unavailable = unavailableCorridorSnapshot({ sessionId: 'fixture-empty', reason: 'permission-or-hidden-track' });
assert.equal(unavailable.fields.corridor.category, 'unknown');
assert.equal(unavailable.fields.corridor.value, null);
assert.equal(corridorSummaryState(unavailable), 'unavailable');

const denied = buildPostSessionCorridorSnapshot({ sessionId: 'fixture-denied', result, weather, referencePointCount: track.length, permission: false, reason: 'permission-or-hidden-track' });
assert.equal(denied.fields.corridor.category, 'unknown');
assert.equal(denied.fields.corridor.provenance.kind, 'permission-denied');
assert.equal(corridorSummaryState(denied), 'unavailable');

const legacyUnavailable = adaptScientificMetric({ value: 12, provenance: 'unavailable', reason: 'timestamps-missing' }, { unit: 'ms' });
assert.equal(legacyUnavailable.category, 'unknown');
assert.equal(legacyUnavailable.value, null);
assert.equal(legacyUnavailable.provenance.kind, 'missing');

const unavailableMetric = unavailableCorridorSnapshot({ sessionId: 'fixture-v10-53', reason: 'source-unavailable' });
assert.equal(unavailableMetric.fields.weather.category, 'unknown');
assert.equal(unavailableMetric.fields.weather.value, null);
assert.equal(unavailableMetric.fields.weather.provenance.kind, 'missing');

assert.deepEqual(
  buildPostSessionCorridorSnapshot({ sessionId: 'fixture-complete', result, weather, referencePointCount: track.length, permission: true }),
  complete,
  'same inputs must produce same snapshot'
);

const app = await import('node:fs/promises').then(fs => fs.readFile('app.js', 'utf8'));
assert.match(app, /buildPostSessionCorridorSnapshot/);
assert.match(app, /projectScientificSnapshot/);
assert.match(app, /projectScientificSnapshot\(snapshot/);
assert.match(app, /historicalCorridorSummary\(result/);
assert.equal((app.match(/from ['\"]\.\/scent-corridor-engine\.mjs['\"]/g) || []).length, 1);
assert.doesNotMatch(app, /function computeScentCorridor\s*\(/);
assert.doesNotMatch(app, /fetchCoachingHistoricalWeather[\s\S]{0,300}for\s*\(/, 'weather must not be fetched per GPS point');
console.log('PASS v10.55 post-session corridor adapter');
