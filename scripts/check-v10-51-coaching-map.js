#!/usr/bin/env node
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const checks=[
 ['coaching engine branch',/PISTE_TERRAIN_ENGINE_MODE==='legacy'\?createPisteMap\('coachingMap'[^;]+:PisteTerrainEngine\.createMap\('coachingMap'/],
 ['coaching layers registered',/PisteTerrainEngine\.registerLayers\('coachingMap','coaching-layers',coachingLayers\)/],
 ['coaching layers cleared',/PisteTerrainEngine\.clearLayer\('coachingMap','coaching-layers'\)/],
 ['visibility remains upstream of fetch',/const member=myCoachingMember\(activeCoachingSession\).*coachingDataVisibility\(activeCoachingSession\)/s],
 ['participant pane preserved',/ensureCoachingParticipantPane\(\)/],
 ['coaching GPS maps remain targeted',/renderCoachingMap\(\{preserveViewport:true\}\)/],
 ['blind visibility guard preserved',/coachingCanSeeLiveOwner\(activeCoachingSession,p\.owner_id\)/]
];
let failed=0;for(const [name,re] of checks){const ok=re.test(app);console.log(`${ok?'✓':'✗'} ${name}`);if(!ok)failed++}if(failed)process.exit(1);console.log('check-v10-51-coaching-map: PASS');
