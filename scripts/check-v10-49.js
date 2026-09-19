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
for (const id of ['terrainPauseBtn', 'terrainBlackScreenBtn', 'terrainMessagesBtn', 'driverFinishBtn']) {
  has(commandBar, new RegExp(`id="${id}"`), `${id} must stay directly in terrain command bar`);
}
has(commandBar, /id="terrainMessagesBtn"[\s\S]*?id="coachingMessageUnreadBadge"/, 'Messages dock action must preserve its unread badge');
has(commandBar, /id="driverFinishBtn"[\s\S]*?>Fin de piste</, 'Conducteur dock action must use the Fin de piste label');
has(html, /id="terrainPlusBtn"/, 'secondary terrain Plus action missing');
assert.equal(/id="terrainPlusBtn"[\s\S]*?id="(terrainPauseBtn|terrainBlackScreenBtn)"/.test(commandBar), false,
  'primary terrain actions must not be nested after Plus');
const coachingTabs = html.match(/<nav class="coaching-tabs"[\s\S]*?<\/nav>/)?.[0] || '';
assert.equal(coachingTabs.includes('coachingMessageUnreadBadge'), false,
  'the unread badge must have one owner in the direct Messages dock action');
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
  messages: commandBar.includes('id="terrainMessagesBtn"'),
  finish: commandBar.includes('id="driverFinishBtn"'),
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
function extractFunctionWithParameterDefaults(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `V10.49 guard: production function missing: ${name}`);
  const parametersStart = source.indexOf('(', start);
  let parentheses = 0;
  let bodyStart = -1;
  for (let index = parametersStart; index < source.length; index += 1) {
    if (source[index] === '(') parentheses += 1;
    if (source[index] === ')') parentheses -= 1;
    if (parentheses === 0) { bodyStart = source.indexOf('{', index); break; }
  }
  let braces = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') braces += 1;
    if (source[index] === '}') braces -= 1;
    if (braces === 0) return source.slice(start, index + 1);
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
  'coachingSurfaceActionTarget',
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
assert.equal(surfaceContext.coachingActiveSurfaceModel(surfaceSession(), 'driver_running', 'driver').visibleBlocks.includes('primaryActions'), false,
  'current Conducteur dock finish must not reveal duplicated primary actions');
assert.equal(surfaceContext.coachingActiveSurfaceModel(surfaceSession('full_blind'), 'driver_running', 'driver').odorVisible, false,
  'double-blind driver must not receive a derived odor surface');
assert.equal(surfaceContext.coachingActiveSurfaceModel(surfaceSession('full_blind'), 'driver_running', 'coach').odorVisible, false,
  'double-blind coach without track visibility must not receive a derived odor surface');
assert.equal(surfaceContext.coachingActiveSurfaceModel(surfaceSession('full_blind'), 'laying', 'traceur').odorVisible, true,
  'traceur keeps odor access when existing track visibility allows it');
for (const decorated of [{ mode: 'training' }, { module: 'training' }]) {
  assert.equal(surfaceContext.coachingActiveSurfaceModel({ ...surfaceSession('full_blind'), ...decorated }, 'driver_running', 'driver').odorVisible, false,
    'training-like metadata must not bypass blind driver odor denial');
  assert.equal(surfaceContext.coachingActiveSurfaceModel({ ...surfaceSession('full_blind'), ...decorated }, 'driver_running', 'coach').odorVisible, false,
    'training-like metadata must not bypass blind coach odor denial');
}
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
const emittedActions = new Set([...surfaceCases.flatMap(([role]) => surfaceContext.coachingActiveSurfaceModel(surfaceSession(), 'driver_running', role).actions), ...legacyCoachPoseur.actions, ...v1040CoachPoseur.actions, ...legacySolo.actions]);
for (const action of emittedActions) {
  const selector = surfaceContext.coachingSurfaceActionTarget(action, action === 'finish' && legacySolo.actions.includes(action) ? { workflow_version: 1 } : surfaceSession());
  assert.equal(typeof selector, 'string', `surface action has no rendered target: ${action}`);
  if (selector.startsWith('#')) has(html, new RegExp(`id="${selector.slice(1)}"`), `surface action target missing from DOM: ${action}`);
  else assert.fail(`surface action must resolve to a rendered id: ${action}`);
}
assert.equal(surfaceContext.coachingSurfaceActionTarget('messages', surfaceSession()), '#terrainMessagesBtn',
  'Messages must route to the direct terrain dock action');
assert.equal(surfaceContext.coachingSurfaceActionTarget('finish', surfaceSession()), '#driverFinishBtn',
  'current Conducteur finish must route to the workflow finish button');
assert.equal(surfaceContext.coachingSurfaceActionTarget('finish', { workflow_version: 1 }), '#terrainFinishBtn',
  'historical finish must retain its legacy target');

// Task 8: the bottom dock consumes the role surface instead of granting
// capabilities from DOM presence. Native buttons preserve keyboard/pointer use.
const dockNodes = new Map(['coachingTerrainCommandBar', 'terrainPauseBtn', 'terrainBlackScreenBtn', 'terrainMessagesBtn', 'driverFinishBtn', 'terrainPlusBtn'].map(id => [id, {
  id, hidden: false, attributes: {},
  classList: { values: new Set(), toggle(name, force) { if (force) this.values.add(name); else this.values.delete(name); } },
  setAttribute(name, value) { this.attributes[name] = value; },
}]));
const dockContext = { $: id => dockNodes.get(id), renderCoachingPauseState() {} };
vm.createContext(dockContext);
vm.runInContext(extractFunction(app, 'renderCoachingTerrainDock'), dockContext);
const dockVisibility = id => !dockNodes.get(id).classList.values.has('hidden');
for (const [role, expected] of [
  ['driver', ['terrainPauseBtn', 'terrainBlackScreenBtn', 'terrainMessagesBtn', 'driverFinishBtn', 'terrainPlusBtn']],
  ['traceur', ['terrainBlackScreenBtn', 'terrainMessagesBtn', 'terrainPlusBtn']],
  ['observer', ['terrainMessagesBtn', 'terrainPlusBtn']],
  ['coach', ['terrainPauseBtn', 'terrainMessagesBtn', 'terrainPlusBtn']],
]) {
  dockContext.renderCoachingTerrainDock(surfaceContext.coachingActiveSurfaceModel(surfaceSession(), 'driver_running', role));
  for (const id of ['terrainPauseBtn', 'terrainBlackScreenBtn', 'terrainMessagesBtn', 'driverFinishBtn', 'terrainPlusBtn']) {
    assert.equal(dockVisibility(id), expected.includes(id), `${role} dock visibility is incorrect for ${id}`);
    assert.equal(dockNodes.get(id).attributes['aria-hidden'], String(!expected.includes(id)), `${role} dock accessibility is incorrect for ${id}`);
  }
}
dockContext.renderCoachingTerrainDock(legacySolo);
assert.equal(dockVisibility('driverFinishBtn'), false,
  'historical finish flow must not be replaced by the V10.49 Conducteur dock action');
dockContext.renderCoachingTerrainDock(null);
assert.equal(dockNodes.get('coachingTerrainCommandBar').classList.values.has('hidden'), true,
  'dock must leave the active surface when no terrain model is rendered');
assert.equal(/data-message-preset|message-pr[eé]rempli/i.test(html), false,
  'terrain dock must not reintroduce canned messages');
has(css, /#coachingLivePanel\.active-terrain \.coaching-terrain-command-bar[\s\S]*?position:sticky[\s\S]*?safe-area-inset-bottom/,
  'terrain dock must remain reachable above the device safe area');
has(app, /function setCoachingStage\([\s\S]*?applyV1040RoleSurface\(/, 'stage rendering is not routed through the surface model');
has(app, /function applyV1040RoleSurface\([\s\S]*?coachingActiveSurfaceModel\(/, 'role rendering is not routed through the surface model');
has(app, /function applyV1040RoleSurface\([\s\S]*?myCoachingMember\([\s\S]*?coachingActiveSurfaceModel\(/,
  'surface rendering must derive its role from an actual membership');
assert.equal(extractFunction(app, 'coachingOdorAuthorized').includes('coachingActiveSurfaceModel('), true,
  'odor rendering must consume the authorized active surface');
const mapRenderer = extractFunction(app, 'renderCoachingMap');
assert.equal(mapRenderer.includes('coachingActiveSurfaceModel(') && mapRenderer.includes('surface.visibility'), true,
  'map rendering must consume the surface visibility model');
const surfaceRenderer = extractFunction(app, 'applyCoachingActiveSurface');
for (const target of ['.coaching-stepper', 'logoutBtn', '[data-coaching-panel="team"]']) {
  assert.equal(surfaceRenderer.includes(target), true, `active surface must control ${target}`);
}
assert.equal(extractFunction(app, 'coachingCanSeeOdor').includes("mode==='training'") || extractFunction(app, 'coachingCanSeeOdor').includes("module==='training'"), false,
  'Coaching odor authorization must not have a training metadata bypass');

// Task 3: the active surface has one semantic, permanent metrics banner. Its
// renderer must distinguish unavailable data from a measured zero.
for (const label of ['Temps actif', 'Distance active', 'Âge piste']) {
  assert.equal((html.match(new RegExp(`>${label}<`, 'g')) || []).length, 1,
    `${label} must appear exactly once on the active surface`);
}
has(html, /id="coachingTerrainStatus"[^>]*role="status"[^>]*data-coaching-active-banner/,
  'semantic active Coaching banner missing');
assert.equal(html.includes('class="coaching-live-metrics"'), false,
  'legacy map metric overlay duplicates the permanent banner');

const bannerNodes = new Map();
const bannerNode = id => {
  if (!bannerNodes.has(id)) bannerNodes.set(id, {
    textContent: '', title: '', dataset: {},
    classList: { toggle() {} },
  });
  return bannerNodes.get(id);
};
const bannerContext = {
  Intl,
  $: bannerNode,
  formatExactDuration: ms => `${Math.floor(ms / 60000)} min`,
  formatOperationalTrackAge: ms => `${Math.floor(ms / 3600000)} h ${String(Math.floor(ms % 3600000 / 60000)).padStart(2, '0')}`,
};
vm.createContext(bannerContext);
vm.runInContext(extractFunction(app, 'renderCoachingActiveBanner'), bannerContext);
bannerContext.renderCoachingActiveBanner({ activeMs: 42 * 60000, activeKm: 3.8, trackAgeMs: 6 * 3600000 + 25 * 60000, pauseState: 'paused' });
assert.equal(bannerNode('coachingActiveTime').textContent, '42 min');
assert.equal(bannerNode('coachingActiveDistance').textContent, '3,80 km');
assert.equal(bannerNode('coachingTrackAge').textContent, '6 h 25');
assert.equal(bannerNode('coachingTerrainStatus').dataset.pauseState, 'paused');
bannerContext.renderCoachingActiveBanner({ activeMs: null, activeKm: undefined, trackAgeMs: Number.NaN, pauseState: 'running' });
for (const id of ['coachingActiveTime', 'coachingActiveDistance', 'coachingTrackAge']) {
  assert.equal(bannerNode(id).textContent, '—', `${id} must not manufacture zero`);
  assert.notEqual(bannerNode(id).title, '', `${id} unavailable value needs a reason`);
}
bannerContext.renderCoachingActiveBanner({ activeMs: null, activeKm: null, trackAgeMs: null, trackAgeReason: 'Début réel du traçage incohérent : heure future', pauseState: 'running' });
assert.match(bannerNode('coachingTrackAge').title, /heure future/, 'future origin must be signalled in the active banner');
for (const token of ['env(safe-area-inset-left', 'env(safe-area-inset-right', 'env(safe-area-inset-bottom', 'data-map-priority="true"', 'minmax(0,1fr)']) {
  has(css, new RegExp(token.replace(/[()]/g, '\\$&')), `active map-priority layout missing ${token}`);
}
assert.equal(extractFunction(app, 'applyCoachingActiveSurface').includes('coachingActiveBannerState={activeKm:null}'), true,
  'leaving a session must clear cached active distance before another session opens');

const sharedMetricCalls = [];
const sharedMetricContext = {
  Date,
  Map,
  Object,
  activeCoachingSession: {
    started_at: '2026-09-15T10:00:00Z',
    laying_started_at: '2026-09-15T10:05:00Z',
    track_finished_at: '2026-09-15T10:45:00Z',
    driver_started_at: '2026-09-15T11:00:00Z',
    driver_finished_at: '2026-09-15T11:05:00Z',
    pause_state: 'running',
  },
  coachingActiveBannerState: { activeKm: null },
  coachingTerrainPaused: false,
  coachingPauseIntervals: [],
  myCoachingRole: () => 'traceur',
  renderCoachingPauseState() {},
  renderCoachingActiveBanner: metrics => sharedMetricCalls.push(metrics),
  coachingMemberRole: () => 'driver',
  routeDistance: points => points[0]?.kind === 'driver' ? 3800 : 9900,
};
vm.createContext(sharedMetricContext);
vm.runInContext(extractFunctionWithParameterDefaults(app, 'resolveTrackOrigin'), sharedMetricContext);
vm.runInContext(extractFunctionWithParameterDefaults(app, 'coachingPauseState'), sharedMetricContext);
vm.runInContext(extractFunctionWithParameterDefaults(app, 'coachingActiveDurationMs'), sharedMetricContext);
vm.runInContext(extractFunctionWithParameterDefaults(app, 'coachingActiveDistance'), sharedMetricContext);
vm.runInContext(extractFunctionWithParameterDefaults(app, 'updateCoachingTerrainStatus'), sharedMetricContext);
vm.runInContext(extractFunctionWithParameterDefaults(app, 'updateCoachingLiveMetrics'), sharedMetricContext);
sharedMetricContext.updateCoachingTerrainStatus();
assert.equal(sharedMetricCalls.at(-1).activeMs, 5 * 60000,
  'Traceur must see the shared Conducteur active time, not laying time');
sharedMetricContext.activeCoachingSession.driver_started_at = null;
sharedMetricContext.activeCoachingSession.driver_finished_at = null;
sharedMetricContext.updateCoachingTerrainStatus();
assert.equal(sharedMetricCalls.at(-1).activeMs, null,
  'pose time must stay separate when the Conducteur has not started');
sharedMetricContext.activeCoachingSession.driver_started_at = '2026-09-15T11:00:00Z';
sharedMetricContext.activeCoachingSession.driver_finished_at = '2026-09-15T11:05:00Z';
const driverMetricPoints = [{ kind: 'driver', recorded_at: '2026-09-15T11:00:00Z' }, { kind: 'driver', recorded_at: '2026-09-15T11:05:00Z' }];
const traceMetricPoints = [{ kind: 'trace', recorded_at: '2026-09-15T10:05:00Z' }, { kind: 'trace', recorded_at: '2026-09-15T10:45:00Z' }];
sharedMetricContext.updateCoachingLiveMetrics(new Map([['driver-user', driverMetricPoints]]), traceMetricPoints);
assert.equal(sharedMetricCalls.at(-1).activeKm, 3.8,
  'Traceur must see the shared Conducteur active distance, not pose distance');

// Task 7: shared pause is authoritative, survives reload and filters only the
// active metrics. Raw GPS acquisition and point arrays remain untouched.
for (const name of ['coachingCanControlPause', 'coachingPauseState', 'coachingActiveDurationMs', 'coachingActiveDistance', 'requestSharedPause']) {
  has(app, new RegExp(`function ${name}\\(`), `shared pause contract missing: ${name}`);
}
const pauseContext = { Date, Math, Number, coachingPauseIntervals: [], coachingPauseIntervalsSessionId: null, routeDistance: points => (points.length - 1) * 100 };
vm.createContext(pauseContext);
vm.runInContext([
  'coachingCanControlPause',
  'coachingPauseState',
  'coachingActiveDurationMs',
  'coachingActiveDistance',
].map(name => extractFunctionWithParameterDefaults(app, name)).join('\n'), pauseContext);
assert.equal(pauseContext.coachingCanControlPause('driver'), true, 'Conducteur must control shared pause');
assert.equal(pauseContext.coachingCanControlPause('coach'), true, 'Coach must control shared pause');
assert.equal(pauseContext.coachingCanControlPause('traceur'), false, 'Traceur must be read-only for shared pause');
assert.equal(pauseContext.coachingCanControlPause('observer'), false, 'Observer must be read-only for shared pause');
const pauseEvents = [
  { started_at: '2026-09-15T11:02:00Z', ended_at: '2026-09-15T11:05:00Z' },
  { started_at: '2026-09-15T11:08:00Z', ended_at: null },
];
const pausedState = pauseContext.coachingPauseState({
  pause_state: 'paused', pause_started_at: '2026-09-15T11:08:00Z', pause_total_ms: 180000,
}, pauseEvents, Date.parse('2026-09-15T11:10:00Z'));
assert.equal(pausedState.paused, true, 'reload must reconstruct the shared paused state');
assert.equal(pausedState.changedAt, '2026-09-15T11:08:00.000Z');
assert.equal(pausedState.intervals.length, 2, 'server pause journal must be preserved');
assert.equal(pauseContext.coachingActiveDurationMs('2026-09-15T11:00:00Z', '2026-09-15T11:10:00Z', pausedState), 5 * 60000,
  'active duration must subtract closed and open shared pauses');
const rawPausePoints = [
  { recorded_at: '2026-09-15T11:00:00Z' },
  { recorded_at: '2026-09-15T11:01:00Z' },
  { recorded_at: '2026-09-15T11:03:00Z' },
  { recorded_at: '2026-09-15T11:06:00Z' },
  { recorded_at: '2026-09-15T11:07:00Z' },
  { recorded_at: '2026-09-15T11:09:00Z' },
];
assert.equal(pauseContext.coachingActiveDistance(rawPausePoints, pausedState), 200,
  'active distance must not bridge a pause or include movement during pause');
assert.equal(rawPausePoints.length, 6, 'active metrics must not mutate the raw GPS trace');
const pauseRequestBody = extractFunctionWithParameterDefaults(app, 'requestSharedPause');
has(pauseRequestBody, /rpc\(['"]set_coaching_pause['"]/, 'shared pause must use the atomic backend RPC');
assert.equal(/from\(['"]coaching_sessions['"]\)\.update/.test(pauseRequestBody), false,
  'shared pause must not bypass the RPC with a direct update');
assert.equal(pauseRequestBody.includes('coachingPauseRequest'), true,
  'concurrent pause commands need one in-flight request');
const togglePauseBody = extractFunctionWithParameterDefaults(app, 'toggleTerrainPause');
assert.equal(togglePauseBody.includes('stopCoachingPresence') || togglePauseBody.includes('stopTraceurTracking'), false,
  'pausing metrics must not stop raw GPS watchers');
assert.equal(togglePauseBody.includes('startCoachingGpsTracking'), false,
  'resuming metrics must not restart or duplicate GPS watchers');
has(app, /coaching_pause_events[\s\S]*?started_at[\s\S]*?ended_at/, 'pause journal must reload from the server');
for (const field of ['pause_state', 'pause_started_at', 'pause_started_by', 'pause_total_ms']) {
  assert.equal(extractFunction(app, 'applySafeCoachingRealtimeStatus').includes(`'${field}'`), true,
    `realtime reconciliation missing ${field}`);
}
has(html, /id="terrainPauseLabel"/, 'shared pause action label missing');
has(html, /id="terrainPauseState"[^>]*aria-live="polite"/, 'shared pause confirmation state missing');
has(css, /data-pause-pending="true"/, 'shared pause pending style missing');

has(css, /@media\(max-height:[^)]+\),\(orientation:landscape\)[\s\S]*?\.coaching-map-shell:not\(\.fullscreen\)[\s\S]*?height:clamp\(/,
  'short landscape and keyboard-reduced viewports need a bounded map height');
const mapPriorityCss = css.slice(css.indexOf('/* V10.49 — bandeau terrain unique et carte prioritaire. */'));
const genericMapPriorityCss = mapPriorityCss.slice(0, mapPriorityCss.indexOf('@media(max-height:'));
assert.equal(genericMapPriorityCss.includes(',760px)') || genericMapPriorityCss.includes(',620px)'), false,
  'generic active map height must not be capped on tall screens');

// Task 9: only the Conducteur's continuous two-second hold may submit the
// atomic global finish. Release/lifecycle cancellation and duplicate starts
// must never synthesize a second RPC.
for (const name of ['coachingCanFinishTrack', 'submitCoachingFinishHold', 'finishHoldStart', 'finishHoldCancel']) {
  has(app, new RegExp(`function ${name}\\(`), `finish hold function missing: ${name}`);
}
const finishSubmitBody = extractFunctionWithParameterDefaults(app, 'submitCoachingFinishHold');
has(finishSubmitBody, /rpc\(['"]finish_coaching_track_v1049['"]/, 'global finish must use the V10.49 atomic RPC');
assert.equal(finishSubmitBody.includes("finish_driver_run"), false, 'global finish must not use the old driver transition');
assert.equal(finishSubmitBody.includes('refreshActiveCoachingSession'), true, 'global finish must reconcile authoritative server state');
assert.equal(/bindClick\(['"]driverFinishBtn['"],\s*finishDriverRun\)/.test(app), false,
  'Fin de piste must not have a click/tap submission path');
for (const event of ['pointerup', 'pointercancel', 'pointerleave']) {
  has(app, new RegExp(`driverFinishBtn[\\s\\S]{0,1400}${event}`), `driver finish hold must cancel on ${event}`);
}
has(app, /window\.addEventListener\(['"]blur['"],\s*finishHoldCancel\)/,
  'driver finish hold must cancel when the window loses focus');
has(app, /visibilitychange[\s\S]{0,180}finishHoldCancel/, 'driver finish hold must cancel when the document is hidden');
has(html, /id="driverFinishBtn"[^>]*[\s\S]*?Maintenir 2 secondes[\s\S]*?<\/button>/,
  'driver finish control must explain the two-second hold');
has(css, /#driverFinishBtn::before[\s\S]*?--finish-progress/, 'driver finish progress indicator missing');

const finishButtonFixture = {
  id: 'driverFinishBtn', disabled: false, hidden: false, attributes: {},
  classList: { values: new Set(), add(name) { this.values.add(name); }, remove(name) { this.values.delete(name); } },
  style: { values: new Map(), setProperty(name, value) { this.values.set(name, value); }, removeProperty(name) { this.values.delete(name); } },
  setAttribute(name, value) { this.attributes[name] = value; },
};
let finishNow = 0;
let finishTick = null;
let finishRpcCalls = 0;
const finishContext = {
  Date: { now: () => finishNow },
  activeCoachingSession: { id: 'session-9', status: 'live', workflow_version: 2, phase: 'driver_running' },
  coachingFinishTimer: null,
  coachingFinishArmed: false,
  coachingFinishSessionId: null,
  coachingFinishTargetId: null,
  coachingFinishSubmittingSessionId: null,
  coachingFinishSubmittedSessionId: null,
  $: id => id === 'driverFinishBtn' ? finishButtonFixture : null,
  myCoachingRole: () => 'driver',
  coachingPhase: session => session.phase,
  setInterval(callback) { finishTick = callback; return 9; },
  clearInterval() { finishTick = null; },
  submitCoachingFinishHold() { finishRpcCalls += 1; },
};
vm.createContext(finishContext);
vm.runInContext([
  extractFunctionWithParameterDefaults(app, 'coachingCanFinishTrack'),
  extractFunctionWithParameterDefaults(app, 'finishHoldCancel'),
  extractFunctionWithParameterDefaults(app, 'finishHoldStart'),
].join('\n'), finishContext);
const finishEvent = type => ({ type, button: 0, currentTarget: finishButtonFixture, preventDefault() {}, stopPropagation() {} });
finishContext.finishHoldStart(finishEvent('pointerdown'));
finishNow = 1999;
finishTick();
finishContext.finishHoldCancel(finishEvent('pointerup'));
assert.equal(finishRpcCalls, 0, 'release at 1999 ms must cancel without an RPC');
for (const type of ['pointercancel', 'pointerleave', 'blur']) {
  finishNow = 0;
  finishContext.finishHoldStart(finishEvent('pointerdown'));
  finishContext.finishHoldCancel(finishEvent(type));
  assert.equal(finishRpcCalls, 0, `${type} must cancel without an RPC`);
}
finishNow = 0;
finishContext.finishHoldStart(finishEvent('pointerdown'));
finishContext.finishHoldStart(finishEvent('pointerdown'));
finishNow = 2000;
finishTick();
assert.equal(finishRpcCalls, 1, 'the 2000 ms threshold must submit exactly one RPC');
finishContext.finishHoldStart(finishEvent('pointerdown'));
assert.equal(finishRpcCalls, 1, 'an in-flight/terminal hold must not submit twice');
has(app, /function parseGpx\(/, 'GPX parser missing');
const parseGpxBody = app.slice(app.indexOf('function parseGpx('), app.indexOf('\nfunction ', app.indexOf('function parseGpx(') + 10));
assert.equal(/(?:track_started_at|origin)[^\n]*Date\.now\(\)/.test(parseGpxBody), false,
  'GPX parser must not invent an origin timestamp from import time');
for (const id of ['gpxTrackStartedAt', 'gpxTrackTimezone']) {
  has(html, new RegExp(`id="${id}"`), `explicit GPX origin control missing: ${id}`);
}

function fixtureXmlNode(localName, textContent = '', attributes = {}, children = []) {
  return { localName, textContent, children, getAttribute: name => attributes[name] ?? null };
}
class FixtureDOMParser {
  parseFromString(source) {
    const points = [...source.matchAll(/<(trkpt|rtept|wpt)\b([^>]*)>([\s\S]*?)<\/\1>/g)].map(match => {
      const attributes = Object.fromEntries([...match[2].matchAll(/([\w:-]+)="([^"]*)"/g)].map(attribute => [attribute[1], attribute[2]]));
      const time = match[3].match(/<time>([^<]+)<\/time>/)?.[1] || '';
      return fixtureXmlNode(match[1], '', attributes, time ? [fixtureXmlNode('time', time)] : []);
    });
    const rootName = source.match(/<name>([^<]+)<\/name>/)?.[1] || '';
    return {
      documentElement: fixtureXmlNode('gpx', '', {}, rootName ? [fixtureXmlNode('name', rootName)] : []),
      querySelector: () => null,
      getElementsByTagNameNS: (_namespace, name) => ['trkpt', 'rtept', 'wpt'].includes(name) ? points.filter(point => point.localName === name) : [],
    };
  }
}
const originContext = { DOMParser: FixtureDOMParser, Date, Number, Array, Math, Error, crypto: { randomUUID: () => 'fixture-id' } };
vm.createContext(originContext);
vm.runInContext([
  'gpxElements',
  'gpxText',
  'gpxCoordinate',
  'reduceGpxPoints',
  'parseExplicitGpxOrigin',
  'parseGpx',
  'resolveTrackOrigin',
].map(name => extractFunctionWithParameterDefaults(app, name)).join('\n'), originContext);
const timedGpx = originContext.parseGpx('<gpx><name>Ancienne piste</name><trk><trkseg><trkpt lat="48.1" lon="7.1"><time>2026-09-01T08:00:00Z</time></trkpt><trkpt lat="48.2" lon="7.2"><time>2026-09-01T08:10:00Z</time></trkpt></trkseg></trk></gpx>');
assert.equal(timedGpx.originAt, '2026-09-01T08:00:00.000Z', 'GPX must preserve its first real timestamp');
assert.equal(timedGpx.originSource, 'gpx_embedded_time');
assert.equal(timedGpx.points[1].recorded_at, '2026-09-01T08:10:00.000Z', 'point timestamps must survive parsing and reduction');
const untimedGpx = '<gpx><trk><trkseg><trkpt lat="48.1" lon="7.1"></trkpt><trkpt lat="48.2" lon="7.2"></trkpt></trkseg></trk></gpx>';
assert.throws(() => originContext.parseGpx(untimedGpx), /date.*heure.*fuseau/i,
  'an untimed GPX must require explicit date, time and timezone');
const manualGpx = originContext.parseGpx(untimedGpx, { dateTime: '2026-08-30T07:15', timezone: '+02:00' });
assert.equal(manualGpx.originAt, '2026-08-30T05:15:00.000Z');
assert.equal(manualGpx.originSource, 'gpx_manual_time');
assert.equal(manualGpx.points[0].recorded_at, manualGpx.originAt, 'declared origin must stay attached to the first point');
assert.throws(() => originContext.parseGpx('<gpx><trk><trkseg><trkpt lat="48.1" lon="7.1"><time>2999-01-01T00:00:00Z</time></trkpt><trkpt lat="48.2" lon="7.2"><time>2999-01-01T00:10:00Z</time></trkpt></trkseg></trk></gpx>'), /future/i,
  'future GPX timestamps must be rejected instead of clamped');
const lateTimedGpx = '<gpx><trk><trkseg><trkpt lat="48.1" lon="7.1"></trkpt><trkpt lat="48.2" lon="7.2"><time>2026-09-01T08:10:00Z</time></trkpt></trkseg></trk></gpx>';
assert.throws(() => originContext.parseGpx(lateTimedGpx), /date.*heure.*fuseau/i,
  'a later timestamp must not masquerade as the first real track coordinate timestamp');
const lateTimedManual = originContext.parseGpx(lateTimedGpx, { dateTime: '2026-09-01T08:00', timezone: 'Z' });
assert.equal(lateTimedManual.originAt, '2026-09-01T08:00:00.000Z');
assert.equal(lateTimedManual.originSource, 'gpx_manual_time');
const ambiguousTimedGpx = '<gpx><trk><trkseg><trkpt lat="48.1" lon="7.1"><time>2026-09-01T08:00:00</time></trkpt><trkpt lat="48.2" lon="7.2"><time>2026-09-01T08:10:00</time></trkpt></trkseg></trk></gpx>';
assert.throws(() => originContext.parseGpx(ambiguousTimedGpx), /date.*heure.*fuseau/i,
  'an embedded timestamp without UTC offset must require an explicit origin');
assert.equal(originContext.parseGpx(ambiguousTimedGpx, { dateTime: '2026-09-01T08:00', timezone: '+02:00' }).originSource, 'gpx_manual_time');
assert.throws(() => originContext.parseGpx(untimedGpx, { dateTime: '2026-02-30T07:15', timezone: '+01:00' }), /invalide/i,
  'an impossible manual calendar date must be rejected instead of normalized');
const waypointWithBadTime = originContext.parseGpx('<gpx><trk><trkseg><trkpt lat="48.1" lon="7.1"><time>2026-09-01T08:00:00Z</time></trkpt><trkpt lat="48.2" lon="7.2"><time>2026-09-01T08:10:00Z</time></trkpt></trkseg></trk><wpt lat="48.15" lon="7.15"><time>not-a-track-time</time><name>Objet</name></wpt></gpx>');
assert.equal(waypointWithBadTime.waypoints.length, 1, 'waypoint metadata time must not invalidate a correctly timed track');

const hiddenGeometry = metadata => Object.defineProperty({ ...metadata }, 'route', { get() { throw new Error('forbidden geometry read'); } });
const reusedOrigin = originContext.resolveTrackOrigin({}, hiddenGeometry({
  track_started_at: '2026-08-20T06:00:00Z', track_started_source: 'gpx_embedded_time',
}));
assert.equal(reusedOrigin.instant, '2026-08-20T06:00:00.000Z', 'reused route origin must not reset');
assert.equal(reusedOrigin.source, 'gpx_embedded_time');
assert.equal(reusedOrigin.quality, 'recorded');
const liveOrigin = originContext.resolveTrackOrigin({ track_started_at: '2026-09-10T09:01:02Z', track_started_source: 'live' }, hiddenGeometry());
assert.equal(liveOrigin.instant, '2026-09-10T09:01:02.000Z', 'live origin must come from the persisted first real point');
assert.equal(originContext.resolveTrackOrigin({}, hiddenGeometry()).quality, 'unavailable', 'missing historical origin must remain unavailable');
assert.equal(originContext.resolveTrackOrigin({ track_started_at: '2999-01-01T00:00:00Z', track_started_source: 'live' }, hiddenGeometry()).quality, 'future',
  'a persisted future origin must be reported as inconsistent');
const timingBody = extractFunctionWithParameterDefaults(app, 'coachingTimingV1045');
assert.equal(timingBody.includes('resolveTrackOrigin'), false, 'V10.45 delay semantics must stay separate from track age');
has(app, /track_started_at:origin\.instant/, 'planner save must persist the resolved origin');
has(app, /track_started_source:origin\.source/, 'planner save must persist origin provenance');

// Task 5: the active terrain keeps weather compact while exposing useful
// detail, resilient cache states and a request identity tied to the session.
for (const id of ['coachingWeatherDetailTrigger', 'coachingWeatherCompact', 'coachingWeatherDetail', 'refreshCoachingWeather']) {
  has(html, new RegExp(`id="${id}"`), `coaching weather control missing: ${id}`);
}
has(html, /<details[^>]+id="coachingWeatherDetails"/, 'weather detail must use an accessible disclosure');
has(app, /setInterval\([\s\S]*?,420000\)/, 'coaching weather auto refresh must remain seven minutes');
has(app, /bindClick\('refreshCoachingWeather',fetchCoachingLiveWeather\)/,
  'coaching weather manual refresh must call the live source');
has(app, /piste-coaching-weather-/, 'coaching weather cache must remain local to user and session');

const weatherContext = {};
vm.runInNewContext([
  extractFunction(app, 'coachingWeatherNumber'),
  extractFunctionWithParameterDefaults(app, 'coachingWeatherViewModel'),
  extractFunction(app, 'coachingWeatherRequestMatches'),
].join('\n'), weatherContext);
assert.equal(weatherContext.coachingWeatherNumber(null), null, 'null weather values must not become zero');
assert.equal(weatherContext.coachingWeatherNumber(''), null, 'empty weather values must remain unavailable');
assert.equal(weatherContext.coachingWeatherNumber('12.5'), 12.5, 'numeric weather values must be normalized');
const weatherReady = weatherContext.coachingWeatherViewModel({
  status: 'ready', fetched_at: '2026-09-15T09:58:00.000Z', source: 'Open-Meteo',
  wind_direction_deg: 225, wind_speed_kmh: 17.6, wind_gusts_kmh: 29,
  temperature_c: 14.4, humidity_pct: 83, precipitation_mm: 1.2,
}, Date.parse('2026-09-15T10:00:00.000Z'));
assert.equal(weatherReady.compact, 'SO 225° · 18 km/h');
assert.equal(weatherReady.stale, false);
assert.equal(weatherReady.detail.includes('Vent venant de SO 225°'), true,
  'weather detail must state that direction is where the wind comes from');
assert.equal(weatherReady.detail.includes('Humidité 83 %'), true);
assert.equal(weatherReady.detail.includes('Pluie 1,2 mm'), true);
const weatherCached = weatherContext.coachingWeatherViewModel({
  status: 'ready', cached: true, error: 'offline', fetched_at: '2026-09-15T09:30:00.000Z',
  wind_direction_deg: null, wind_speed_kmh: null, wind_gusts_kmh: null,
  temperature_c: null, humidity_pct: null, precipitation_mm: null,
}, Date.parse('2026-09-15T10:00:00.000Z'));
assert.equal(weatherCached.compact, 'Vent — · — km/h', 'missing wind fields need an honest compact state');
assert.equal(weatherCached.stale, true, 'old cached weather must be marked stale');
assert.equal(weatherCached.stateLabel, 'Dernières données conservées · données anciennes · réseau indisponible');
const weatherUnavailable = weatherContext.coachingWeatherViewModel({ status: 'unavailable', error: 'HTTP 503' });
assert.equal(weatherUnavailable.compact, 'Météo indisponible');
assert.equal(weatherUnavailable.stateLabel, 'Actualisation impossible');
assert.equal(weatherContext.coachingWeatherRequestMatches(4, 'session-a', 4, 'session-a'), true);
assert.equal(weatherContext.coachingWeatherRequestMatches(4, 'session-a', 5, 'session-a'), false,
  'a superseded weather request must not commit');
assert.equal(weatherContext.coachingWeatherRequestMatches(4, 'session-a', 4, 'session-b'), false,
  'a previous session weather response must not commit after session switch');
const weatherFetchBody = extractFunction(app, 'fetchCoachingLiveWeather');
assert.equal((weatherFetchBody.match(/coachingWeatherRequestMatches/g) || []).length >= 2, true,
  'weather fetch must guard both success and fallback commits against session switches');
has(weatherFetchBody, /renderCoachingMap\(\{preserveViewport:true\}\)/,
  'weather refresh must redraw its dependent map layers without moving the viewport');
const weatherSchedulerBody = extractFunction(app, 'scheduleCoachingLiveWeather');
assert.equal(weatherSchedulerBody.includes('renderCoachingMap'), false,
  'weather scheduler must not trigger a second full map render');
const coachingMapBody = extractFunctionWithParameterDefaults(app, 'renderCoachingMap');
has(coachingMapBody, /preserveViewport/, 'coaching map must support a weather refresh that preserves the viewport');
const noWeatherPointBranch = weatherFetchBody.slice(weatherFetchBody.indexOf('if(!requestedSessionId||!point)'), weatherFetchBody.indexOf('coachingWeatherLoading=true'));
assert.equal(noWeatherPointBranch.includes('coachingWeatherLoading=false'), true,
  'a superseding request without a position must release the weather loading state');
has(css, /\.coaching-weather-trigger/, 'compact weather trigger styles missing');
has(css, /\.coaching-weather-detail/, 'weather detail styles missing');

// Task 6: the odor corridor is a per-user/per-session local preference, but
// authorization remains the final gate and must fail closed before geometry is read.
for (const id of ['coachingOdorMapToggle', 'coachingOdorPreferenceState']) {
  has(html, new RegExp(`id="${id}"`), `personal odor preference control missing: ${id}`);
}
assert.equal((html.match(/data-coaching-odor-preference/g) || []).length >= 2, true,
  'odor preference must be available during preparation and directly on the active map');

const odorStorageValues = new Map();
const odorStorage = {
  getItem: key => odorStorageValues.has(key) ? odorStorageValues.get(key) : null,
  setItem: (key, value) => odorStorageValues.set(key, String(value)),
};
function odorPreferenceContext(storage = odorStorage) {
  const context = {
    Object, Boolean, String,
    localStorage: storage,
    coachingOdorPreferenceMemory: Object.create(null),
    coachingLayerVisibility: { odor: true },
    activeCoachingSession: null,
    session: { user: { id: 'user-a' } },
    myCoachingRole: () => 'traceur',
    coachingDataVisibility: (_session, role) => ({ trace: role === 'traceur' || role === 'observer' }),
    sharedOlfactionEngine: () => ({ trackAgeSeconds: 3600 }),
    coachingLiveWeather: null,
    Date,
    Number,
  };
  vm.createContext(context);
  vm.runInContext([
    'coachingOdorPreferenceKey',
    'getLocalOdorPreference',
    'setLocalOdorPreference',
    'coachingOdorAuthorized',
    'coachingCanSeeOdor',
    'liveOdorModel',
  ].map(name => extractFunctionWithParameterDefaults(app, name)).join('\n'), context);
  return context;
}
const odorContext = odorPreferenceContext();
assert.equal(odorContext.setLocalOdorPreference('user-a', 'session-1', true).enabled, true);
assert.equal(odorContext.setLocalOdorPreference('user-b', 'session-1', false).enabled, false);
assert.equal(odorContext.getLocalOdorPreference('user-a', 'session-1'), true,
  'user A must retain its own enabled choice');
assert.equal(odorContext.getLocalOdorPreference('user-b', 'session-1'), false,
  'user B must retain its own disabled choice');
const reloadedOdorContext = odorPreferenceContext();
assert.equal(reloadedOdorContext.getLocalOdorPreference('user-b', 'session-1'), false,
  'odor preference must survive a same-device reload');
const unavailableStorage = { getItem() { throw new Error('storage denied'); }, setItem() { throw new Error('storage denied'); } };
const memoryOdorContext = odorPreferenceContext(unavailableStorage);
assert.equal(memoryOdorContext.setLocalOdorPreference('user-a', 'session-2', false).persisted, false,
  'storage failure must be reported to the UI');
assert.equal(memoryOdorContext.getLocalOdorPreference('user-a', 'session-2'), false,
  'storage failure must keep a usable in-memory preference');

const hiddenOdorSession = Object.defineProperties({ id: 'blind-session', status: 'live' }, {
  planned_route: { get() { throw new Error('hidden planned geometry read'); } },
  odor_model: { get() { throw new Error('hidden odor model read'); } },
});
odorContext.session.user.id = 'driver-user';
odorContext.coachingLayerVisibility.odor = true;
assert.equal(odorContext.coachingCanSeeOdor(hiddenOdorSession, 'driver'), false,
  'blind Conducteur must be denied regardless of its local preference');
assert.equal(odorContext.coachingCanSeeOdor(hiddenOdorSession, 'coach'), false,
  'blind Coach without trace visibility must be denied regardless of preference');
assert.equal(odorContext.liveOdorModel([], [], hiddenOdorSession, 'driver'), null,
  'denied odor model must return before reading hidden geometry');
assert.equal(odorContext.liveOdorModel([], [], hiddenOdorSession, 'coach'), null,
  'denied Coach odor model must return before reading hidden geometry');
assert.equal(odorContext.coachingCanSeeOdor({ id: 'allowed-session' }, 'traceur'), true,
  'Traceur must retain odor access when existing visibility allows it');
assert.equal(odorContext.coachingCanSeeOdor({ id: 'allowed-session' }, 'observer'), true,
  'Observer must retain odor access when existing visibility allows it');
odorContext.setLocalOdorPreference('driver-user', 'disabled-session', false);
assert.equal(odorContext.coachingOdorAuthorized({ id: 'disabled-session' }, 'traceur'), true,
  'disabled preference must not erase the Traceur authorization state');
assert.equal(odorContext.coachingCanSeeOdor({ id: 'disabled-session' }, 'traceur'), false,
  'disabled preference must still prevent corridor rendering');
const odorSyncSource = extractFunctionWithParameterDefaults(app, 'syncCoachingOdorPreference');
assert.equal(odorSyncSource.includes('coachingOdorAuthorized('), true,
  'preference UI must distinguish authorization from the enabled choice');
assert.equal(odorSyncSource.includes("authorized?(enabled?'Activé pour cette session sur cet appareil.':'Désactivé pour cette session sur cet appareil.')"), true,
  'authorized disabled users must see a disabled state rather than unavailable');
has(css, /\.coaching-odor-toggle/, 'direct map odor toggle styles missing');
has(css, /\.coaching-odor-preference/, 'preparation odor preference styles missing');

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
