#!/usr/bin/env node
const fs=require('fs');const cp=require('child_process');
const app=fs.readFileSync('app.js','utf8');const html=fs.readFileSync('index.html','utf8');
function ok(value,message){if(!value)throw new Error(`FAIL: ${message}`);console.log(`PASS: ${message}`)}
ok(app.includes("let plannerRoutingMode='street'"),'Rues is the planner default');
ok(app.includes("draft.routing_mode||'street'"),'draft fallback uses Rues');
ok(html.includes('id="routingStreetBtn" class="active"'),'Rues control is selected in the initial markup');
ok(html.includes('id="routingTrailBtn"')&&html.includes('id="routingFreeBtn"'),'Chemins and Libre remain available');
const stable=cp.execFileSync('git',['show','stable-v10.51:app.js'],{encoding:'utf8'});
const section=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);return a>=0&&b>=0?source.slice(a,b):''};
ok(section(app,'async function initializeAuthenticatedApp','async function runSafeBootStage')===section(stable,'async function initializeAuthenticatedApp','async function runSafeBootStage'),'authenticated initializer unchanged from stable');
ok(section(app,"$('loginForm').onsubmit", "supabase.auth.onAuthStateChange")===section(stable,"$('loginForm').onsubmit", "supabase.auth.onAuthStateChange"),'login/signup flow unchanged from stable');
ok(section(app,'async function boot()','async function refreshMine')===section(stable,'async function boot()','async function refreshMine'),'auth listener and boot wiring unchanged from stable');
console.log('V10.51.1 clean Block 1 guard: PASS');
