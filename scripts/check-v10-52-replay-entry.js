'use strict';

const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
assert(/function\s+renderBlackBox\s*\(/.test(app), 'activity detail renderer missing');
assert(/data-blackbox-tab=\"replay\"/.test(fs.readFileSync('index.html', 'utf8')), 'Replay tab missing from activity detail');
assert(/buildReplayDataset/.test(app), 'entry must use the Bloc 1 dataset');
assert(/data-blackbox-replay/.test(app), 'Replay action missing');
assert(/Replay indisponible pour cette piste/.test(app), 'unavailable user state missing');
assert(/replayTab.*disabled|disabled.*replayTab/.test(app), 'active sessions must disable the entry');
assert(!/classList\.toggle\(['"]hidden['"],!replayEligible\)/.test(app), 'Replay tab must not be hidden for completed but incompatible tracks');
assert(!/supabase\.from|supabase\.rpc/.test(app.slice(app.indexOf('function renderBlackBox'), app.indexOf('const REPORT_SECTION_ORDER'))), 'entry fix must not add a database query');
assert(!/maplibre|mapbox|cesium|timeline/i.test(app.slice(app.indexOf('function renderBlackBox'), app.indexOf('const REPORT_SECTION_ORDER'))), 'Bloc 3/3D must not enter the entry fix');
console.log('check-v10-52-replay-entry: PASS');
