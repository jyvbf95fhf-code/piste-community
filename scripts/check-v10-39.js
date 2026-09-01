const fs=require('fs');
const read=file=>fs.readFileSync(file,'utf8');
const app=read('app.js'),html=read('index.html'),css=read('v2.css'),sw=read('sw.js');
const checks=[
  ['contextes utiles',/data-planner-context="training"/.test(html)&&/data-planner-context="coaching"/.test(html)&&!/data-planner-context="operational"/.test(html)],
  ['accès accueil',html.includes('openPlannerHomeBtn')&&app.includes("$('openPlannerHomeBtn').onclick")],
  ['création simplifiée',html.includes('plannerAdvancedToggle')&&html.includes('locatePlannerBtn')&&!html.includes('plannerFreeMode')&&!html.includes('plannerRouteMode')],
  ['barre de routage conservée',html.includes('routingTrailBtn')&&html.includes('routingStreetBtn')&&html.includes('routingFreeBtn')&&css.includes('position:sticky')],
  ['ancien assistant conservé',html.includes('plannerAssistantPanel')&&html.includes('generateRouteSuggestion')],
  ['appui long tactile',app.includes('installPlannerTouchLongPress')&&app.includes('plannerTouchTimer')&&app.includes('plannerSuppressClickUntil')&&html.includes('plannerLongPressMenu')],
  ['repères requis',/data-planner-marker="object"/.test(html)&&/data-planner-marker="clue"/.test(html)&&/data-planner-marker="danger"/.test(html)&&/data-planner-marker="pause"/.test(html)&&/data-planner-marker="note"/.test(html)],
  ['brouillon enrichi',app.includes('routing_mode:plannerRoutingMode')&&app.includes('context:plannerContext')&&app.includes("window.addEventListener('pagehide',persistPlannerDraft)")],
  ['démarrage contextuel',app.includes("savePlanner('copy','start')")&&app.includes("classList.toggle('hidden',plannerContext==='coaching')")],
  ['commandes sans doublon',!html.includes('plannerTools')&&!html.includes('followPlannerBtn')&&!html.includes('navigatePlannerStart')&&html.includes('data-planner-mode="follow"')],
  ['nom avant enregistrement',html.indexOf('planner-finalize')<html.indexOf('planner-actions')&&html.includes('id="routeName"')],
  ['état réseau',app.includes('updatePlannerNetworkState')&&html.includes('plannerNetworkState')],
  ['cache V10.39',sw.includes("piste-community-v2081")&&sw.includes('app.js?v=1080')&&sw.includes('v2.css?v=2064')],
  ['cache même origine',sw.includes("url.origin!==self.location.origin")],
  ['styles iPhone',css.includes('.planner-marker-sheet')&&css.includes('env(safe-area-inset-bottom)')]
];
const failed=checks.filter(([,ok])=>!ok);for(const [name,ok] of checks)console.log(`${ok?'OK':'FAIL'} ${name}`);if(failed.length)process.exit(1);
