#!/usr/bin/env node
const fs=require('fs');
const {execFileSync}=require('child_process');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('v2.css','utf8');
const checks=[
 ['Coaching map container',html.includes('id=\"coachingMap\"')&&html.includes('coaching-map-shell')],
 ['Shared terrain engine',app.includes("PisteTerrainEngine.createMap('coachingMap'")],
 ['Compact Coaching map tools',html.includes('id=\"coachingMapToolsToggle\"')&&html.includes('id=\"coachingMapToolsPanel\"')],
 ['Classic and Outdoor controls',html.includes('data-coaching-base=\"osm\"')&&html.includes('data-coaching-base=\"topo\"')&&app.includes('setCoachingBaseLayer')],
 ['Safe base switch and viewport preservation',app.includes("PisteTerrainEngine.setBaseLayer('coachingMap',layer)")&&app.includes('target.addTo(map)')&&app.includes('map.invalidateSize()')&&app.includes('map.setView(center,zoom')],
 ['Topo fallback after three errors',app.includes('coachingTopoTileErrors>=3')&&app.includes("setCoachingBaseLayer('osm',{fallback:true})")],
 ['Map-first responsive layout',css.includes('coaching-map-tools-toggle')&&css.includes('76dvh')&&css.includes('coaching-map-shell:not(.fullscreen) #coachingMap')],
 ['Critical command surface retained',html.includes('id=\"coachingTerrainCommandBar\"')&&html.includes('id=\"coachingPrimaryActions\"')&&html.includes('id=\"coachReadyBtn\"')&&html.includes('id=\"traceurInPlaceBtn\"')&&html.includes('id=\"driverStartBtn\"')],
 ['Phase and message controls retained',html.includes('id=\"coachingPhase\"')&&html.includes('id=\"coachingMessageInput\"')&&html.includes('id=\"terrainFinishBtn\"')],
 ['Coaching role/state functions retained',app.includes('function myCoachingRole')&&app.includes('function coachingBlindMode')&&app.includes('function setCoachingStage')&&app.includes('function renderCoachingMap')],
 ['Realtime/GPS/messages retained',app.includes('coachingChannel=')&&app.includes('toggleCoachingGpsTracking')&&app.includes('sendCoachingMessage')],
 ['Auth/boot markers retained',app.includes('function boot(')&&app.includes('onAuthStateChange')&&app.includes('createClient(')],
 ['Planner and OPS markers retained',app.includes("PisteTerrainEngine.createMap('plannerMap'")&&app.includes("PisteTerrainEngine.createMap('operationalCallMap'")]
];
let failed=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failed++}
try{const base=execFileSync('git',['show','29d937ff5d794ba54eecc5ec693fa5048957b5e5:app.js'],{encoding:'utf8'});for(const bad of ['supabase.rpc(','supabase.from(','createClient(','onAuthStateChange']){const count=text=>text.split(bad).length-1,added=count(app)>count(base);if(added){console.log(`FAIL Added sensitive call ${bad}`);failed++}else console.log(`PASS No added sensitive call ${bad}`)}}catch(error){console.log('WARN diff comparison unavailable')}
process.exitCode=failed?1:0;
