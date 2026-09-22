#!/usr/bin/env node
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const checks=[
 ['operational map has engine branch',/PISTE_TERRAIN_ENGINE_MODE==='legacy'\?createPisteMap\('operationalCallMap'[^;]+:PisteTerrainEngine\.createMap\('operationalCallMap'/],
 ['ops layers registered with engine',/PisteTerrainEngine\.registerLayers\('operationalCallMap','ops-layers',operationalCallLayers\)/],
 ['ops layers cleared before render',/PisteTerrainEngine\.clearLayer\('operationalCallMap','ops-layers'\)/],
 ['Nominatim geocoding preserved',/nominatim\.openstreetmap\.org\/search/],
 ['Nominatim reverse preserved',/nominatim\.openstreetmap\.org\/reverse/],
 ['Overpass analysis preserved',/overpass-api\.de\/api\/interpreter/],
 ['no global sync coupling',app=>!(/refreshMine\(\).*operationalCall|loadCoachingHub\(\).*operationalCall/.test(app))]
];
let failed=0;for(const [name,re] of checks){const ok=typeof re==='function'?re(app):re.test(app);console.log(`${ok?'✓':'✗'} ${name}`);if(!ok)failed++}if(failed)process.exit(1);console.log('check-v10-51-ops-map: PASS');
