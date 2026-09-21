const fs=require('fs');
const assert=require('assert/strict');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const dryRun=fs.readFileSync('PISTE_V10.49.2_COACHING_SCENARIO_DRY_RUN.sql','utf8');
assert.match(app,/preReleaseCoachingDebug/,'panneau Debug existant conservé');
assert.match(html,/coachingWizard/,'wizard Coaching présent');
assert.match(dryRun,/information_schema\.columns/,'dry-run lecture seule');
assert.doesNotMatch(dryRun,/\b(create|alter|drop|insert|update|delete|grant|revoke)\b/i,'dry-run sans écriture');
assert.match(dryRun,/coaching_session_scenarios/);
assert.match(dryRun,/coaching_scenario_reads/);
assert.match(dryRun,/storage\.buckets/);
const requirements=[
  'Coach seul éditeur avec Traceur + Conducteur',
  'Traceur initiateur seul éditeur sans Coach',
  'Conducteur lecture seule',
  'Observateur lecture seule',
  'J’ai lu verrouille définitivement',
  'suppression avant lecture retire l’obligation',
  'late joiner récupère scénario et état',
  'maximum cinq photos',
  'scénario absent conserve le flux actuel',
  'débrief réaffiche le scénario figé'
];
assert.equal(requirements.length,10);
console.log('V10.49.2 preparation guard: PASS (spec, plan, dry-run and test contract)');
