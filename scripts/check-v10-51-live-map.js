#!/usr/bin/env node
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const checks=[
 ['live map engine branch',/PISTE_TERRAIN_ENGINE_MODE==='legacy'[^\n]*liveMap=createPisteMap|PisteTerrainEngine\.createMap\('liveMap'/],
 ['live trace adapter',/PisteTerrainEngine\.setTrace\('liveMap','live-trace'/],
 ['live marker adapter',/PisteTerrainEngine\.createMarker\('liveMap','live-markers'/],
 ['recenter remains',/function recenterLiveMap\(/],
 ['gps remains local',/function updateLivePosition\(/],
 ['legacy fallback preserved',/PISTE_TERRAIN_ENGINE_MODE==='legacy'/],
 ['no global sync GPS coupling',!/globalLiveSync\.invalidate\([^\n]*(live|gps|trace)/i.test(app)],
];
const failures=checks.filter(([name,test])=>typeof test==='boolean'?!test:!test.test(app));
if(failures.length){console.error('V10.51 live map guard: FAIL');for(const [name] of failures)console.error(`- ${name}`);process.exit(1)}
console.log('V10.51 live map guard: PASS');
