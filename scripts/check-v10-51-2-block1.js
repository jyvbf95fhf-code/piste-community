#!/usr/bin/env node
const fs=require('fs');
const {execFileSync}=require('child_process');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('v2.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const base=execFileSync('git',['show','7965edbff015b144701bc078242fb16d6b4a5510:app.js'],{encoding:'utf8'});
let failed=0;const check=(label,ok)=>{console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failed++};
check('dedicated branch',execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()==='feature/v10-51-2-gps-permissions-v2');
check('stable base',(()=>{try{execFileSync('git',['merge-base','--is-ancestor','7965edbff015b144701bc078242fb16d6b4a5510','HEAD']);return true}catch{return false}})());
check('permission helper declared',/gpsPermission/.test(app)&&/async getState\(\)/.test(app));
check('Permissions API feature detected and protected',/navigator\.permissions/.test(app)&&/typeof permissions\.query!=='function'/.test(app)&&/try\{/.test(app));
check('no global GPS initialization',!/(GPS_STALE_AFTER_MS|gpsDiagnostics|gpsManager|safeResume)/.test(app+html));
check('watch registry declared',/gpsWatchRegistry/.test(app)&&/start\(/.test(app)&&/stop\(/.test(app)&&/has\(/.test(app));
check('single watcher guard',/const existing=watches\.get\(context\)/.test(app)&&/existing&&existing\.sessionId===sessionId/.test(app));
check('idempotent clearWatch',/clearWatch\(existing\.id\)/.test(app)&&/delete\(context\)/.test(app));
check('presence remains membership based',/coaching_members/.test(app));
check('no GPS diagnostic/touch additions',!html.includes('gpsDiagnostics')&&!css.includes('gps-touch-ui'));
for(const marker of ['signInWithPassword','onAuthStateChange','createClient','function boot']){
 const current=app.split('\n').find(line=>line.includes(marker));
 const expected=base.split('\n').find(line=>line.includes(marker));
 check(`Auth/boot unchanged: ${marker}`,current===expected);
}
check('no SQL files changed',!execFileSync('git',['diff','--name-only','7965edbff015b144701bc078242fb16d6b4a5510','--','*.sql','supabase/**'],{encoding:'utf8'}).trim());
if(failed)process.exit(1);
