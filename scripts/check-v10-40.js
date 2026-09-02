const fs=require('fs');

const files=['app.js','index.html','v2.css','sw.js'];
for(const file of files){
  if(!fs.existsSync(file)){
    console.error('✗ fichier manquant:',file);
    process.exit(1);
  }
}
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');

const checks=[
  ['refresh session', /Actualiser|refresh.*Coaching/i.test(app+html)],
  ['observer role', /observer|observateur/i.test(app)],
  ['historical weather', /histor.*weather|météo.*histor|weather.*history/i.test(app+html)],
  ['olfactive wording', /olfact/i.test(app+html)],
  ['AI debrief', /ai.*debrief|débrief IA/i.test(app+html)],
  ['help scientific', /analyse olfactive|intelligence olfactive/i.test(html)],
  ['phases separated', /function coachingPhase\(/.test(app)],
  ['historical weather UTC', /fetchCoachingHistoricalWeather/.test(app)&&/timezone=UTC/.test(app)],
  ['role surface protection', /applyV1040RoleSurface/.test(app)&&/role==='observer'/.test(app)],
  ['qualitative olfactive levels', /Favorables/.test(app)&&/Fortement perturbées/.test(app)&&!/odor_corridor_coverage_pct}%/.test(app)],
  ['local AI fallback', /localAiDebriefText/.test(app)&&/Générer le débrief IA/.test(html)],
];

let ok=true;
for(const [name,pass] of checks){
  console.log(`${pass?'✓':'✗'} ${name}`);
  if(!pass) ok=false;
}
if(!ok) process.exit(1);

const forbiddenObserverText =
  html.includes('OBSERVATEUR') &&
  /id="[^"]*(observer|coaching)[^"]*"[^>]*>[\s\S]{0,500}Terminer la session/i.test(html);
if(forbiddenObserverText){
  console.warn('⚠ Contrôle manuel requis : vérifier que Terminer est réellement masqué pour Observateur.');
}

console.log('\\nV10.40 — contrôles statiques terminés. Les droits Observateur/GPS nécessitent les tests terrain.');
