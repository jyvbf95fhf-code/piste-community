#!/usr/bin/env node
const fs=require('fs');const cp=require('child_process');
const app=fs.readFileSync('app.js','utf8');
const base=cp.execFileSync('git',['show','9ff61f0:app.js'],{encoding:'utf8'});
const section=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);return a>=0&&b>=0?source.slice(a,b):''};
const checks=[
 ['explicit planner base registry',app.includes('plannerBaseLayers')&&app.includes('osm')&&app.includes('topo')],
 ['planner switch avoids private layer scan',app.includes('setPlannerBaseLayer')&&!app.includes('Object.values(map._layers||{}).filter(x=>x instanceof L.TileLayer)')],
 ['target added before previous removed',app.includes('target.addTo(map)')&&app.includes('map.removeLayer(previous)')],
 ['viewport preserved during switch',app.includes('getCenter()')&&app.includes('getZoom()')],
 ['invalidate after switch',app.includes('invalidateSize()')],
 ['topo consecutive error threshold',app.includes('plannerTopoTileErrors')&&app.includes('>=3')],
 ['fallback returns to osm',app.includes('fallbackToOsm')&&app.includes("setPlannerBaseLayer('classic')")],
 ['UI realigned after fallback',app.includes("plannerBaseClassic')?.classList.toggle('active'")&&app.includes("plannerBaseOutdoor')?.classList.toggle('active'")],
 ['Auth initializer unchanged from Bloc 4',()=>section(app,'async function initializeAuthenticatedApp','async function runSafeBootStage')===section(base,'async function initializeAuthenticatedApp','async function runSafeBootStage')],
 ['login/signup unchanged from Bloc 4',()=>section(app,"$('loginForm').onsubmit", "supabase.auth.onAuthStateChange")===section(base,"$('loginForm').onsubmit", "supabase.auth.onAuthStateChange")],
 ['auth listener unchanged from Bloc 4',()=>section(app,'async function boot()','async function refreshMine')===section(base,'async function boot()','async function refreshMine')]
];
let failed=0;for(const [name,test] of checks){const ok=typeof test==='function'?test():test;console.log(`${ok?'✓':'✗'} ${name}`);if(!ok)failed++}if(failed){console.error(`clean Block 5 guard: FAIL (${failed})`);process.exit(1)}console.log('V10.51.1 clean Block 5 guard: PASS');
