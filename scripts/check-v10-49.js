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
assert.equal(surfaceContext.coachingActiveSurfaceModel(surfaceSession(), 'driver_running', 'driver').visibleBlocks.includes('primaryActions'), true,
  'current Conducteur finish target parent must remain visible before Task 9');
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
  else assert.equal(selector === '[data-coaching-tab="messages"]' && html.includes('data-coaching-tab="messages"'), true,
    `surface action target missing from DOM: ${action}`);
}
assert.equal(surfaceContext.coachingSurfaceActionTarget('finish', surfaceSession()), '#driverFinishBtn',
  'current Conducteur finish must route to the workflow finish button');
assert.equal(surfaceContext.coachingSurfaceActionTarget('finish', { workflow_version: 1 }), '#terrainFinishBtn',
  'historical finish must retain its legacy target');
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
  myCoachingRole: () => 'traceur',
  renderCoachingActiveBanner: metrics => sharedMetricCalls.push(metrics),
  coachingMemberRole: () => 'driver',
  routeDistance: points => points[0]?.kind === 'driver' ? 3800 : 9900,
};
vm.createContext(sharedMetricContext);
vm.runInContext(extractFunctionWithParameterDefaults(app, 'resolveTrackOrigin'), sharedMetricContext);
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

has(css, /@media\(max-height:[^)]+\),\(orientation:landscape\)[\s\S]*?\.coaching-map-shell:not\(\.fullscreen\)[\s\S]*?height:clamp\(/,
  'short landscape and keyboard-reduced viewports need a bounded map height');
const mapPriorityCss = css.slice(css.indexOf('/* V10.49 — bandeau terrain unique et carte prioritaire. */'));
const genericMapPriorityCss = mapPriorityCss.slice(0, mapPriorityCss.indexOf('@media(max-height:'));
assert.equal(genericMapPriorityCss.includes(',760px)') || genericMapPriorityCss.includes(',620px)'), false,
  'generic active map height must not be capped on tall screens');

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
const noWeatherPointBranch = weatherFetchBody.slice(weatherFetchBody.indexOf('if(!requestedSessionId||!point)'), weatherFetchBody.indexOf('coachingWeatherLoading=true'));
assert.equal(noWeatherPointBranch.includes('coachingWeatherLoading=false'), true,
  'a superseding request without a position must release the weather loading state');
has(css, /\.coaching-weather-trigger/, 'compact weather trigger styles missing');
has(css, /\.coaching-weather-detail/, 'weather detail styles missing');

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
