import test from 'node:test';
import assert from 'node:assert/strict';
import { OperationalScreen } from '../src/operational-screen.mjs';
import { createOperationalMissionStore } from '../src/operational-missions.mjs';
import { operationalMissionView } from '../src/operational-views.mjs';
import { createHoldToUnlockController } from '../src/operational-lock.mjs';

const dog = { id: 'nox', name: 'Nox', breed: 'Malinois' };
const handler = { id: 'h1', name: 'Sébastien' };
const setup = () => {
  const store = createOperationalMissionStore({ idFactory: () => 'screen-mission', clock: () => 10_000 });
  const draft = store.createDraft({ dog, handler });
  return { store, draft };
};
const render = (mission, ui = {}) => OperationalScreen({ route: { type: 'mission', missionId: mission.id }, view: operationalMissionView(mission), ui });

test('l’écran prêt propose Commencer le pistage sans fermer prématurément la mission', () => {
  const { draft } = setup();
  const html = render(draft);
  assert.match(html, /data-operational-action="start"[^>]*>Commencer le pistage/);
  assert.match(html, /data-operational-tracking-state="ready"/);
  assert.doesNotMatch(html, /data-operational-action="close-field"/);
});

test('le suivi actif propose pause et arrêt distincts', () => {
  const { store, draft } = setup();
  const active = store.startTracking(draft.id);
  const html = render(active);
  assert.match(html, /data-operational-action="pause">Pause/);
  assert.match(html, /data-operational-action="stop">Arrêter le pistage/);
  assert.match(html, /data-operational-can-progress="true"/);
});

test('en pause, la progression est indisponible mais les événements manuels restent accessibles', () => {
  const { store, draft } = setup();
  store.startTracking(draft.id);
  store.pauseTracking(draft.id);
  const html = render(store.get(draft.id), { mode: 'event', eventType: 'Indice' });
  assert.match(html, /data-operational-action="resume">Reprendre/);
  assert.match(html, /data-operational-action="stop">Arrêter le pistage/);
  assert.doesNotMatch(html, /data-operational-map-mode="progress"/);
  assert.match(html, /data-operational-map-mode="event"/);
  assert.match(html, /data-operational-can-progress="false"/);
});

test('après arrêt, les commandes terrain disparaissent et Terminer reste explicite', () => {
  const { store, draft } = setup();
  store.startTracking(draft.id);
  store.stopTracking(draft.id);
  const html = render(store.get(draft.id));
  assert.match(html, /data-operational-action="complete">Terminer la mission/);
  assert.doesNotMatch(html, /data-operational-action="pause"|data-operational-action="resume"|data-operational-action="stop"/);
});

test('le journal affiche l’heure T+ simulée et les actions de suivi dans l’ordre', () => {
  let clock = 20_000;
  const store = createOperationalMissionStore({ idFactory: () => 'journal-mission', clock: () => clock });
  const draft = store.createDraft({ dog, handler });
  store.startTracking(draft.id);
  clock += 4_000;
  store.pauseTracking(draft.id);
  store.addEvent(draft.id, { type: 'Fin de piste', note: 'Lisière' });
  const html = render(store.get(draft.id));
  assert.match(html, /data-operational-journal-kind="tracking_started"/);
  assert.match(html, /data-operational-journal-kind="tracking_paused"/);
  assert.match(html, /data-operational-journal-kind="terrain_event"/);
  assert.match(html, /Fin de piste/);
  assert.match(html, /T\+00:00:04 · simulation/);
});

test('l’écran verrouillé ne montre que le HUD mock et le maintien de déverrouillage', async () => {
  const { OperationalTerrainScreen } = await import('../src/operational-screen.mjs');
  const { store, draft } = setup();
  const active = store.startTracking(draft.id);
  const html = OperationalTerrainScreen(operationalMissionView(active));
  assert.match(html, /data-operational-terrain/);
  assert.match(html, /data-operational-chrono/);
  assert.match(html, /GPS.*Simulation/);
  assert.match(html, /PISTE · ÉCRAN VERROUILLÉ/);
  assert.match(html, /Maintenir 2 secondes pour déverrouiller/);
  assert.equal((html.match(/<button\b/g) || []).length, 1);
  assert.doesNotMatch(html, />Pause</);
  assert.doesNotMatch(html, />Reprendre</);
  assert.doesNotMatch(html, /Quitter/);
  const missionHtml = render(active);
  assert.match(missionHtml, /Verrouillage simulé · l’écran de l’appareil reste actif\./);
  assert.doesNotMatch(html, /navigator\.geolocation|wakeLock|localStorage/);
});

test('le verrouillage est une couche UI sur la même mission sans modifier son état', async () => {
  const { OperationalTerrainScreen } = await import('../src/operational-screen.mjs');
  let clock = 10_000;
  const store = createOperationalMissionStore({ idFactory: () => 'lock-mission', clock: () => clock });
  const draft = store.createDraft({ dog, handler });
  store.startTracking(draft.id);
  clock += 2_000;
  store.pauseTracking(draft.id);
  store.setCorridorEnabled(draft.id, true);
  store.addEvent(draft.id, { type: 'Indice', note: 'lisière' });
  const before = operationalMissionView(store.get(draft.id));
  const html = OperationalTerrainScreen(before);
  const after = operationalMissionView(store.get(draft.id));
  assert.match(html, new RegExp(`data-operational-mission-id="${draft.id}"`));
  assert.equal(after.trackingState, before.trackingState);
  assert.equal(after.trackingElapsedMs, before.trackingElapsedMs);
  assert.equal(after.status, before.status);
  assert.equal(after.corridor.enabled, before.corridor.enabled);
  assert.deepEqual(after.events.map(event => event.id), before.events.map(event => event.id));
});

test('un simple tap ou un maintien inférieur à 2 secondes annule le déverrouillage', () => {
  let timer;
  let unlocked = 0;
  let progress = [];
  const controller = createHoldToUnlockController({
    durationMs: 2_000,
    schedule(callback, delay) { timer = { callback, delay }; return timer; },
    cancelSchedule(handle) { if (handle === timer) timer = null; },
    onProgress(value) { progress.push(value); },
    onUnlock() { unlocked += 1; }
  });
  controller.press();
  controller.release();
  assert.equal(unlocked, 0);
  assert.equal(progress.at(-1), 0);
  controller.press();
  assert.equal(timer.delay, 2_000);
  controller.release();
  timer?.callback();
  assert.equal(unlocked, 0);
  assert.equal(progress.at(-1), 0);
});

test('un maintien complet de 2 secondes déverrouille exactement une fois', () => {
  let timer;
  let unlocked = 0;
  let progress = [];
  const controller = createHoldToUnlockController({
    durationMs: 2_000,
    schedule(callback, delay) { timer = { callback, delay }; return timer; },
    cancelSchedule() { timer = null; },
    onProgress(value) { progress.push(value); },
    onUnlock() { unlocked += 1; }
  });
  controller.press();
  assert.equal(progress.at(-1), 1);
  timer.callback();
  assert.equal(unlocked, 1);
  assert.equal(progress.at(-1), 1);
  controller.release();
  assert.equal(unlocked, 1);
});
