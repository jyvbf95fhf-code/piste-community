#!/usr/bin/env node
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const engine=app.slice(app.indexOf('const PisteTerrainEngine='),app.indexOf('function terrainDebugRefresh'));
const checks=[
  ['engine exists',engine.includes('const PisteTerrainEngine=' )],
  ['engine has no role rules',!/activeCoachingSession|myCoachingRole|doubleBlind|blind_mode/.test(engine)],
  ['coaching map engine is behind explicit mode gate',/PISTE_TERRAIN_ENGINE_MODE==='legacy'\?createPisteMap\('coachingMap'[^;]+:PisteTerrainEngine\.createMap\('coachingMap'/.test(app)],
  ['global sync remains present',app.includes('globalLiveSync')],
  ['planner mode is preview/dev gated',app.includes("PISTE_TERRAIN_ENGINE_MODE=TERRAIN_ENGINE_PREVIEW_OR_DEV")],
];
const failures=checks.filter(([,ok])=>!ok);
if(failures.length){console.error('V10.51 map permissions guard: FAIL');for(const [name] of failures)console.error(`- ${name}`);process.exit(1)}
console.log('V10.51 map permissions guard: PASS');
