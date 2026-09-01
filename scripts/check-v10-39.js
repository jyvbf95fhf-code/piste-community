const fs=require('fs');
const read=file=>fs.readFileSync(file,'utf8');
const app=read('app.js'),html=read('index.html'),css=read('v2.css'),sw=read('sw.js');
const checks=[
  ['créateur sans sélecteur',!/data-planner-context=/.test(html)&&app.includes("plannerReturnTarget='library'")&&!app.includes('coachingRouteReturn')],
  ['accès accueil V2',html.includes('openPlannerHomeBtn')&&app.includes("$('openPlannerHomeBtn').onclick")&&read('v2.js').includes("const plannerBtn = q('#openPlannerHomeBtn')")&&read('v2.js').includes('actionButtons.appendChild(plannerBtn)')],
  ['création simplifiée',html.includes('plannerAdvancedToggle')&&html.includes('locatePlannerBtn')&&!html.includes('plannerFreeMode')&&!html.includes('plannerRouteMode')],
  ['barre de routage conservée',html.includes('routingTrailBtn')&&html.includes('routingStreetBtn')&&html.includes('routingFreeBtn')&&css.includes('position:sticky')],
  ['ancien assistant conservé',html.includes('plannerAssistantPanel')&&html.includes('generateRouteSuggestion')],
  ['appui long tactile',app.includes('installPlannerTouchLongPress')&&app.includes('plannerTouchTimer')&&app.includes('plannerSuppressClickUntil')&&html.includes('plannerLongPressMenu')],
  ['repères requis',/data-planner-marker="object"/.test(html)&&/data-planner-marker="clue"/.test(html)&&/data-planner-marker="danger"/.test(html)&&/data-planner-marker="pause"/.test(html)&&/data-planner-marker="note"/.test(html)],
  ['brouillon enrichi',app.includes('routing_mode:plannerRoutingMode')&&app.includes("window.addEventListener('pagehide',persistPlannerDraft)")],
  ['destination automatique',app.includes("configurePlannerDestination(target='library')")&&app.includes("plannerReturnTarget==='coaching'")&&app.includes("openTerrainPlanner('coaching')")],
  ['commandes sans doublon',!html.includes('plannerTools')&&!html.includes('followPlannerBtn')&&!html.includes('navigatePlannerStart')&&html.includes('data-planner-mode="follow"')],
  ['nom avant enregistrement',html.indexOf('planner-finalize')<html.indexOf('planner-actions')&&html.includes('id="routeName"')],
  ['état réseau',app.includes('updatePlannerNetworkState')&&html.includes('plannerNetworkState')],
  ['cache V10.39',sw.includes("piste-community-v2082")&&sw.includes('app.js?v=1081')&&sw.includes('v2.css?v=2065')&&sw.includes('v2.js?v=2018')],
  ['cache même origine',sw.includes("url.origin!==self.location.origin")],
  ['styles iPhone',css.includes('.planner-marker-sheet')&&css.includes('env(safe-area-inset-bottom)')]
];
const failed=checks.filter(([,ok])=>!ok);for(const [name,ok] of checks)console.log(`${ok?'OK':'FAIL'} ${name}`);if(failed.length)process.exit(1);
