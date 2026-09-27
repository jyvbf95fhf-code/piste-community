'use strict';
const fs = require('fs');
const assert = require('assert/strict');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.equal((html.match(/id="startLayingBtn"/g) || []).length, 1, 'start button must have one DOM instance');
assert(/function bindCoachingStartLayingButton\(\)/.test(app), 'direct button binder missing');
const start = app.indexOf('function bindCoachingStartLayingButton');
const end = app.indexOf('\nfunction ', start + 10);
const binder = app.slice(start, end < 0 ? app.length : end);
assert(binder.includes("$('startLayingBtn')"), 'binder must resolve the current button node');
assert(binder.includes('.onclick='), 'binding must be direct and idempotent');
assert(binder.includes('aria-busy'), 'button must expose busy state');
assert(binder.includes('handleCoachingStartLaying()'), 'button must route through the shared role dispatcher');
assert(/bindCoachingStartLayingButton\(\)/.test(app.slice(app.indexOf('function applyV1040RoleSurface'), app.indexOf('function refreshActiveCoachingSessionData'))), 'surface render must restore the direct binding');
assert(/function handleCoachingStartLaying\(\)[\s\S]*role==='solo'[\s\S]*startSoloRun\(\)[\s\S]*startCoachingLaying/.test(app), 'role routing must preserve Solo and laying actors');
assert(!app.includes("bindClick('coachingPrimaryActions'"), 'start action must not retain a competing delegated binding');
assert(app.includes('requestCoachingTraceurPermission'), 'previous GPS permission fix must remain present');
assert(!/MapLibre|Satellite 3D/.test(binder), 'button fix must not touch 3D/Satellite');

console.log('check-v10-53-coaching-start-button: PASS');
