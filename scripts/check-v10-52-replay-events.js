'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const app = fs.readFileSync('app.js', 'utf8');
  const modelPath = path.resolve('replay-model.mjs');
  const model = fs.readFileSync(modelPath, 'utf8');
  assert(/events/.test(model), 'normalized event collection missing');
  assert(/timestamp/.test(model), 'event timestamp normalization missing');
  assert(/replay-events|data-replay-event/.test(app), 'timeline event markers missing');
  assert(/currentTime/.test(app.slice(app.indexOf('function updateReplayVisual'), app.indexOf('function renderReplaySurface'))), 'event state must use replay currentTime');
  assert(/seek\(.*timestamp|seek\(event/.test(app), 'event click must seek the replay clock');
  assert(/EVENT_ACTIVE_WINDOW_MS/.test(app), 'event active window must be centralized');
  assert(/setTrace|createMap/.test(app), 'existing map engine should remain in use');
  assert(!/requestAnimationFrame/.test(app.slice(app.indexOf('function updateReplayVisual'), app.indexOf('async function openReplayView'))), 'events must not add a second RAF loop');
  assert(!/supabase\.from|supabase\.rpc/.test(app.slice(app.indexOf('function replaySourceDataset'), app.indexOf('const REPORT_SECTION_ORDER'))), 'events must not add database access');
  const eventRuntime = app.slice(app.indexOf('function replayEventLabel'), app.indexOf('function renderReplaySurface'));
  assert(!/maplibre|mapbox|cesium|satellite|relief/i.test(eventRuntime), 'Bloc 5/3D must not enter event replay');
  const { buildReplayDataset } = await import(pathToFileURL(modelPath).href);
  const dataset = buildReplayDataset({
    driver: [{ lat: 48, lon: 7, recorded_at: '2026-01-01T10:00:00Z' }, { lat: 48.001, lon: 7.001, recorded_at: '2026-01-01T10:00:10Z' }],
    markers: [{ id: 'loss', lat: 48, lon: 7, marker_type: 'loss', recorded_at: '2026-01-01T10:00:04Z' }, { id: 'untimed', marker_type: 'recovery' }]
  });
  assert.equal(dataset.events.length, 1, 'untimed events must not be synchronized');
  assert.equal(dataset.events[0].type, 'loss');
  console.log('check-v10-52-replay-events: PASS');
})().catch(error => {
  console.error(`check-v10-52-replay-events: FAIL — ${error.message}`);
  process.exitCode = 1;
});
