const fs = require('fs');
const assert = require('assert/strict');
const { execFileSync } = require('child_process');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
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
  if (app.includes(marker) || html.includes(marker)) fail(`temporary debug marker remains: ${marker}`);
}

// Terrain actions stay directly addressable instead of being hidden behind Plus.
for (const id of ['terrainPauseBtn', 'terrainBlackScreenBtn', 'coachingDriverTrackFinish', 'sendCoachingMessage']) {
  has(html, new RegExp(`id="${id}"`), `direct terrain action missing: ${id}`);
}
has(html, /id="coachingTerrainCommandBar"/, 'terrain command bar missing');

// V10.49 must not revive the deprecated artificial odor percentage in UI output.
assert.equal(/(?:textContent|innerHTML|setUiText|insertAdjacentHTML)[^\n]*odor_corridor_coverage_pct/.test(app + html), false,
  'deprecated odor_corridor_coverage_pct must not be rendered');

// Keep syntax validation in the guard so every task catches parse regressions.
execFileSync(process.execPath, ['--check', 'app.js'], { stdio: 'pipe' });

console.log('V10.49 guardrails PASS');
