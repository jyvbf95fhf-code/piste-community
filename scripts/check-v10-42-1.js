const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const checks=[
 ['version 10.42.1',/const APP_VERSION=['"]10\.42\.1['"]/.test(app)&&/version:'10\.42\.1'/.test(app)],
 ['session terrain active protégée',/function hasActiveTerrainSession\(\)/.test(app)&&/resetGpsUI\(clear=true,\{force=false\}=\{\}\)/.test(app)&&/!force&&hasActiveTerrainSession\(\)/.test(app)],
 ['restoreDraft non destructive',/async function restoreDraft\(\)\{if\(hasActiveTerrainSession\(\)\)/.test(app)&&/redrawLiveRecordingMap\(\);return/.test(app)],
 ['reprise active non destructive',/function resumeActiveSession\(\).*hasActiveTerrainSession\(\).*redrawLiveRecordingMap/s.test(app)],
 ['draft conservé après terminer réseau',/queueRecord\(recordMode,o\);saveDraft\(true\)/.test(app)&&!/queueRecord\(recordMode,o\);[^\n]*clearDraft\(\);resetGpsUI/.test(app)],
 ['GPS avant finalisation conservé',/resetGpsUI\(false,\{force:true\}\)/.test(app)&&/saveLastActivity\(o\);clearDraft\(\)/.test(app)],
 ['Traceur Je pars tracer',/role==='traceur'&&phase==='preparation'.*setUiText\('startLayingBtn','Je pars tracer'\)/s.test(app)&&/startLayingBtn/.test(html)],
 ['démarrage pose RPC',/async function startCoachingLaying\(\).*start_coaching_laying.*startTraceurTracking/s.test(app)],
 ['Piste prête uniquement après pose',/role==='traceur'&&phase==='laying'.*setUiText\('trackReadyBtn','Piste prête'\)/s.test(app)],
 ['Conducteur transitions',/driverStartBtn/.test(app)&&/waiting_ready.*coach_ready/.test(app)&&/start_driver_run/.test(app)&&/finish_driver_run/.test(app)],
 ['phase realtime réévaluée',/const nextPhase=coachingPhase\(activeCoachingSession\).*nextPhase!==previousPhase/s.test(app)],
 ['GPS trace points',/coaching_trace_points/.test(app)&&/navigator\.geolocation\.watchPosition/.test(app)],
 ['PWA cache incrémenté',/piste-community-v2098/.test(sw)&&/app\.js\?v=1042-10/.test(sw+html)&&/skipWaiting\(\)/.test(sw)&&/clients\.claim\(\)/.test(sw)]
];
let ok=true;for(const [label,pass] of checks){console.log(`${pass?'✓':'✗'} ${label}`);if(!pass)ok=false}
if(!ok)process.exit(1);console.log('\nV10.42.1 — contrôles Coaching et protection anti-perte terminés.');
