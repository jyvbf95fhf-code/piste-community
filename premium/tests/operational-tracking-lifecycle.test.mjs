import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationalMissionStore } from '../src/operational-missions.mjs';

const dog = { id: 'nox', name: 'Nox' };
const handler = { id: 'sebastien', name: 'Sébastien' };
const point = { x: 20, y: 40 };

function setup() {
  let clock = 1_000;
  const store = createOperationalMissionStore({
    idFactory: () => 'mission-1',
    clock: () => clock
  });
  const mission = store.createDraft({ dog, handler });
  return { store, mission, advance: ms => { clock += ms; } };
}

test('une mission créée reste prête jusqu’au démarrage explicite du pistage', () => {
  const { store, mission } = setup();

  assert.equal(mission.status, 'Brouillon');
  assert.equal(mission.trackingState, 'ready');
  assert.equal(mission.trackingStartedAt, null);
  assert.equal(store.trackingElapsedMs(mission.id), 0);
});

test('le chrono simulé exclut pause et reprise et se fige à l’arrêt', () => {
  const { store, mission, advance } = setup();
  store.startTracking(mission.id);
  advance(5_000);
  assert.equal(store.trackingElapsedMs(mission.id), 5_000);

  store.pauseTracking(mission.id);
  advance(20_000);
  assert.equal(store.trackingElapsedMs(mission.id), 5_000);
  store.resumeTracking(mission.id);
  advance(3_000);
  const stopped = store.stopTracking(mission.id);
  assert.equal(stopped.status, 'À compléter');
  assert.equal(stopped.trackingState, 'stopped');
  assert.equal(store.trackingElapsedMs(mission.id), 8_000);
  advance(60_000);
  assert.equal(store.trackingElapsedMs(mission.id), 8_000);
});

test('le double démarrage et les transitions de suivi invalides sont refusés', () => {
  const { store, mission } = setup();
  store.startTracking(mission.id);
  assert.throws(() => store.startTracking(mission.id), /transition|suivi|statut/i);
  assert.throws(() => store.resumeTracking(mission.id), /transition|pause|état/i);
  store.stopTracking(mission.id);
  assert.throws(() => store.pauseTracking(mission.id), /transition|arrêt|statut/i);
  assert.throws(() => store.addProgressPoint(mission.id, point), /suivi|progression|état/i);
});

test('la progression est interdite en pause mais les événements manuels restent consignables au même T+', () => {
  const { store, mission, advance } = setup();
  store.startTracking(mission.id);
  store.addProgressPoint(mission.id, point);
  advance(4_000);
  store.pauseTracking(mission.id);
  advance(30_000);

  assert.throws(() => store.addProgressPoint(mission.id, { x: 35, y: 45 }), /pause|suivi|progression/i);
  store.addEvent(mission.id, { type: 'Indice', note: 'Sous les pins', point });
  store.addEvent(mission.id, { type: 'Fin de piste', point });
  assert.deepEqual(store.get(mission.id).events.map(event => event.elapsedMs), [4_000, 4_000]);
  assert.equal(store.trackingElapsedMs(mission.id), 4_000);
  assert.equal(store.get(mission.id).status, 'En cours');
});

test('Départ, progression et Fin du suivi sont distincts de l’événement Fin de piste', () => {
  const { store, mission, advance } = setup();
  store.startTracking(mission.id);
  store.addProgressPoint(mission.id, point);
  advance(2_000);
  store.addProgressPoint(mission.id, { x: 30, y: 50 });
  store.addEvent(mission.id, { type: 'Fin de piste', point: { x: 30, y: 50 } });
  const stopped = store.stopTracking(mission.id);

  assert.deepEqual(stopped.trace.map(item => item.role), ['departure', 'progress']);
  assert.equal(stopped.trace.at(-1).isTrackingEnd, true);
  assert.equal(stopped.events.at(-1).type, 'Fin de piste');
  assert.notEqual(stopped.events.at(-1).id, stopped.journal.at(-1).id);
  assert.deepEqual(stopped.journal.map(item => item.kind), [
    'tracking_started', 'progress', 'progress', 'terrain_event', 'tracking_stopped', 'ready_to_complete'
  ]);
});

test('archiver exige Terminée et suivi arrêté; À compléter ne peut pas être archivée directement', () => {
  const { store, mission } = setup();
  store.startTracking(mission.id);
  store.stopTracking(mission.id);

  assert.throws(() => store.archive(mission.id), /Terminée|transition|statut/i);
  const completed = store.complete(mission.id);
  assert.equal(completed.status, 'Terminée');
  assert.equal(completed.trackingState, 'stopped');
  const archived = store.archive(mission.id);
  assert.equal(archived.status, 'Archivée');
  assert.equal(archived.trackingState, 'stopped');
  assert.deepEqual(archived.journal.slice(-2).map(item => item.kind), ['mission_completed', 'mission_archived']);
});
