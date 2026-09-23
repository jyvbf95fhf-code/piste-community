#!/usr/bin/env node
const fs=require('fs');const cp=require('child_process');
const app=fs.readFileSync('app.js','utf8');const html=fs.readFileSync('index.html','utf8');const css=fs.readFileSync('v2.css','utf8');
const stable=cp.execFileSync('git',['show','HEAD~0:app.js'],{encoding:'utf8'});
const section=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);return a>=0&&b>=0?source.slice(a,b):''};
const checks=[
 ['D/A endpoint marker logic',()=>app.includes("endpoint=i===0?'D':i===plannerPoints.length-1?'A'")],
 ['A follows last point',/i===plannerPoints\.length-1\?'A'/],
 ['intermediate points debug-only',/PLANNER_INTERMEDIATE_POINTS_VISIBLE/],
 ['intermediate data remains in plannerPoints',/plannerPoints\.map\(\(_,i\)=>i\)/],
 ['premium endpoint styles',()=>css.includes('planner-endpoint-start')&&css.includes('planner-endpoint-arrival')],
 ['olive planner accent',/\.planner-location-row button\.active\{background:#9fbd65/],
 ['Quitter tab',/data-coaching-tab="quit"/],
 ['Quitter panel',/data-coaching-panel="quit"/],
 ['destructive action IDs unique',()=>['cancelCoachingWaiting','deleteCoachingWaiting','cancelCoachingSession','deleteCoachingSession'].every(id=>(html.match(new RegExp(`id="${id}"`,'g'))||[]).length===1)],
 ['destructive actions in Quitter',/data-coaching-panel="quit"[\s\S]*cancelCoachingWaiting[\s\S]*deleteCoachingWaiting[\s\S]*cancelCoachingSession[\s\S]*deleteCoachingSession/],
 ['session panel excludes cancel/delete',()=>{const m=html.match(/data-coaching-panel="session"[\s\S]*?<div class="coaching-tab-panel" data-coaching-panel="quit"/);return !!m&&!/cancelCoaching|deleteCoaching/.test(m[0])}],
 ['Auth initializer unchanged from stable',()=>section(app,'async function initializeAuthenticatedApp','async function runSafeBootStage')===section(cp.execFileSync('git',['show','stable-v10.51:app.js'],{encoding:'utf8'}),'async function initializeAuthenticatedApp','async function runSafeBootStage')],
 ['login/signup unchanged from stable',()=>section(app,"$('loginForm').onsubmit", "supabase.auth.onAuthStateChange")===section(cp.execFileSync('git',['show','stable-v10.51:app.js'],{encoding:'utf8'}),"$('loginForm').onsubmit", "supabase.auth.onAuthStateChange")],
 ['auth listener unchanged from stable',()=>section(app,'async function boot()','async function refreshMine')===section(cp.execFileSync('git',['show','stable-v10.51:app.js'],{encoding:'utf8'}),'async function boot()','async function refreshMine')]
];
let failed=0;for(const [name,test] of checks){let ok=typeof test==='function'?test():test.test(app+html+css);console.log(`${ok?'✓':'✗'} ${name}`);if(!ok)failed++}if(failed){console.error(`clean Block 2 guard: FAIL (${failed})`);process.exit(1)}console.log('V10.51.1 clean Block 2 guard: PASS');
