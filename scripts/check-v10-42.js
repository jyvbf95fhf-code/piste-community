const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const checks=[
 ['version centralisée',/const APP_VERSION=['"]10\.42['"]/.test(app)&&/APP_RELEASE_NOTES/.test(app)],
 ['moteur olfactif partagé',/function sharedOlfactionEngine\(/.test(app)&&/module:(?:'ops'|recordMode===.*?'training':'ops')/.test(app)&&/module:'coaching'/.test(app)&&/module:'training'/.test(app)],
 ['niveaux qualitatifs',/Favorables/.test(app)&&/Fortement perturbées/.test(app)&&!/pourcentage d.?odeur restante/i.test(app)],
 ['heure disparition OPS',/id="opsDisappearanceAt"/.test(html)&&/operationalTrackAgeReference/.test(app)],
 ['météo OPS actualisable',/(Météo · Actualiser|↻ Actualiser)/.test(app)&&/fetchOperationalLiveWeather/.test(app)],
 ['couloir estimé OPS',/Couloir olfactif estimé/.test(app+html)&&/operationalCorridorVisible/.test(app)],
 ['âge OPS raccordé',/formatOperationalTrackAge/.test(app)&&/id="opsAgeDisplay"/.test(html)&&!/Âge actuel de la piste : \$\{fmt\(operationalTrackAgeHours\(\),1\)/.test(app)],
 ['âge OPS source unique',/function getOperationalTrackAgeMs\(/.test(app)&&/getOperationalTrackAgeMs\(\)/.test(app)&&!/id="terrainLiveAge"/.test(html)],
 ['âge OPS formats',(()=>{const f=ms=>{const t=Math.floor(ms/60000),d=Math.floor(t/1440),h=Math.floor(t%1440/60),m=t%60,p=n=>String(n).padStart(2,'0');return d?`${d} j ${p(h)} h ${p(m)} min`:h?`${h} h ${p(m)} min`:`${m} min`};return f(5*60000)==='5 min'&&f(65*60000)==='1 h 05 min'&&f(120*60000)==='2 h 00 min'&&f(1501*60000)==='1 j 01 h 01 min'})()],
 ['modes Coaching',/value="normal"/.test(html)&&/value="simple_blind"/.test(html)&&/value="full_blind"/.test(html)],
 ['release modal et historique',/releaseNotesModal/.test(html)&&/releaseNotesHistory/.test(html)&&/showReleaseNotesIfNeeded/.test(app)],
 ['version lue une fois',/RELEASE_SEEN_KEY/.test(app)&&/acknowledgeReleaseNotes/.test(app)],
 ['SQL DRY RUN/APPLY',fs.existsSync('PISTE_V10.42_RELEASE_NOTES_DRY_RUN.sql')&&fs.existsSync('PISTE_V10.42_RELEASE_NOTES_APPLY.sql')],
 ['cache PWA V10.42',/piste-community-v2090/.test(sw)&&/app\.js\?v=1042/.test(sw+html)]
];
let ok=true;for(const [label,pass] of checks){console.log(`${pass?'✓':'✗'} ${label}`);if(!pass)ok=false}
if(!ok)process.exit(1);console.log('\nV10.42 — contrôles statiques terminés. Les appels météo et la persistance serveur nécessitent validation terrain/SQL.');
