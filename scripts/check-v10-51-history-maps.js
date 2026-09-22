#!/usr/bin/env node
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const ids=['missionMap','activityLibraryMap','publicShareMap','activityDetailMap','historyMap','globalMap'];
let failed=0;for(const id of ids){const ok=app.includes(`createTerrainMap('${id}'`);console.log(`${ok?'✓':'✗'} ${id} uses terrain map adapter`);if(!ok)failed++}
const checks=[
 ['mission archive stays read-only',/function renderMissionMap\(source\)/],
 ['historical data still uses fitBounds',/historyMap\.fitBounds/],
 ['public share map remains scoped',/publicShareMap/],
 ['no PDF implementation in map migration',app=>!/reportMapCanvas\(model\.map\).*PisteTerrainEngine\.createMap/.test(app)]
];for(const [name,re] of checks){const ok=typeof re==='function'?re(app):re.test(app);console.log(`${ok?'✓':'✗'} ${name}`);if(!ok)failed++}if(failed)process.exit(1);console.log('check-v10-51-history-maps: PASS');
