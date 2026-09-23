#!/usr/bin/env node
const fs=require('fs');
const {execFileSync}=require('child_process');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('v2.css','utf8');
let failed=0;
function check(label,ok){console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failed++}
check('feature branch',execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()==='feature/v10-51-1-2-guided-debrief');
check('base release present',execFileSync('git',['show','29d937ff5d794ba54eecc5ec693fa5048957b5e5:app.js'],{encoding:'utf8'}).length>0);
check('guided debrief stage',html.includes('id="coachingDebriefStage"')&&html.includes('id="coachingDebriefStepper"'));
check('three steps',html.includes('data-coaching-debrief-step="summary"')&&html.includes('data-coaching-debrief-step="map"')&&html.includes('data-coaching-debrief-step="observations"'));
check('previous next navigation',app.includes('data-debrief-next')&&app.includes('data-debrief-prev')&&app.includes('setCoachingDebriefStep'));
check('summary keeps existing metrics renderer',html.includes('id="coachingAutoDebrief"')&&app.includes('renderAutoDebrief(coachingAutoMetrics'));
check('existing statistics labels retained',app.includes('Indice de concordance')&&app.includes('Distance Traceur')&&app.includes('Distance Conducteur')&&app.includes('Écart moyen')&&app.includes('Écart maximal')&&app.includes('objets approchés')&&app.includes('pertes annotées')&&app.includes('reprises annotées'));
check('map analysis view',html.includes('id="coachingDebriefStepMap"')&&html.includes('Carte &amp; analyse')&&html.includes('coachingDebriefOverlayLegend'));
check('existing map overlay reused',app.includes('renderDebriefOverlay(data')&&app.includes('coachingLayerVisibility.odor')&&app.includes('addLiveOdorCorridor'));
check('no fictitious odor metric',app.includes('sans pourcentage d’odeur')&&html.includes('Couloir estimé'));
check('existing observations reused',html.includes('id="coachingParticipantObservations"')&&app.includes('renderParticipantObservations')&&app.includes('submitParticipantObservation'));
check('existing closure reused',html.includes('id="coachingDebriefClosure"')&&app.includes('closeCoachingDebrief')&&app.includes('submitCoachingDebriefClosure'));
check('completion screen and home return',html.includes('id="coachingDebriefComplete"')&&html.includes('id="coachingDebriefReturnHome"')&&app.includes('showCoachingDebriefComplete')&&app.includes('completeCoachingDebriefReturnHome'));
check('historical access path retained',app.includes('loadHistoricalCoachingSessions')&&app.includes('coachingHistoricalAccess')&&app.includes("openCoachingDebriefOnce(id"));
check('existing role/state functions retained',app.includes('function myCoachingRole')&&app.includes('function coachingBlindMode')&&app.includes('function coachingGlobalPhase')&&app.includes('finishCoachingSessionV1040'));
check('map provider retained',app.includes("PisteTerrainEngine.createMap('coachingMap'")&&app.includes('setCoachingBaseLayer'));
check('mobile guided styles',css.includes('.coaching-debrief-stepper')&&css.includes('safe-area-inset-bottom')&&css.includes('guided-debrief-map-expanded'));
check('no new polling',!app.includes('setInterval(setCoachingDebriefStep')&&!app.includes('setInterval(coachingDebrief'));
check('no SQL files changed',execFileSync('git',['diff','--name-only','29d937ff5d794ba54eecc5ec693fa5048957b5e5','HEAD'],{encoding:'utf8'}).split('\n').filter(Boolean).every(file=>!/(^|\/)(supabase|.*\.sql)(\/|$)/.test(file)));
try{
 const base=execFileSync('git',['show','29d937ff5d794ba54eecc5ec693fa5048957b5e5:app.js'],{encoding:'utf8'});
 for(const marker of ['loginForm','signupForm','function boot(','onAuthStateChange','createClient('])check(`Auth marker ${marker}`,app.includes(marker)&&base.includes(marker));
}catch{console.log('WARN base comparison unavailable')}
process.exitCode=failed?1:0;
