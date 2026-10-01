const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const start = app.indexOf('function normalizeHistoricalTimestamp');
const end = app.indexOf('\nfunction computeHistoricalScentCorridor', start);
assert.ok(start >= 0 && end > start, 'historical corridor helpers missing');
const helperSource = app.slice(start, end);
const context = {};
vm.runInNewContext(`${helperSource}\nthis.helpers={normalizeHistoricalTimestamp,historicalCorridorTrack};`, context);
const { normalizeHistoricalTimestamp, historicalCorridorTrack } = context.helpers;

const t0 = Date.parse('2026-01-01T00:00:00.000Z');
const track = [0, 10, 20, 30].map((seconds, index) => ({
  lat: 45 + index / 1000,
  lon: 2 + index / 1000,
  recorded_at: new Date(t0 + seconds * 1000).toISOString()
}));

assert.equal(normalizeHistoricalTimestamp(String(t0 / 1000)), t0, 'seconds timestamps normalize');
assert.equal(normalizeHistoricalTimestamp(t0), t0, 'millisecond timestamps normalize');
assert.equal(normalizeHistoricalTimestamp(track[0].recorded_at), t0, 'ISO timestamps normalize');

const replaySource = { reference: track, replayTemporal: true };
assert.equal(historicalCorridorTrack(replaySource, t0, { strictTemporal: true }).length, 1, 'replay start must not borrow future points');
assert.equal(historicalCorridorTrack(replaySource, t0 + 10_000, { strictTemporal: true }).length, 2, 'replay middle exposes only elapsed points');
assert.equal(historicalCorridorTrack(replaySource, t0 + 30_000, { strictTemporal: true }).length, 4, 'replay end exposes all points');

assert.match(app, /replayTemporal:\s*true/, 'replay corridor source must declare temporal projection');
assert.match(app, /strictTemporal:\s*source\?\.replayTemporal\s*===\s*true/, 'corridor projection must support strict temporal filtering');
assert.match(app, /replaySurface\.corridorBucket\s*=\s*bucket/, 'replay corridor recalculation must be memoized');
assert.match(app, /replayLayers\.corridor\.forEach\(layer=>\{try\{layer\.remove\(\)\}/, 'corridor layers must be removable');
assert.match(app, /if\(!historicalCorridorState\.visibility\)[\s\S]{0,500}replayLayers\.corridor=\[\]/, 'turning corridor off must clear rendered layers');
assert.equal((app.match(/from ['"]\.\/scent-corridor-engine\.mjs['"]/g) || []).length, 1, 'one corridor engine only');
assert.equal((app.match(/watchPosition\s*\(/g) || []).length, 1, 'one native GPS watcher only');
assert.doesNotMatch(app, /fetchCoachingHistoricalWeather[\s\S]{0,500}for\s*\(/, 'no weather request per GPS point');

const replayModel = fs.readFileSync('replay-model.mjs', 'utf8');
const replayPlayer = fs.readFileSync('replay-player.mjs', 'utf8');
assert.equal((replayPlayer.match(/requestAnimationFrame|setTimeout\(\(\)=>callback/g) || []).length >= 1, true, 'replay has one existing clock implementation');
assert.doesNotMatch(app, /setInterval\([^)]*replay/i, 'Replay must not create a second interval clock');
assert.doesNotMatch(app, /requestAnimationFrame\([^)]*replay/i, 'Replay UI must not create a second animation clock');
assert.match(replayModel, /normalizeTimestamp/);
assert.match(replayPlayer, /createReplayPlayer/);

(async () => {
  const { buildReplayDataset } = await import('../replay-model.mjs');
  const { createReplayPlayer } = await import('../replay-player.mjs');
  const { computeScentCorridor } = await import('../scent-corridor-engine.mjs');
  const points = [0, 10, 20, 30].map((seconds, index) => ({
    lat: 45 + index / 1000,
    lon: 2 + index / 1000,
    recorded_at: new Date(t0 + seconds * 1000).toISOString()
  }));
  const dataset = buildReplayDataset({ traceur: points, driver: points });
  assert.equal(dataset.capabilities.startTimestamp, t0);
  assert.equal(dataset.capabilities.endTimestamp, t0 + 30_000);
  const player = createReplayPlayer(dataset);
  const states = [];
  const unsubscribe = player.subscribe(state => states.push(state));
  player.seek(t0);
  assert.equal(states.at(-1).currentTime, t0, 'replay start is deterministic');
  player.seek(t0 + 20_000);
  assert.equal(states.at(-1).currentTime, t0 + 20_000, 'replay advances from the shared clock');
  player.setPlaybackRate(5);
  assert.equal(player.playbackRate, 5, 'playback speed changes the same clock');
  player.pause();
  player.seek(t0 + 10_000);
  player.seek(t0 + 30_000);
  assert.equal(states.at(-1).currentTime, t0 + 30_000, 'replay can move backwards then to the end');
  unsubscribe();
  player.destroy();

  const completeWeather = { provenance: 'measured', wind_direction_deg: 180, wind_speed_kmh: 8, temperature_c: 12, humidity_pct: 68 };
  const partialWeather = { provenance: 'reconstructed', wind_direction_deg: 180, wind_speed_kmh: 8 };
  const args = { track: points, trackStartedAt: points[0].recorded_at, currentTime: points.at(-1).recorded_at };
  const complete = computeScentCorridor({ ...args, weather: completeWeather });
  const partial = computeScentCorridor({ ...args, weather: partialWeather });
  const absent = computeScentCorridor({ ...args, weather: null });
  assert.ok(complete.geometry, 'complete weather still produces a corridor');
  assert.ok(partial.geometry, 'partial weather still produces an explainable corridor');
  assert.ok(absent.geometry, 'missing weather does not invent weather or block geometry');
  assert.deepEqual(
    computeScentCorridor({ ...args, weather: completeWeather }),
    complete,
    'same replay inputs remain deterministic'
  );
assert.match(app, /historicalCorridorAllowed\(source\)/, 'permissions guard remains on replay corridor calculation');
assert.match(app, /coachingOdorAuthorized\(row,role\)/, 'odor authorization remains part of corridor access');
assert.match(app, /replay-corridor-status/, 'Replay must expose a compact corridor calculation status');
assert.match(app, /En attente/, 'Replay pending corridor state must be explicit');
assert.match(app, /Estimation affichée/, 'Replay calculated corridor state must be explicit');
assert.match(app, /Estimation indisponible/, 'Replay unavailable corridor state must be explicit');
assert.doesNotMatch(app, /fillOpacity:\.085/, 'Replay corridor outer fill must be visually strengthened');
assert.match(app, /fillOpacity:\.13/, 'Replay corridor outer fill must remain transparent but visible');
assert.match(app, /fillOpacity:\.26/, 'Replay corridor inner fill must remain transparent but visible');
const css = fs.readFileSync('v2.css', 'utf8');
assert.doesNotMatch(css, /\n\+\.leaflet-overlay-pane \.odor-zone/, 'odor-zone selector must not begin with an invalid combinator');
assert.match(css, /\.leaflet-overlay-pane \.odor-zone\{/, 'odor-zone selector must be valid');
console.log('PASS v10.55 synchronized replay corridor runtime guard');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
