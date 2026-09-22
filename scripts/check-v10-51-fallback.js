#!/usr/bin/env node
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const required=['plannerMap','liveMap','operationalCallMap','coachingMap','missionMap','activityLibraryMap','activityDetailMap','historyMap','globalMap','publicShareMap'];
let failed=0;
for(const id of required){const ok=app.includes(`createTerrainMap('${id}'`)||app.includes(`PisteTerrainEngine.createMap('${id}'`);console.log(`${ok?'✓':'✗'} ${id} has engine/legacy adapter`);if(!ok)failed++}
const checks=[
 ['legacy query gate',/terrainEngine.*legacy/],
 ['preview/dev gate',/TERRAIN_ENGINE_PREVIEW_OR_DEV/],
 ['debug requires explicit query flag',/new URLSearchParams\(location\.search\)\.get\('terrainDebug'\)!=='1'/],
 ['no paid provider in code',app=>!/mapbox|maptiler|api_key|access_token/i.test(app)],
 ['snapshot fallback retained',/fallback cartographique indisponible|representation de secours|Fond cartographique indisponible/],
 ['engine mode default',/PISTE_TERRAIN_ENGINE_MODE=.*?'engine'/]
];for(const [name,re] of checks){const ok=typeof re==='function'?re(app):re.test(app);console.log(`${ok?'✓':'✗'} ${name}`);if(!ok)failed++}
if(failed)process.exit(1);console.log('check-v10-51-fallback: PASS');
