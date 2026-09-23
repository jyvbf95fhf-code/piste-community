#!/usr/bin/env node
const fs=require('fs');const cp=require('child_process');
const app=fs.readFileSync('app.js','utf8');const html=fs.readFileSync('index.html','utf8');const css=fs.readFileSync('v2.css','utf8');
const base=cp.execFileSync('git',['show','70e5829:app.js'],{encoding:'utf8'});
const section=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);return a>=0&&b>=0?source.slice(a,b):''};
const checks=[
 ['map-first shell',html.includes('class="planner-map-shell"')&&html.includes('planner-map-quickbar')&&html.includes('plannerBottomSheet')],
 ['immersive mobile height',css.includes('height:82svh;height:82dvh')],
 ['address search overlay',html.includes('id="plannerSearchInput"')&&html.includes('planner-search-quick')],
 ['debounced cancellable Nominatim',app.includes('plannerSearchController?.abort()')&&app.includes('plannerSearchTimer')&&app.includes('q.length<2')],
 ['search preserves trace and closes keyboard',app.includes("plannerSearchInput').blur()")&&app.includes('plannerSearchSelected=true')],
 ['localize control',html.includes('id="locatePlannerBtn"')&&html.includes('aria-label="Me localiser"')],
 ['direct mode reuses existing watch',html.includes('id="plannerDirectBtn"')&&app.includes("plannerDirectBtn')?.classList.add('active')")&&app.includes('navigator.geolocation.watchPosition(appendPlannerGpsPoint')],
 ['compact tools control',html.includes('id="plannerAdvancedToggle"')&&html.includes('plannerToolsPanel')],
 ['base choices in tools',html.includes('id="plannerBaseClassic"')&&html.includes('id="plannerBaseOutdoor"')&&app.includes('function setPlannerBaseLayer')],
 ['base layer candidates retained for planner switching',app.includes('map._pisteBaseLayers')&&app.includes('setPlannerBaseLayer')],
 ['base menu handlers call existing switch',app.includes("plannerBaseClassic').onclick=()=>setPlannerBaseLayer('classic')")&&app.includes("plannerBaseOutdoor').onclick=()=>setPlannerBaseLayer('outdoor')")],
 ['planner Leaflet layer control removed',app.includes("showLayerControl:id!=='plannerMap'")&&app.includes("showLayerControl:false")&&css.includes('.planner-map-shell .leaflet-control-layers{display:none}')],
 ['distance badge',html.includes('id="plannerFloatingDistance"')&&app.includes("plannerFloatingDistance")],
 ['Auth initializer unchanged from Bloc 2',()=>section(app,'async function initializeAuthenticatedApp','async function runSafeBootStage')===section(base,'async function initializeAuthenticatedApp','async function runSafeBootStage')],
 ['login/signup unchanged from Bloc 2',()=>section(app,"$('loginForm').onsubmit", "supabase.auth.onAuthStateChange")===section(base,"$('loginForm').onsubmit", "supabase.auth.onAuthStateChange")],
 ['auth listener unchanged from Bloc 2',()=>section(app,'async function boot()','async function refreshMine')===section(base,'async function boot()','async function refreshMine')]
];
let failed=0;for(const [name,test] of checks){const ok=typeof test==='function'?test():test;console.log(`${ok?'✓':'✗'} ${name}`);if(!ok)failed++}if(failed){console.error(`clean Block 3 guard: FAIL (${failed})`);process.exit(1)}console.log('V10.51.1 clean Block 3 guard: PASS');
