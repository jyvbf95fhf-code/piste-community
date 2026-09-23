#!/usr/bin/env node
const fs=require('fs');const cp=require('child_process');
const app=fs.readFileSync('app.js','utf8');const html=fs.readFileSync('index.html','utf8');
const base=cp.execFileSync('git',['show','af89aea:app.js'],{encoding:'utf8'});
const section=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);return a>=0&&b>=0?source.slice(a,b):''};
const checks=[
 ['planner odor shortcut present',html.includes('id="plannerOdorToggle"')&&html.includes('Couloir olfactif')],
 ['planner odor toggle function',app.includes('function togglePlannerOdorCorridor')],
 ['fresh weather reuses cache',app.includes('plannerWeatherIsFresh')&&app.includes('plannerWeatherAvailable')],
 ['weather fetch is deduplicated',app.includes('plannerWeatherFetchInFlight')&&app.includes('return plannerWeatherFetchInFlight')],
 ['odor activation loads weather',app.includes('togglePlannerOdorCorridor')&&app.includes('loadPlannerWeather()')],
 ['preview only after usable weather',app.includes('weather unavailable')||app.includes('Météo indisponible')],
 ['odor contrast remains translucent',app.includes("fillOpacity:.085")&&app.includes("fillOpacity:.17")&&app.includes("weight:1.4")],
 ['weather refresh time is shown',app.includes('Météo actualisée à')&&app.includes('fetched_at')],
 ['planner options accordion toggles',app.includes('function togglePlannerControls')&&app.includes("plannerControlsToggle').onclick=togglePlannerControls")],
 ['planner options use one controlled panel',html.includes('id="plannerOptionsPanel"')&&app.includes("$('plannerOptionsPanel')")&&app.includes("panel.classList.toggle('hidden'")],
 ['planner panel preserves content handlers',html.includes('id="routeName"')&&html.includes('id="saveTrainingRoute"')&&html.includes('id="plannerOptionsPanel"')],
 ['planner options aria follows state',app.includes("setAttribute('aria-expanded',String(open))")],
 ['no polling added',!app.includes('setInterval(loadPlannerWeather')&&!app.includes('setInterval(togglePlannerOdorCorridor')],
 ['Auth initializer unchanged from Bloc 3',()=>section(app,'async function initializeAuthenticatedApp','async function runSafeBootStage')===section(base,'async function initializeAuthenticatedApp','async function runSafeBootStage')],
 ['login/signup unchanged from Bloc 3',()=>section(app,"$('loginForm').onsubmit", "supabase.auth.onAuthStateChange")===section(base,"$('loginForm').onsubmit", "supabase.auth.onAuthStateChange")],
 ['auth listener unchanged from Bloc 3',()=>section(app,'async function boot()','async function refreshMine')===section(base,'async function boot()','async function refreshMine')]
];
let failed=0;for(const [name,test] of checks){const ok=typeof test==='function'?test():test;console.log(`${ok?'✓':'✗'} ${name}`);if(!ok)failed++}if(failed){console.error(`clean Block 4 guard: FAIL (${failed})`);process.exit(1)}console.log('V10.51.1 clean Block 4 guard: PASS');
