const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');

const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]);
const duplicates=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
if(duplicates.length)throw new Error(`Identifiants dupliqués : ${duplicates.join(', ')}`);

for(const id of [
  'librarySelectionToggle','libraryBulkBar','operationalLiveWeather','fieldMarkerDialog',
  'fieldMarkerForm','blackBoxReport','reportFormat'
].filter(id=>id!=='reportFormat')){
  if(!ids.includes(id))throw new Error(`Élément V10.38 absent : ${id}`);
}

for(const token of [
  'setLibrarySelectionMode','activityLibrarySelectionMode','fetchOperationalLiveWeather',
  'renderOperationalOdorCorridor','openFieldMarkerDialog','savePendingFieldMarker',
  'renderProfessionalReport','buildProfessionalReportModel','buildProfessionalPdfBlob',
  'exportProfessionalPdf','REPORT_SECTION_ORDER','Non renseigné'
]){
  if(!app.includes(token))throw new Error(`Fonction V10.38 incomplète : ${token}`);
}

for(const marker of ['object','clue','danger','loss','recovery','note']){
  if(!new RegExp(`value=["']${marker}["']`).test(html))throw new Error(`Type de repère absent : ${marker}`);
}

if(/CENTRE DE GESTION/i.test(html))throw new Error('Le Centre de gestion doit être supprimé.');
if(/>Comparer<|libraryCompare|data-compare-key|library-actions-menu/i.test(html+app+css))throw new Error('Comparer ou menu natif incompatible encore présent dans Mes pistes.');
for(const token of ['library-actions-toggle','library-actions-panel','deleteSelectedActivities'])if(!(app+css).includes(token))throw new Error(`Interaction Mes pistes absente : ${token}`);
if(!/data-blackbox-tab="report"/.test(html)||!/jspdf@2\.5\.2/.test(html))throw new Error('Onglet ou moteur PDF absent.');
if(!/library-selection-mode/.test(css)||!/piste-community-v2077/.test(sw)||!/app\.js\?v=1076/.test(html+sw)||!/styles\.css\?v=1027/.test(html+sw)||!/v2\.css\?v=2060/.test(html+sw))throw new Error('Cache V10.38 incohérent.');
if(!/activity-analysis-card \.analysis-title b/.test(fs.readFileSync('v2.css','utf8'))||!/activity-analysis-card \.analysis-metric-grid small/.test(fs.readFileSync('v2.css','utf8')))throw new Error('Contraste de l’analyse détaillée absent.');
if(/service_role|VAPID_PRIVATE|-----BEGIN (?:RSA|PRIVATE)|sk_live_/i.test(app+html+sw))throw new Error('Secret détecté.');

console.log(`Contrôle V10.38 OK : ${ids.length} IDs uniques, OPS direct, sélection multiple et rapports PDF présents.`);
