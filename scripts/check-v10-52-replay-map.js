'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const app = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('v2.css', 'utf8');
  const model = fs.readFileSync('replay-model.mjs', 'utf8');
  const playerPath = path.resolve('replay-player.mjs');
  assert(fs.existsSync(playerPath), 'replay-player.mjs missing');
  const player = fs.readFileSync(playerPath, 'utf8');
  assert(/replay-model\.mjs/.test(app), 'app must consume the replay model');
  assert(/replay-player\.mjs/.test(app), 'app must consume the replay player');
  assert(/buildReplayDataset/.test(app), 'activity replay must build a normalized dataset');
  assert(/activityReplayMap/.test(app), 'dedicated replay map surface missing');
  assert(/replayPlay|replayPause|replayReset|play|pause|reset/.test(app), 'replay controls missing');
  assert(/requestAnimationFrame/.test(player), 'replay player must use requestAnimationFrame');
  assert(/sampleReplayTrackAt/.test(player), 'replay player interpolation helper missing');
  assert(/id="blackBoxReplay"/.test(html)&&/data-blackbox-tab="replay"/.test(html), 'Replay entry point missing');
  assert(/replay-surface|replay-map/.test(css), 'replay surface CSS missing');
  assert(/PisteTerrainEngine\.createMap\(['"]activityReplayMap/.test(app), 'replay must reuse PisteTerrainEngine');
  assert(/traceMarkerIcon\(['"]D['"]\)|traceMarkerIcon\(['"]A['"]\)/.test(app), 'existing start/end markers must be reused');
  assert(/TRACE_PALETTE\.traceur/.test(app)&&/TRACE_PALETTE\.conducteur/.test(app), 'existing trace colors must be reused');
  assert(!/maplibre|mapbox|cesium/i.test(app+html+player), '3D engine must not be added in Bloc 2');
  assert(!/supabase\.from|supabase\.rpc|createClient/.test(player+model), 'replay modules must not add database access');
  assert(/Replay indisponible pour cette piste/.test(app), 'unavailable replay fallback missing');

  const imported = await import(pathToFileURL(playerPath).href);
  assert.equal(typeof imported.createReplayPlayer, 'function', 'createReplayPlayer export missing');
  assert.equal(typeof imported.sampleReplayTrackAt, 'function', 'sampleReplayTrackAt export missing');
  const points = [
    { actor: 'driver', timestamp: 1000, lat: 48, lon: 7 },
    { actor: 'driver', timestamp: 2000, lat: 48.001, lon: 7.001 }
  ];
  const before = imported.sampleReplayTrackAt(points, 500);
  const middle = imported.sampleReplayTrackAt(points, 1500);
  const after = imported.sampleReplayTrackAt(points, 2500);
  assert.equal(before, null, 'actor must not appear before first timestamp');
  assert(Math.abs(middle.lat - 48.0005) < 1e-9, 'visual interpolation should be linear');
  assert.equal(after.lat, 48.001, 'actor must remain at final point after duration');

  let scheduled = null;
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = callback => { scheduled = callback; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  const playerInstance = imported.createReplayPlayer({
    tracks: { traceur: [], driver: points, planned: [], external: [] },
    capabilities: { replayAvailable: true, startTimestamp: 1000, endTimestamp: 2000, durationMs: 1000 }
  });
  let latest = null;
  const unsubscribe = playerInstance.subscribe(state => { latest = state; });
  assert.equal(playerInstance.play(), true, 'play should start an available replay');
  assert.equal(playerInstance.isPlaying, true, 'player should expose playing state');
  assert.equal(typeof scheduled, 'function', 'play should schedule requestAnimationFrame');
  scheduled(1000); scheduled(2000);
  assert.equal(playerInstance.isPlaying, false, 'replay should stop at the end');
  assert.equal(latest.currentTime, 2000, 'replay should reach its end timestamp');
  playerInstance.reset();
  assert.equal(playerInstance.currentTime, 1000, 'reset should return to the start');
  assert.equal(playerInstance.play(), true, 'replay should be resumable after reset');
  assert.equal(playerInstance.pause(), true, 'pause should stop an active replay');
  unsubscribe(); playerInstance.destroy();
  if (originalRequest) globalThis.requestAnimationFrame = originalRequest; else delete globalThis.requestAnimationFrame;
  if (originalCancel) globalThis.cancelAnimationFrame = originalCancel; else delete globalThis.cancelAnimationFrame;

  console.log('check-v10-52-replay-map: PASS');
})().catch(error => {
  console.error(`check-v10-52-replay-map: FAIL — ${error.message}`);
  process.exitCode = 1;
});
