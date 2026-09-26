'use strict';

const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const helper = fs.readFileSync('replay-entry.mjs', 'utf8');

assert(/openLibraryItem\(type,id\)/.test(app), 'Mes pistes opening route missing');
assert(/openLibraryItem[\s\S]*openMissionDossier/.test(app), 'Mes pistes must route to mission dossier');
assert(/id="missionTabReplay"/.test(html), 'mission dossier Replay tab missing');
assert(/id="missionReplay"/.test(html), 'mission dossier Replay panel missing');
assert(/data-mission-tab="replay"/.test(html), 'mission Replay tab binding missing');
assert(/function\s+renderMissionReplay\s*\(/.test(app), 'mission Replay renderer missing');
assert(/renderMissionReplay\(source\)/.test(app), 'mission dossier must render Replay entry');
assert(/buildReplayDataset/.test(app), 'mission entry must evaluate the normalized dataset');
assert(/Replay indisponible pour cette piste/.test(app), 'unavailable mission state missing');
assert(/data-mission-replay/.test(app), 'mission Replay action missing');
assert(/replay-entry\.mjs/.test(app), 'entry state helper must be shared');
assert(/visible:\s*true/.test(helper), 'Replay must remain visible for every source');
assert(/disabled/.test(helper), 'active state must be explicit');
assert(/replayAvailable/.test(app.slice(app.indexOf('function renderMissionReplay'), app.indexOf('function setMissionTab'))), 'dataset availability must drive enabled state');
assert(/status[\s\S]*completed|ended|cancelled/.test(helper + app), 'historical completed status must remain covered');
assert(/openMissionDossier[\s\S]*setMissionTab\('summary'\)/.test(app), 'mission dossier initialization missing');
assert(!/supabase\.from|supabase\.rpc/.test(app.slice(app.indexOf('function renderMissionReplay'), app.indexOf('function setMissionTab'))), 'entry renderer must not add database access');
assert(!/maplibre|mapbox|cesium|timeline/i.test(app.slice(app.indexOf('function renderMissionReplay'), app.indexOf('function setMissionTab'))), 'Bloc 3/3D must not enter entry fix');
console.log('check-v10-52-replay-entry-real: PASS');
