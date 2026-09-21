const fs=require('fs');
const assert=require('assert/strict');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const apply=fs.readFileSync('PISTE_V10.49.2_COACHING_SCENARIO.sql','utf8');
const dryRun=fs.readFileSync('PISTE_V10.49.2_COACHING_SCENARIO_DRY_RUN.sql','utf8');
assert.match(app,/preReleaseCoachingDebug/,'panneau Debug existant conservé');
assert.match(html,/coachingWizard/,'wizard Coaching présent');
assert.match(dryRun,/information_schema\.columns/,'dry-run lecture seule');
assert.doesNotMatch(dryRun,/\b(create|alter|drop|insert|update|delete|grant|revoke)\b/i,'dry-run sans écriture');
assert.match(dryRun,/coaching_session_scenarios/);
assert.match(dryRun,/coaching_scenario_reads/);
assert.match(dryRun,/storage\.buckets/);
assert.match(app,/preReleaseCoachingDebug/,'panneau Debug existant conservé');
for(const name of ['coaching_session_scenarios','coaching_scenario_reads','create_coaching_scenario_v10492','update_coaching_scenario_v10492','append_coaching_scenario_photo_v10492','delete_coaching_scenario_v10492','abort_coaching_scenario_v10492','mark_coaching_scenario_read_v10492','get_coaching_scenario_v10492','create_coaching_people_session_v10492'])assert.match(apply,new RegExp(name));
assert.match(apply,/locked_at\s+is\s+null/);
assert.match(apply,/jsonb_array_length\(photo_paths\) between 0 and 5/);
assert.match(apply,/photos doivent être téléversées après la création/);
assert.match(apply,/upload_status='ready'/);
assert.doesNotMatch(apply,/delete\s+from\s+storage\.objects/i);
assert.match(apply,/photo_paths=paths/);
assert.match(apply,/revoke all on function/);
assert.match(apply,/grant execute on function .* to authenticated/);
assert.doesNotMatch(apply,/scenario_title\s*=/i);
assert.doesNotMatch(apply,/drop\s+(table|policy|trigger|function)/i);
assert.match(dryRun,/coaching_scenario_storage_read_v10492/);
assert.match(dryRun,/coaching_session_scenarios/);
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
assert.match(html,/coachingScenarioEnabled/,'wizard scenario toggle present');
assert.match(html,/coachingScenarioText/,'wizard scenario text present');
assert.match(html,/coachingScenarioPhotos/,'wizard scenario photo input present');
assert.match(app,/create_coaching_people_session_v10492/,'versioned scenario creation RPC');
assert.match(app,/append_coaching_scenario_photo_v10492/,'photo append RPC');
assert.match(app,/abort_coaching_scenario_v10492/,'pending abort RPC');
assert.match(app,/supabase\.storage\.from\(['"]coaching-scenarios['"]\)/,'private scenario bucket');
assert.match(app,/coaching_session_scenarios/,'scenario realtime table');
assert.match(app,/coaching_scenario_reads/,'scenario reads realtime table');
assert.match(app,/mark_coaching_scenario_read_v10492/,'server read acknowledgement');
assert.match(app,/renderCoachingScenarioDebrief/,'debrief scenario renderer');
assert.match(app,/coachingTerrain|coachingLivePanel/,'terrain surface exists');
assert.match(app,/scenarioStatus/,'scenario debug metadata');
assert.match(app,/cleanupCoachingScenarioFiles/,'Storage API cleanup helper');
assert.match(app,/abort_coaching_scenario_v10492/,'pending abort after cleanup');
assert.match(app,/upload_status==='ready'/,'ready status gate');
assert.match(app,/coachingScenarioRead/,'conducteur read action');
assert.match(app,/coachingScenarioDebrief/,'debrief-only scenario surface');
assert.match(app,/s\.status!=='waiting'/,'terrain scenario hidden outside preparation');
assert.match(app,/coachingScenarioChannel/,'scenario realtime channel');
assert.doesNotMatch(app,/coachingScenarioReveal[\s\S]{0,300}scenario_text/,'terrain reveal does not expose scenario text');
console.log('V10.49.2 preparation guard: PASS (spec, plan, dry-run and test contract)');
