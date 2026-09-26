'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const app = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('v2.css', 'utf8');
  const playerPath = path.resolve('replay-player.mjs');
  const playerSource = fs.readFileSync(playerPath, 'utf8');
  assert(/seek\(/.test(playerSource), 'replay player seek API missing');
  assert(/setPlaybackRate\(/.test(playerSource), 'replay player playback rate API missing');
  assert(/requestAnimationFrame/.test(playerSource), 'timeline must reuse RAF clock');
  assert(/type="range"/.test(app), 'timeline range control missing');
  assert(/aria-label="Position dans le replay"/.test(app), 'timeline accessibility label missing');
  assert(/1x/.test(app) && /2x/.test(app), '1x/2x controls missing');
  assert(/setPlaybackRate/.test(app) && /\.seek\(/.test(app), 'UI must bind timeline and rate to player');
  assert(/renderReplaySurface\(dataset,'missionReplay'/.test(app), 'mission Replay must use the shared timeline surface');
  assert(/renderReplaySurface\(dataset\)/.test(app), 'blackbox Replay must retain the shared timeline surface');
  assert(/replay-surface[^\n]*padding-bottom|\.replay-surface[\s\S]*safe-area|replay.*padding-bottom/i.test(css), 'Replay bottom safe-area spacing missing');
  const replay2dRuntime = app.slice(0, app.indexOf('function closeReplay3DPrototype'));
  assert(!/maplibre|mapbox|cesium/i.test(replay2dRuntime + playerSource), '3D engine must not enter the Bloc 3 runtime');
  assert(!/observations|messages|pertes|reprises/i.test(app.slice(app.indexOf('function renderReplaySurface'), app.indexOf('async function openReplayView'))), 'Bloc 4 events must not enter timeline surface');

  const { createReplayPlayer } = await import(pathToFileURL(playerPath).href);
  const dataset = {
    tracks: { traceur: [], driver: [{ timestamp: 1000, lat: 48, lon: 7 }, { timestamp: 3000, lat: 48.002, lon: 7.002 }], planned: [], external: [] },
    capabilities: { replayAvailable: true, startTimestamp: 1000, endTimestamp: 3000, durationMs: 2000 }
  };
  const player = createReplayPlayer(dataset);
  assert.equal(player.seek(1000), true, 'absolute seek should work');
  assert.equal(player.currentTime, 1000);
  assert.equal(player.seek(500), true, 'offset seek should work');
  assert.equal(player.currentTime, 1500);
  assert.equal(player.setPlaybackRate(2), true, '2x playback should work');
  assert.equal(player.playbackRate, 2);
  player.destroy();
  console.log('check-v10-52-replay-timeline: PASS');
})().catch(error => {
  console.error(`check-v10-52-replay-timeline: FAIL — ${error.message}`);
  process.exitCode = 1;
});
