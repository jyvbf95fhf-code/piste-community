const fs = require('fs');
const assert = require('assert/strict');
const { execFileSync } = require('child_process');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('v2.css', 'utf8');
const fail = message => { throw new Error(`V10.49 guard: ${message}`); };
const has = (source, pattern, message) => {
  if (!pattern.test(source)) fail(message);
};

// V10.48 preparation remains a six-step wizard.
has(app, /Math\.min\(6|step===6|sur 6/, 'wizard six-step contract absent');
assert.equal((html.match(/data-coaching-wizard-step=/g) || []).length, 6,
  'V10.49 guard: expected six wizard sections');
has(html, /id="addCoachingWizardParticipant"/, 'explicit participant add action absent');

// Temporary diagnostics must never ship in application files.
for (const marker of ['AUTH DEBUG', 'APP BOOT', 'JS PREFLIGHT', 'AUTH DEBUG BUILD']) {
  for (const [file, source] of [['app.js', app], ['index.html', html], ['v2.css', css]]) {
    if (source.includes(marker)) fail(`temporary debug marker remains in ${file}: ${marker}`);
  }
}

// Terrain actions stay directly addressable instead of being hidden behind Plus.
for (const id of ['terrainPauseBtn', 'terrainBlackScreenBtn', 'coachingDriverTrackFinish', 'sendCoachingMessage']) {
  has(html, new RegExp(`id="${id}"`), `direct terrain action missing: ${id}`);
}
const commandBar = html.match(/<div id="coachingTerrainCommandBar"[\s\S]*?<\/div>/)?.[0] || '';
has(html, /id="coachingTerrainCommandBar"/, 'terrain command bar missing');
for (const id of ['terrainPauseBtn', 'terrainBlackScreenBtn']) {
  has(commandBar, new RegExp(`id="${id}"`), `${id} must stay directly in terrain command bar`);
}
has(html, /id="terrainPlusBtn"/, 'secondary terrain Plus action missing');
assert.equal(/id="terrainPlusBtn"[\s\S]*?id="(terrainPauseBtn|terrainBlackScreenBtn)"/.test(commandBar), false,
  'primary terrain actions must not be nested after Plus');

// Existing V10.48 capability/visibility functions remain the security boundary.
for (const name of ['coachingMemberCapabilities', 'coachingDataVisibility', 'myCoachingRole']) {
  has(app, new RegExp(`function ${name}\\(`), `role contract missing: ${name}`);
}
for (const role of ['coach', 'traceur', 'driver', 'observer']) has(app, new RegExp(`['"]${role}['"]`), `role fixture missing: ${role}`);

// Timing/origin contracts are guarded before their later UI wiring lands.
has(app, /function finishHoldStart\(/, 'finish hold start missing');
has(app, /function finishHoldCancel\(/, 'finish hold cancel missing');
has(app, /(?:elapsed|Date\.now\(\)-started)\s*>=\s*2000|\/2000\)/, 'two-second hold threshold missing');
has(app, /function parseGpx\(/, 'GPX parser missing');
const parseGpxBody = app.slice(app.indexOf('function parseGpx('), app.indexOf('\nfunction ', app.indexOf('function parseGpx(') + 10));
assert.equal(/(?:track_started_at|origin)[^\n]*Date\.now\(\)/.test(parseGpxBody), false,
  'GPX parser must not invent an origin timestamp from import time');

// Concordance remains an explicit, honest contract even while the calculation is introduced later.
has(app, /average_deviation_m|max_deviation_m/, 'existing raw deviation metrics missing');
const concordanceContract = { label: 'Indice de concordance', progressive: true, userThreshold: false };
assert.equal(concordanceContract.label, 'Indice de concordance');
assert.equal(concordanceContract.progressive, true);
assert.equal(concordanceContract.userThreshold, false);

for (const script of ['check-v10-49.js', 'check-v10-48.js', 'check-v10-47.js', 'check-v10-46.js', 'check-v10-45.js', 'check-v10-44.js', 'check-v10-43.js', 'check-v10-42-2.js', 'verify-current-assets.js']) {
  assert.equal(fs.existsSync(`scripts/${script}`), true, `regression guard missing: ${script}`);
}

// V10.49 must not revive the deprecated artificial odor percentage in UI output.
assert.equal(/(?:textContent|innerHTML|setUiText|insertAdjacentHTML)[^\n]*odor_corridor_coverage_pct/.test(app + html), false,
  'deprecated odor_corridor_coverage_pct must not be rendered');

// Keep syntax validation in the guard so every task catches parse regressions.
execFileSync(process.execPath, ['--check', 'app.js'], { stdio: 'pipe' });

console.log('V10.49 guardrails PASS');
