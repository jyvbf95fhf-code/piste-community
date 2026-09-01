const fs=require('fs');
const read=file=>fs.readFileSync(file,'utf8');
const app=read('app.js'),html=read('index.html'),css=read('v2.css'),sw=read('sw.js');
const checks=[
  ['contextes communs',/data-planner-context="training"/.test(html)&&/data-planner-context="coaching"/.test(html)&&/data-planner-context="operational"/.test(html)],
  ['création rapide',html.includes('plannerFreeMode')&&html.includes('plannerRouteMode')&&html.includes('plannerAdvancedToggle')],
  ['ancien assistant conservé',html.includes('plannerAssistantPanel')&&html.includes('generateRouteSuggestion')],
  ['appui long tactile',app.includes('installPlannerTouchLongPress')&&app.includes('plannerTouchTimer')&&html.includes('plannerLongPressMenu')],
  ['repères requis',/data-planner-marker="object"/.test(html)&&/data-planner-marker="clue"/.test(html)&&/data-planner-marker="danger"/.test(html)&&/data-planner-marker="pause"/.test(html)&&/data-planner-marker="note"/.test(html)],
  ['brouillon enrichi',app.includes('routing_mode:plannerRoutingMode')&&app.includes('context:plannerContext')&&app.includes("window.addEventListener('pagehide',persistPlannerDraft)")],
  ['démarrage contextuel',app.includes("savePlanner('copy','start')")&&app.includes('preservePreparedRoute')],
  ['état réseau',app.includes('updatePlannerNetworkState')&&html.includes('plannerNetworkState')],
  ['cache V10.39',sw.includes("piste-community-v2080")&&sw.includes('app.js?v=1079')&&sw.includes('v2.css?v=2063')],
  ['cache même origine',sw.includes("url.origin!==self.location.origin")],
  ['styles iPhone',css.includes('.planner-marker-sheet')&&css.includes('env(safe-area-inset-bottom)')]
];
const failed=checks.filter(([,ok])=>!ok);for(const [name,ok] of checks)console.log(`${ok?'OK':'FAIL'} ${name}`);if(failed.length)process.exit(1);
