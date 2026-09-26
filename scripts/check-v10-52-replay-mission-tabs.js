'use strict';

const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const nav = html.match(/<nav id="missionTabs"[\s\S]*?<\/nav>/)?.[0] || '';
const ids = [...nav.matchAll(/<button id="(missionTab[^"]+)"/g)].map(match => match[1]);
assert.deepEqual(ids, ['missionTabSummary','missionTabMap','missionTabTimeline','missionTabAnalysis','missionTabDebrief','missionTabReport','missionTabReplay'], 'mission tab DOM order must place Replay after Report');
assert(/function\s+ensureMissionReplayTab\s*\(/.test(app), 'mission tab normalization helper missing');
assert(/ensureMissionReplayTab\(\)/.test(app.slice(app.indexOf('function renderMissionDossier'), app.indexOf('function renderMissionReplay'))), 'mission renderer must normalize its real tab container');
assert(/insertBefore\(replay,report\.nextSibling\)/.test(app), 'Replay must be inserted after Report in the mission nav');
assert(/id="missionReplay"[\s\S]*data-mission-panel="replay"/.test(html), 'mission Replay panel missing');
console.log('check-v10-52-replay-mission-tabs: PASS');
