const fs=require('fs');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const checks=[
 ['version 10.42.2 et release note',/const APP_VERSION=['"]10\.42\.2['"]/.test(app)&&/version:'10\.42\.2'/.test(app)&&/Coach trace lui-même/.test(app)],
 ['poseur effectif centralisé',/function isCurrentUserLayingActor\(s=activeCoachingSession\)/.test(app)&&/role==='traceur'&&s\.laying_mode==='traceur'/.test(app)&&/isCoachingOwner\(s\)&&role==='coach'&&s\.laying_mode==='coach'/.test(app)],
 ['poseur coach préparation',/v1040&&layingActor&&phase==='preparation'.*startLayingBtn/s.test(app)&&/Je pars tracer/.test(app)],
 ['poseur pose en cours',/v1040&&layingActor&&phase==='laying'.*trackReadyBtn/s.test(app)&&/Piste prête/.test(app)],
 ['GPS pose poseur effectif',/startTraceurTracking\(\).*isCurrentUserLayingActor\(s\).*coachingPhase\(s\)==='laying'.*s\.status==='live'/s.test(app)&&/coaching_trace_points/.test(app)],
 ['conducteur attente explicite',/En attente : le Coach prépare la piste/.test(app)&&/Pose de la piste en cours/.test(app)&&/La piste est prête/.test(app)],
 ['conducteur départ et fin',/driverStartBtn/.test(app)&&/start_driver_run/.test(app)&&/driverFinishBtn/.test(app)&&/finish_driver_run/.test(app)],
 ['realtime phases',/const nextPhase=coachingPhase\(activeCoachingSession\)/.test(app)&&/updateCoachingPrimaryActions\(\)/.test(app)&&/renderCoachingMap\(\)/.test(app)],
 ['modes aveugles conservés',/simple_blind/.test(app)&&/full_blind/.test(app)&&/coachingDbVisibility/.test(app)],
 ['cache v2099 assets',/piste-community-v2099/.test(sw)&&/app\.js\?v=1042-11/.test(sw+html)&&/v2\.css\?v=2067/.test(sw)],
 ['anti perte OPS conservée',/function hasActiveTerrainSession/.test(app)&&/resetGpsUI\(clear=true,\{force=false\}=\{\}\)/.test(app)&&/restoreDraft\(\).*hasActiveTerrainSession/s.test(app)]
];
let ok=true;for(const [label,pass] of checks){console.log(`${pass?'✓':'✗'} ${label}`);if(!pass)ok=false}if(!ok)process.exit(1);console.log('\nV10.42.2 — contrôles Coach-poseur et attente Conducteur terminés.');
