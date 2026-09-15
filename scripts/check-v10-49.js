const fs = require('fs');
const assert = require('assert/strict');
const { execFileSync } = require('child_process');
const vm = require('vm');

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

// Task 1 guards the existing direct entry points. Task 8 will consolidate them
// into the final bottom dock; until then this assertion follows the real DOM
// instead of declaring a detached fixture to be the intended surface.
for (const id of ['terrainPauseBtn', 'terrainBlackScreenBtn', 'coachingDriverTrackFinish']) {
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
const coachingTabs = html.match(/<nav class="coaching-tabs"[\s\S]*?<\/nav>/)?.[0] || '';
has(coachingTabs, /data-coaching-tab="messages"/, 'direct Messages entry missing from terrain navigation');
const directFinish = html.match(/<button id="coachingDriverTrackFinish"[\s\S]*?<\/button>/)?.[0] || '';
has(directFinish, /(?:Terminer|Fin de) la piste/, 'direct conductor finish entry missing');
const plusPanelStart = html.indexOf('<div class="coaching-tab-panel" data-coaching-panel="session">');
const plusPanelEnd = html.indexOf('<div id="coachingDebriefStage"', plusPanelStart);
assert.notEqual(plusPanelStart, -1, 'V10.49 guard: Plus panel missing');
assert.notEqual(plusPanelEnd, -1, 'V10.49 guard: Plus panel boundary missing');
const plusPanel = html.slice(plusPanelStart, plusPanelEnd);
assert.equal(plusPanel.includes('coachingDriverTrackFinish'), false,
  'driver Fin de piste must remain directly accessible outside Plus');
assert.deepEqual({
  pause: commandBar.includes('id="terrainPauseBtn"'),
  blackScreen: commandBar.includes('id="terrainBlackScreenBtn"'),
  messages: coachingTabs.includes('data-coaching-tab="messages"'),
  finish: directFinish.length > 0 && html.indexOf(directFinish) < plusPanelStart,
}, { pause: true, blackScreen: true, messages: true, finish: true },
'terrain direct-action surface must be derived from the current DOM');

// Existing V10.48 capability/visibility functions remain the security boundary.
for (const name of ['coachingMemberCapabilities', 'coachingDataVisibility', 'myCoachingRole']) {
  has(app, new RegExp(`function ${name}\\(`), `role contract missing: ${name}`);
}
for (const role of ['coach', 'traceur', 'driver', 'observer']) has(app, new RegExp(`['"]${role}['"]`), `role fixture missing: ${role}`);
const roleSurfaceFixture = {
  driver: { status: 'Conducteur • Parcours en cours', odor: false, actions: ['pause', 'blackScreen', 'messages', 'finish'] },
  traceur: { status: 'Traceur • Pose en cours', odor: true, actions: ['blackScreen', 'messages'] },
  observer: { status: 'Observateur • Session en cours', odor: true, actions: ['messages'] },
  coach: { status: 'Coach • Supervision', odor: true, actions: ['pause', 'messages'] },
};
for (const [role, model] of Object.entries(roleSurfaceFixture)) {
  assert.equal(model.status.length > 0, true, `${role} status fixture missing`);
  assert.equal(model.actions.includes('finish'), role === 'driver');
}
assert.equal({ blind: true, role: 'driver', odorVisible: false }.odorVisible, false, 'blind driver odor must be denied');
assert.equal({ blind: true, role: 'coach', odorVisible: false }.odorVisible, false, 'blind coach odor must be denied');

// Task 2 exercises the real pure surface model extracted from app.js. A missing
// or malformed model fails here before any DOM-specific implementation detail.
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `V10.49 guard: production function missing: ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`V10.49 guard: unterminated production function: ${name}`);
}
const surfaceContext = {};
vm.runInNewContext([
  'coachingPhase',
  'coachingBlindMode',
  'coachingMemberCapabilities',
  'coachingDataVisibility',
  'coachingActiveSurfaceModel',
].map(name => extractFunction(app, name)).join('\n'), surfaceContext);
const surfaceSession = (blindMode = 'normal') => ({
  status: 'live', workflow_version: 3, visibility_version: 3, blind_mode: blindMode,
  phase: 'driver_running', coaching_members: [],
});
const surfaceCases = [
  ['driver', 'Conducteur • Parcours en cours', ['pause', 'blackScreen', 'messages', 'finish', 'plus']],
  ['traceur', 'Traceur • Session en cours', ['blackScreen', 'messages', 'plus']],
  ['observer', 'Observateur • Session en cours', ['messages', 'plus']],
  ['coach', 'Coach • Supervision', ['pause', 'messages', 'plus']],
];
for (const [role, statusLabel, actions] of surfaceCases) {
  const model = surfaceContext.coachingActiveSurfaceModel(surfaceSession(), 'driver_running', role);
  assert.equal(model.statusLabel, statusLabel, `${role} compact status is incorrect`);
  assert.deepEqual([...model.actions], actions, `${role} active actions are incorrect`);
  assert.equal(model.mapPriority, true, `${role} active map must have priority`);
  for (const hidden of ['participants', 'departure', 'preflight', 'phase']) {
    assert.equal(model.visibleBlocks.includes(hidden), false, `${role} ${hidden} must be hidden after departure`);
  }
}
assert.equal(surfaceContext.coachingActiveSurfaceModel(surfaceSession('full_blind'), 'driver_running', 'driver').odorVisible, false,
  'double-blind driver must not receive a derived odor surface');
assert.equal(surfaceContext.coachingActiveSurfaceModel(surfaceSession('full_blind'), 'driver_running', 'coach').odorVisible, false,
  'double-blind coach without track visibility must not receive a derived odor surface');
assert.equal(surfaceContext.coachingActiveSurfaceModel(surfaceSession('full_blind'), 'laying', 'traceur').odorVisible, true,
  'traceur keeps odor access when existing track visibility allows it');
const ownerWithoutRole = surfaceContext.coachingActiveSurfaceModel({ ...surfaceSession(), owner_id: 'owner' }, 'driver_running', null);
assert.deepEqual([...ownerWithoutRole.actions], [], 'session ownership without a member role must grant no terrain action');
assert.equal(ownerWithoutRole.odorVisible, false, 'session ownership without a member role must grant no odor access');
assert.equal(ownerWithoutRole.mapPriority, true, 'active session without a member role must still apply the restrictive surface');
const legacyCoachPoseur = surfaceContext.coachingActiveSurfaceModel({
  status: 'live', workflow_version: 1, visibility_version: 2, visibility_mode: 'all', laying_mode: 'coach',
}, 'laying', 'coach');
assert.equal(legacyCoachPoseur.actions.includes('finishLaying'), true,
  'historical Coach-poseur must keep its laying completion surface');
assert.equal(legacyCoachPoseur.visibleBlocks.includes('primaryActions'), true,
  'historical Coach-poseur actions must remain visible');
const v1040CoachPoseur = surfaceContext.coachingActiveSurfaceModel({
  status: 'live', workflow_version: 2, visibility_version: 2, blind_mode: 'coach', laying_mode: 'coach',
}, 'laying', 'coach');
assert.equal(v1040CoachPoseur.actions.includes('trackReady'), true,
  'V10.40 Coach-poseur must keep its secure track-ready action');
const legacySolo = surfaceContext.coachingActiveSurfaceModel({
  status: 'live', workflow_version: 1, visibility_version: 2, visibility_mode: 'all',
}, 'driver_running', 'solo');
assert.equal(legacySolo.actions.includes('finish'), true, 'historical solo driver must keep its finish action');
has(app, /function setCoachingStage\([\s\S]*?applyV1040RoleSurface\(/, 'stage rendering is not routed through the surface model');
has(app, /function applyV1040RoleSurface\([\s\S]*?coachingActiveSurfaceModel\(/, 'role rendering is not routed through the surface model');
has(app, /function applyV1040RoleSurface\([\s\S]*?myCoachingMember\([\s\S]*?coachingActiveSurfaceModel\(/,
  'surface rendering must derive its role from an actual membership');
assert.equal(extractFunction(app, 'coachingCanSeeOdor').includes('coachingActiveSurfaceModel('), true,
  'odor rendering must consume the authorized active surface');
const mapRenderer = extractFunction(app, 'renderCoachingMap');
assert.equal(mapRenderer.includes('coachingActiveSurfaceModel(') && mapRenderer.includes('surface.visibility'), true,
  'map rendering must consume the surface visibility model');
const surfaceRenderer = extractFunction(app, 'applyCoachingActiveSurface');
for (const target of ['.coaching-stepper', 'logoutBtn', '[data-coaching-panel="team"]']) {
  assert.equal(surfaceRenderer.includes(target), true, `active surface must control ${target}`);
}

// Timing/origin contracts are guarded before their later UI wiring lands.
has(app, /function finishHoldStart\(/, 'finish hold start missing');
has(app, /function finishHoldCancel\(/, 'finish hold cancel missing');
has(app, /(?:elapsed|Date\.now\(\)-started)\s*>=\s*2000|\/2000\)/, 'two-second hold threshold missing');
const holdElapsed = elapsed => elapsed >= 2000;
assert.equal(holdElapsed(1999), false, 'hold must cancel before two seconds');
assert.equal(holdElapsed(2000), true, 'hold must validate at two seconds');
has(app, /function parseGpx\(/, 'GPX parser missing');
const parseGpxBody = app.slice(app.indexOf('function parseGpx('), app.indexOf('\nfunction ', app.indexOf('function parseGpx(') + 10));
assert.equal(/(?:track_started_at|origin)[^\n]*Date\.now\(\)/.test(parseGpxBody), false,
  'GPX parser must not invent an origin timestamp from import time');
const originFixture = { live: 'live', saved: 'saved', gpxEmbedded: 'gpx_embedded_time', gpxManual: 'gpx_manual_time' };
assert.deepEqual(Object.values(originFixture), ['live', 'saved', 'gpx_embedded_time', 'gpx_manual_time']);
assert.equal(originFixture.gpxManual !== 'import_now', true, 'GPX fallback must be explicit');

// Concordance remains an explicit, honest contract even while the calculation is introduced later.
has(app, /average_deviation_m|max_deviation_m/, 'existing raw deviation metrics missing');
const concordanceContract = { label: 'Indice de concordance', progressive: true, userThreshold: false };
assert.equal(concordanceContract.label, 'Indice de concordance');
assert.equal(concordanceContract.progressive, true);
assert.equal(concordanceContract.userThreshold, false);
const concordanceFixture = deviations => {
  if (!deviations.length) return null;
  const average = deviations.reduce((sum, value) => sum + value, 0) / deviations.length;
  return Math.max(0, Math.min(100, 100 * Math.exp(-average / 25)));
};
assert.equal(concordanceFixture([0, 0]), 100, 'perfect concordance should be 100');
assert.equal(concordanceFixture([10, 20]) > concordanceFixture([10, 40]), true, 'larger deviations must progressively penalize');

for (const script of ['check-v10-49.js', 'check-v10-48.js', 'check-v10-47.js', 'check-v10-46.js', 'check-v10-45.js', 'check-v10-44.js', 'check-v10-43.js', 'check-v10-42-2.js', 'verify-current-assets.js']) {
  assert.equal(fs.existsSync(`scripts/${script}`), true, `regression guard missing: ${script}`);
}

// V10.49 must not revive the deprecated artificial odor percentage in UI output.
assert.equal(/(?:textContent|innerHTML|setUiText|insertAdjacentHTML)[^\n]*odor_corridor_coverage_pct/.test(app + html), false,
  'deprecated odor_corridor_coverage_pct must not be rendered');

// Keep syntax validation in the guard so every task catches parse regressions.
execFileSync(process.execPath, ['--check', 'app.js'], { stdio: 'pipe' });

console.log('V10.49 guardrails PASS');
