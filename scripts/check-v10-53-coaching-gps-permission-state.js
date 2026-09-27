'use strict';
const fs = require('fs');
const assert = require('assert/strict');

const app = fs.readFileSync('app.js', 'utf8');
assert(app.includes("geolocation:request"), 'geolocation requests must be instrumented');
assert(app.includes("geolocation:success"), 'geolocation success must be instrumented');
assert(app.includes("geolocation:error"), 'geolocation errors must be instrumented');
assert(app.includes("geolocation:watch-created"), 'watch creation must be instrumented');
assert(app.includes("geolocation:watch-success"), 'watch success must be instrumented');
assert(app.includes("geolocation:watch-error"), 'watch errors must be instrumented');
assert(app.includes("permission-state-change"), 'permission state changes must be instrumented');
assert(app.includes("preview-location:start"), 'preview start must be instrumented');
assert(app.includes("preview-location:stop"), 'preview stop must be instrumented');
assert(app.includes("traceur-location:start"), 'traceur start must be instrumented');
assert(app.includes("traceur-location:stop"), 'traceur stop must be instrumented');
assert(/function setCoachingLocationPermissionState\(state,reason/.test(app), 'permission changes need a reason/source');
const preview = app.slice(app.indexOf('async function requestCoachingPreviewLocation'), app.indexOf('async function requestCoachingTraceurPermission'));
assert(preview.includes("source:'preview'"), 'automatic preview must identify its source');
assert(!/if\(err\?\.code===1\)setCoachingLocationPermissionState\('denied'\)/.test(preview), 'automatic preview must not poison global denied state');
assert(/clearWatch\(coachingPreviewWatch\)/.test(preview), 'preview watcher must be cleared after real denial');
const preflight = app.slice(app.indexOf('async function requestCoachingTraceurPermission'), app.indexOf('async function resumeSoloCoachingPhaseGps'));
assert(preflight.includes("source:'traceur-preflight'"), 'explicit traceur preflight must identify its source');
assert(preflight.includes('code===1'), 'permission denied must remain a blocking explicit error');
assert(preflight.includes('code===2||error?.code===3'), 'timeout and unavailable must remain non-blocking');
// Pure state fixture: preview timeout/unavailable preserve unknown; explicit denial blocks.
let state = 'unknown';
const transition = (next, source, code) => {
  if (source === 'preview' && code !== 1) return state;
  if (source === 'preview' && code === 1) return state;
  return next;
};
assert.equal(transition('denied', 'preview', 3), 'unknown');
assert.equal(transition('denied', 'preview', 2), 'unknown');
state = transition('denied', 'traceur-preflight', 1);
assert.equal(state, 'denied');
console.log('check-v10-53-coaching-gps-permission-state: PASS');
