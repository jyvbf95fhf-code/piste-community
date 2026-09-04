const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sql=fs.readFileSync('PISTE_V10.41_COACHING_SIMPLIFY_DRY_RUN.sql','utf8');
const checks=[
 ['solo absent du formulaire',!/<option[^>]+value="solo"/.test(html)],
 ['nom et chien absents du formulaire',!html.includes('coachingSessionName')&&!html.includes('coachingDogSelect')],
 ['modes visibilité présents',html.includes('value="normal"')&&html.includes('value="simple_blind"')&&html.includes('value="full_blind"')],
 ['blind_mode envoyé',/blind_mode:blindMode/.test(app)],
 ['visibility_mode historique conservé',/visibility_mode:'all'/.test(app)],
 ['piste prête reliée',/trackReadyBtn/.test(html)&&/markCoachingTrackReady/.test(app)],
 ['conducteur attend la piste',/En attente de la piste|En attente : le Coach prépare la piste/.test(app)],
 ['départ waiting_ready',/\['waiting_ready','coach_ready'\]/.test(app)],
 ['aucun maintien pose V10.40',!/bindV1040Hold\('startLayingBtn'/.test(app)],
 ['RPC piste prête',/mark_coaching_track_ready/.test(sql)],
 ['SQL dry-run transactionnel',/^begin;[\s\S]*rollback;\s*$/m.test(sql)]
];
let failed=0;for(const [name,ok] of checks){if(ok)console.log(`OK ${name}`);else{console.error(`KO ${name}`);failed++}}process.exitCode=failed?1:0;
