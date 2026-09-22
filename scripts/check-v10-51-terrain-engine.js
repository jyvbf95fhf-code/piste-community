#!/usr/bin/env node
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('v2.css','utf8');
const checks=[
  ['engine mode flag',/PISTE_TERRAIN_ENGINE_MODE/],
  ['engine object',/PisteTerrainEngine/],
  ['createMap API',/createMap\s*\(/],
  ['destroyMap API',/destroyMap\s*\(/],
  ['base layer API',/setBaseLayer\s*\(/],
  ['trace API',/setTrace\s*\(/],
  ['marker API',/setMarkers\s*\(/],
  ['viewport API',/fitTrack\s*\(/],
  ['planner adapter',/PisteTerrainEngine\.(createMap|createPlannerMap)/],
  ['legacy fallback',/PISTE_TERRAIN_ENGINE_MODE\s*===\s*['"]legacy['"]/],
  ['debug copy',/terrainDebugCopy|Copier.*diagnostic|terrain-debug/],
  ['coaching migration is explicit and engine-gated',/PISTE_TERRAIN_ENGINE_MODE==='legacy'\?createPisteMap\('coachingMap'[^;]+:PisteTerrainEngine\.createMap\('coachingMap'/],
  ['planner map remains available',/plannerMap/],
  ['map debug styles',/terrain-debug/],
  ['debug panel markup or dynamic hook',/terrainDebug|terrain-debug/],
];
const haystack=`${app}\n${html}\n${css}`;
const failures=checks.filter(([,re])=>!re.test(haystack));
if(failures.length){console.error('V10.51 terrain engine guard: FAIL');for(const [name] of failures)console.error(`- ${name}`);process.exit(1)}
console.log('V10.51 terrain engine guard: PASS');
