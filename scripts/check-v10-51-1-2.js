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
check('four guided pages',html.includes('data-coaching-debrief-step="summary"')&&html.includes('data-coaching-debrief-step="map"')&&html.includes('data-coaching-debrief-step="observations"')&&html.includes('data-coaching-debrief-step="complete"')&&html.includes('id="coachingDebriefComplete"'));
check('previous next navigation',app.includes('data-debrief-next')&&app.includes('data-debrief-prev')&&app.includes('setCoachingDebriefStep'));
check('summary keeps existing metrics renderer',html.includes('id="coachingAutoDebrief"')&&app.includes('renderAutoDebrief(coachingAutoMetrics')&&app.includes('guided-debrief-primary-kpis'));
check('existing statistics labels retained',app.includes('Indice de concordance')&&app.includes('Distance Traceur')&&app.includes('Distance Conducteur')&&app.includes('Écart moyen')&&app.includes('Écart maximal')&&app.includes('objets approchés')&&app.includes('pertes annotées')&&app.includes('reprises annotées'));
check('map analysis view',html.includes('id="coachingDebriefStepMap"')&&html.includes('Carte de l’exercice')&&html.includes('coachingDebriefOverlayLegend')&&html.includes('coachingDebriefSpatialAnalysis'));
check('existing map overlay reused',app.includes('renderDebriefOverlay(data')&&app.includes('coachingLayerVisibility.odor')&&app.includes('addLiveOdorCorridor'));
check('no fictitious odor metric',app.includes('sans pourcentage d’odeur')&&html.includes('Couloir estimé'));
check('existing observations reused',html.includes('id="coachingParticipantObservations"')&&app.includes('renderParticipantObservations')&&app.includes('submitParticipantObservation'));
check('existing closure reused',html.includes('id="coachingDebriefClosure"')&&app.includes('closeCoachingDebrief')&&app.includes('submitCoachingDebriefClosure'));
check('completion screen and home return',html.includes('id="coachingDebriefComplete"')&&html.includes('id="coachingDebriefReturnHome"')&&app.includes('showCoachingDebriefComplete')&&app.includes('completeCoachingDebriefReturnHome'));
check('historical access path retained',app.includes('loadHistoricalCoachingSessions')&&app.includes('coachingHistoricalAccess')&&app.includes("openCoachingDebriefOnce(id"));
check('historical library opens guided debrief',app.includes("if(route.mode==='archive')return openCoachingHistoricalDebrief(id)"));
check('view track returns to library',app.includes('openCoachingLibraryTrack(activeCoachingSession.id)'));
check('guided map renders planned route and GPX',app.includes('renderGuidedDebriefPlannedLayers')&&app.includes('renderGuidedDebriefGpxLayers'));
check('historical weather fallback',app.includes('coachingDebriefWeatherSource')&&app.includes('coachingV1040WeatherCache'));
check('odor corridor requires usable weather',app.includes('coachingDebriefOdorDataAvailable')&&app.includes('Couloir indisponible'));
check('map reparenting is idempotent',app.includes('coachingDebriefMapReparented')&&app.includes('invalidateSize()'));
check('no second Leaflet instance',!app.includes("createPisteMap('coachingDebriefMap')"));
check('GPS lifecycle resets between sessions',app.includes('resetCoachingGpsTransientState')&&app.includes('clearWatch(coachingPreviewWatch)')&&app.includes('traceurLastPointAt=0'));
check('guided fullscreen has accessible close',html.includes('id="coachingDebriefMapClose"')&&app.includes('closeCoachingDebriefMapExpanded')&&css.includes('guided-debrief-map-close'));
check('observation save feedback',app.includes('✓ Observation enregistrée')&&app.includes('Observation non enregistrée — votre texte est conservé'));
check('historical role is hydrated from proof',app.includes('hydrateCoachingHistoricalRole')&&app.includes('proof?.role'));
check('debrief exit always available',html.includes('id="coachingDebriefExit"')&&app.includes("$('coachingDebriefExit').onclick"));
check('existing role/state functions retained',app.includes('function myCoachingRole')&&app.includes('function coachingBlindMode')&&app.includes('function coachingGlobalPhase')&&app.includes('finishCoachingSessionV1040'));
check('map provider retained',app.includes("PisteTerrainEngine.createMap('coachingMap'")&&app.includes('setCoachingBaseLayer'));
check('dedicated guided mode hides operational UI',app.includes('setCoachingDebriefMode')&&app.includes('guided-debrief-active')&&css.includes('guided-debrief-active .bottom-nav')&&css.includes('#coachingLivePanel.guided-debrief-active> :not(#coachingDebriefStage)'));
check('map reuses coachingMap and invalidates size',app.includes('coachingMapOriginalSlot')&&app.includes('coachingDebriefMapCanvas')&&app.includes('coachingMap?.invalidateSize()'));
check('mobile guided styles',css.includes('.coaching-debrief-stepper')&&css.includes('safe-area-inset-bottom')&&css.includes('coaching-debrief-map-canvas'));
check('no duplicated calculation logic',!app.includes('computeCoachingConcordance(trace,points,25,25)')&&app.includes('calculateCoachingDebrief'));
check('no new polling',!app.includes('setInterval(setCoachingDebriefStep')&&!app.includes('setInterval(coachingDebrief'));
check('no SQL files changed',execFileSync('git',['diff','--name-only','29d937ff5d794ba54eecc5ec693fa5048957b5e5','HEAD'],{encoding:'utf8'}).split('\n').filter(Boolean).every(file=>!/(^|\/)(supabase|.*\.sql)(\/|$)/.test(file)));
try{
 const base=execFileSync('git',['show','29d937ff5d794ba54eecc5ec693fa5048957b5e5:app.js'],{encoding:'utf8'});
 for(const marker of ['loginForm','signupForm','function boot(','onAuthStateChange','createClient('])check(`Auth marker ${marker}`,app.includes(marker)&&base.includes(marker));
}catch{console.log('WARN base comparison unavailable')}
process.exitCode=failed?1:0;
