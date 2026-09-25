#!/usr/bin/env node
const fs=require('fs');
const {execFileSync}=require('child_process');
const app=fs.readFileSync('app.js','utf8');
const base=execFileSync('git',['show','7965edbff015b144701bc078242fb16d6b4a5510:app.js'],{encoding:'utf8'});
let failed=0;const check=(label,ok)=>{console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failed++};
check('dedicated branch',execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()==='feature/v10-51-2-gps-permissions-v2');
check('Bloc 1 base present',(()=>{try{execFileSync('git',['merge-base','--is-ancestor','6220ce9065bd99d1f25075e105e358710fe124ef','HEAD']);return true}catch{return false}})());
check('session-aware watcher registry',/sessionId=null/.test(app)&&/existing\.sessionId===sessionId/.test(app)&&/const session=context=>/.test(app));
check('different session replaces old watcher',/if\(existing\)stop\(context\)/.test(app)&&/watches\.set\(context,\{id,sessionId\}\)/.test(app));
check('coaching preview watcher carries session id',/gpsWatchRegistry\.start\('coaching_preview'[\s\S]*?timeout:15000\},id\)/.test(app));
check('coaching presence watcher carries session id',/gpsWatchRegistry\.start\('coaching_presence',[\s\S]{0,260}?trackedSessionId/.test(app));
check('traceur watcher carries session id',/gpsWatchRegistry\.start\('coaching_traceur',[\s\S]{0,260}?s\.id/.test(app));
check('coaching cleanup stops all GPS contexts',/function resetCoachingGpsTransientState\(\)[\s\S]*?stopMany\(\['coaching_presence','coaching_traceur','coaching_preview'\]\)/.test(app));
check('coaching cleanup clears transient position/error state',/function resetCoachingGpsTransientState\(\)[\s\S]*?coachingOwnPosition=null[\s\S]*?coachingPreviewPosition=null[\s\S]*?coachingLastPointAt=0[\s\S]*?coachingGpsReady=false[\s\S]*?coachingGpsError=''/ .test(app));
check('new coaching session resets transient GPS state',/async function openCoachingSession\([\s\S]*?clearCoachingRealtime\(\);resetCoachingGpsTransientState\(\)/.test(app));
check('OPS reset stops watcher',/function resetGpsUI\([\s\S]*?gpsWatchRegistry\.stop\('ops'\)/.test(app));
check('Planner exit stops watcher',/if\(id==='plannerPage'\)[\s\S]*?else stopPlannerFollow\(\)/.test(app));
check('no lifecycle/watchdog/stale/diagnostic additions',!/(GPS_STALE_AFTER_MS|gpsDiagnostics|installGpsLifecycle|gpsWatchdog)/.test(app));
for(const marker of ['signInWithPassword','onAuthStateChange','createClient','function boot']){
 const current=app.split('\n').find(line=>line.includes(marker));
 const expected=base.split('\n').find(line=>line.includes(marker));
 check(`Auth/boot unchanged: ${marker}`,current===expected);
}
check('no SQL files changed',!execFileSync('git',['diff','--name-only','7965edbff015b144701bc078242fb16d6b4a5510','--','*.sql','supabase/**'],{encoding:'utf8'}).trim());
if(failed)process.exit(1);
