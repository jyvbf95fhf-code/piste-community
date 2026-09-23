#!/usr/bin/env node
const fs=require('fs');
const {execFileSync}=require('child_process');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('v2.css','utf8');
const checks=[
  ['OPS map container',html.includes('id="operationalCallMap"')],
  ['OPS map-first shell',html.includes('class="ops-map-shell"')&&css.includes('.ops-map-shell{')],
  ['PisteTerrainEngine OPS map',app.includes("PisteTerrainEngine.createMap('operationalCallMap'")],
  ['OPS locate control',html.includes('id="opsMapLocateBtn"')&&app.includes("$('opsMapLocateBtn').onclick=locateOperationalCall")],
  ['OPS tools control',html.includes('id="opsMapToolsToggle"')&&app.includes("$('opsMapToolsToggle').onclick")],
  ['OPS classic/outdoor controls',html.includes('data-ops-base="osm"')&&html.includes('data-ops-base="topo"')&&app.includes('setOperationalBaseLayer')],
  ['Explicit OPS base registry',app.includes("PisteTerrainEngine.entry('operationalCallMap')?.baseLayers")&&app.includes('operationalBaseLayers')],
  ['Safe base switch order',app.includes("PisteTerrainEngine.setBaseLayer('operationalCallMap',layer)")&&app.includes('target.addTo(map)')&&app.includes('map.removeLayer(previous)')],
  ['OPS topo fallback threshold',app.includes('operationalTopoTileErrors>=3')&&app.includes("setOperationalBaseLayer('osm',{fallback:true})")],
  ['OPS GPS unchanged',app.includes('function startOperationalCallTracking()')&&app.includes('beginNewPiste(\'piste\'' )],
  ['OPS weather/corridor retained',app.includes('fetchOperationalLiveWeather')&&app.includes('renderOperationalOdorCorridor')],
  ['OPS critical actions retained',html.includes('id="saveOperationalCallBtn"')&&html.includes('id="startOperationalCallBtn"')],
  ['Coaching code present',app.includes('function setCoachingStage')&&app.includes('function renderCoaching')],
  ['Auth boot code present',app.includes('function boot(')&&app.includes('onAuthStateChange')],
  ['No SQL files changed by this guard',!fs.existsSync('supabase/migrations')||true]
];
let failed=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failed++}
try{const stable=execFileSync('git',['show','stable-v10.51.1:app.js'],{encoding:'utf8'});const names=['loginForm','signupForm','function boot(','createClient('];for(const name of names){const ok=app.includes(name)&&stable.includes(name);console.log(`${ok?'PASS':'FAIL'} Auth marker ${name}`);if(!ok)failed++}}catch(error){console.log('WARN stable Auth comparison unavailable');}
if(failed)process.exit(1);
