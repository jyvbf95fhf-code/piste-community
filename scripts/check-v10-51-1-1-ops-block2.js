#!/usr/bin/env node
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('v2.css','utf8');
const checks=[
 ['OPS direct corridor control',html.includes('id="toggleOpsLiveCorridor"')&&app.includes('toggleOperationalCorridorDirect')],
 ['OFF/loading/active/unavailable states',app.includes("off:'🌬️ Couloir olfactif · OFF'")&&app.includes("loading:'🌬️ Chargement météo…'")&&app.includes("active:'🌬️ Couloir actif · estimation'")&&app.includes("unavailable:'🌬️ Météo indisponible'")],
 ['Fresh weather reused',app.includes('operationalWeatherIsFresh()')&&app.includes('restoreOperationalWeatherCache()')&&app.includes('if(restoreOperationalWeatherCache())')],
 ['15 minute freshness',app.includes('15*60*1000')],
 ['Existing OPS weather fetch reused',app.includes('fetchOperationalLiveWeather()')&&app.includes('renderOperationalOdorCorridor()')],
 ['No new polling',!app.includes('setInterval(toggleOperationalCorridorDirect')],
 ['Wind required before corridor',app.includes('Number.isFinite(Number(operationalLiveWeather.wind_speed_kmh))')&&app.includes('Number.isFinite(Number(operationalLiveWeather.wind_direction_deg))')],
 ['Temperature step accepts tenths',html.includes('name="temperature_c"')&&html.includes('step="0.1" min="-30" max="50"')],
 ['Temperature not integer-rounded before save',!app.includes('parseInt(form.elements.temperature_c')&&!app.includes('Math.round(form.elements.temperature_c')],
 ['Other weather fields retained',html.includes('name="meteo"')&&html.includes('name="vent"')&&html.includes('name="humidite"')],
 ['OPS overlays retained',app.includes('operationalTrackReference()')&&app.includes('operationalWeatherOdorLayers')],
 ['Coaching markers retained',app.includes('function setCoachingStage')&&app.includes('function renderCoaching')]
];
let failed=0;
for(const [label,ok] of checks){console.log((ok?'PASS ':'FAIL ')+label);if(!ok)failed++}
if(failed)process.exit(1);
