'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const modulePath = path.resolve(__dirname, '../replay-model.mjs');
  assert(fs.existsSync(modulePath), 'replay-model.mjs missing');
  const replay = await import(pathToFileURL(modulePath).href);
  const fixtures = await import(pathToFileURL(path.resolve(__dirname, 'fixtures/v10-52-replay-fixtures.mjs')).href);
  const { normalizeReplayPoints, buildReplayDataset } = replay;

  assert.equal(typeof normalizeReplayPoints, 'function', 'normalizeReplayPoints export missing');
  assert.equal(typeof buildReplayDataset, 'function', 'buildReplayDataset export missing');
  assert(!/createClient|navigator\.geolocation|watchPosition|fetch\s*\(/i.test(fs.readFileSync(modulePath, 'utf8')), 'model must not own data access or GPS');

  const source = fixtures.traceurOnly.map(point => ({ ...point }));
  const snapshot = JSON.stringify(source);
  const normalized = normalizeReplayPoints(source, { actor: 'traceur', source: 'coaching_trace_points' });
  assert.equal(normalized.points.length, 2, 'valid traceur points should be retained');
  assert.equal(normalized.points[0].actor, 'traceur', 'default actor should be applied');
  assert.equal(normalized.points[0].source, 'coaching_trace_points', 'source should be retained');
  assert(Number.isFinite(normalized.points[0].timestamp), 'ISO timestamp should become milliseconds');
  assert.deepEqual(source, JSON.parse(snapshot), 'source points must not be mutated');

  const seconds = normalizeReplayPoints(fixtures.driverOnly, { actor: 'driver' });
  assert.equal(seconds.points[0].timestamp, 1767261600000, 'epoch seconds should normalize to milliseconds');
  assert.equal(seconds.points[1].timestamp, 1767261605000, 'epoch milliseconds should remain milliseconds');
  assert(seconds.points[0].timestamp <= seconds.points[1].timestamp, 'points should remain chronological');

  const invalid = normalizeReplayPoints(fixtures.invalidPoints, { actor: 'driver' });
  assert.equal(invalid.points.length, 0, 'invalid coordinates/timestamps must be ignored');
  assert.equal(invalid.invalidCount, 3, 'invalid points should be counted');

  const missing = normalizeReplayPoints(fixtures.noTimestamps, { actor: 'driver' });
  assert.equal(missing.points.length, 2, 'valid coordinates without time remain inspectable');
  assert.equal(missing.hasTimestamps, false, 'missing timestamps must be explicit');

  const solo = buildReplayDataset({ traceur: fixtures.traceurOnly });
  assert.equal(solo.capabilities.hasTraceur, true, 'traceur capability missing');
  assert.equal(solo.capabilities.hasDriver, false, 'driver capability should be absent');
  assert.equal(solo.capabilities.replayAvailable, true, 'timestamped solo trace should be replayable');
  assert.equal(solo.capabilities.durationMs, 5000, 'duration should use normalized endpoints');
  assert.equal(solo.capabilities.hasAltitude, false, 'altitude must not be invented');
  assert.equal(solo.capabilities.hasSpeed, true, 'existing speed should be detected');

  const duo = buildReplayDataset({ ...fixtures.traceurAndDriver, ...fixtures.events });
  assert.equal(duo.capabilities.hasTraceur, true, 'multi-actor traceur missing');
  assert.equal(duo.capabilities.hasDriver, true, 'multi-actor driver missing');
  assert.equal(duo.tracks.traceur[0].actor, 'traceur');
  assert.equal(duo.tracks.driver[0].actor, 'driver');
  assert.equal(duo.events.length, 4, 'timestamped markers/observations/messages should be merged');
  assert(duo.events.every((event, index, list) => !index || event.timestamp >= list[index - 1].timestamp), 'events should be chronological');

  const unavailable = buildReplayDataset({ driver: fixtures.noTimestamps });
  assert.equal(unavailable.capabilities.replayAvailable, false, 'untimed tracks must not be replayable');
  assert.equal(unavailable.capabilities.replayUnavailableReason, 'missing_timestamps');

  const partial = buildReplayDataset(fixtures.partialHistorical);
  assert.equal(partial.capabilities.replayAvailable, false, 'partially timed tracks must not claim a complete replay');
  assert.equal(partial.capabilities.replayUnavailableReason, 'incomplete_timestamps');
  assert.equal(partial.events.length, 1, 'timestamped historical events should remain available');

  console.log('check-v10-52-replay-model: PASS');
})().catch(error => {
  console.error(`check-v10-52-replay-model: FAIL — ${error.message}`);
  process.exitCode = 1;
});
