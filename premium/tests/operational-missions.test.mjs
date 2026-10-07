import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationalMissionStore } from '../src/operational-missions.mjs';

const dog = { id: 'nox', name: 'Nox', breed: 'Berger belge malinois' };
const handler = { id: 'sebastien', name: 'Sébastien' };
const point = { x: 24, y: 68 };

function store() {
  let nextId = 0;
  return createOperationalMissionStore({ idFactory: () => `mission-${++nextId}`, clock: () => 0 });
}

test('une mission commence en brouillon avec les acteurs requis et sans données facultatives inventées', () => {
  const missions = store();
  const draft = missions.createDraft({ dog, handler });

  assert.equal(draft.kind, 'operational');
  assert.equal(draft.schemaVersion, 2);
  assert.equal(draft.entryMode, 'quick');
  assert.equal(draft.status, 'Brouillon');
  assert.equal(draft.dogId, 'nox');
  assert.deepEqual(draft.handler, handler);
  assert.equal(draft.lastKnownPoint, null);
  assert.deepEqual(draft.trace, []);
  assert.deepEqual(draft.events, []);
  assert.equal(draft.olfactoryCorridorEnabled, false);
  assert.equal(draft.details.searchedPerson, null);
  assert.equal(missions.get(draft.id).id, draft.id);
});

test('le chien est nécessaire au démarrage; le dernier point connu est facultatif', () => {
  const missions = store();
  assert.throws(() => missions.createDraft({ handler }), /chien/i);
  assert.throws(() => missions.createDraft({ dog }), /conducteur/i);

  const draft = missions.createDraft({ dog, handler });
  const active = missions.start(draft.id);
  assert.equal(active.status, 'En cours');
  assert.equal(active.lastKnownPoint, null);
  assert.equal(active.startedAt !== undefined, true);
});

test('les points de mission sont des coordonnées de carte mock, jamais des coordonnées GPS', () => {
  const missions = store();
  const active = missions.start(missions.createDraft({ dog, handler }).id, { lastKnownPoint: point });

  assert.deepEqual(active.lastKnownPoint, { ...point, space: 'mock-map' });
  assert.throws(() => missions.addProgressPoint(active.id, { lat: 48.1, lon: 2.3 }), /mock|coordonnée/i);
  const secondDraft = missions.createDraft({ dog, handler });
  assert.throws(() => missions.start(secondDraft.id, { lastKnownPoint: { latitude: 48.1, longitude: 2.3 } }), /mock|coordonnée/i);
});

test('En cours peut passer immédiatement à À compléter puis Terminée sans champs facultatifs', () => {
  const missions = store();
  const active = missions.start(missions.createDraft({ dog, handler }).id);

  const fieldClosed = missions.closeField(active.id);
  assert.equal(fieldClosed.status, 'À compléter');
  assert.equal(fieldClosed.details.searchedPerson, null);
  assert.equal(fieldClosed.details.result, null);

  const completed = missions.complete(active.id);
  assert.equal(completed.status, 'Terminée');
  assert.equal(completed.details.context, null);
});

test('les transitions sont explicites et une mission archivée reste en lecture seule', () => {
  const missions = store();
  const draft = missions.createDraft({ dog, handler });
  assert.throws(() => missions.complete(draft.id), /transition|statut|compléter/i);

  missions.start(draft.id);
  missions.closeField(draft.id);
  const completed = missions.complete(draft.id);
  const archived = missions.archive(draft.id);
  assert.equal(archived.status, 'Archivée');
  assert.throws(() => missions.updateDetails(draft.id, { notes: 'modification' }), /lecture seule|archiv/i);
  assert.throws(() => missions.setCorridorEnabled(draft.id, true), /lecture seule|archiv/i);
  assert.equal(missions.get(draft.id).status, 'Archivée');
  assert.equal(completed.status, 'Terminée');
});

test('le couloir est indépendant, sauvegardé sur la mission et traverse la clôture terrain', () => {
  const missions = store();
  const active = missions.start(missions.createDraft({ dog, handler }).id);

  assert.equal(missions.setCorridorEnabled(active.id, true).olfactoryCorridorEnabled, true);
  assert.equal(missions.get(active.id).olfactoryCorridor.enabled, true);
  assert.equal(missions.closeField(active.id).olfactoryCorridorEnabled, true);
  assert.equal(missions.complete(active.id).olfactoryCorridorEnabled, true);
});

test('âge de piste et horodatages sont figés au départ et à l’arrêt, sans dépendre du chrono actif', () => {
  let clock = Date.parse('2026-10-06T10:15:00Z');
  const missions = createOperationalMissionStore({ idFactory: () => 'age-1', clock: () => clock });
  const draft = missions.createDraft({ dog, handler, time: { disappearanceAt: '2026-10-06T08:33:00Z' }, places: { interventionAddress: 'Gare', confirmedTrackStart: null } });
  assert.equal(draft.kind, 'operational');
  assert.equal(draft.trackingState, 'ready');
  assert.equal(draft.places.interventionAddress, 'Gare');
  assert.equal(draft.places.confirmedTrackStart, null);
  clock += 20_000;
  const active = missions.startTracking(draft.id);
  assert.equal(active.time.trackAgeAtStart.label, '1 h 42');
  assert.equal(active.time.trackAgeAtStart.source, 'disappearanceAt');
  assert.equal(active.time.trackingStartedAt, clock);
  assert.equal(active.trackingElapsedMs, 0);
  clock += 10_000;
  missions.pauseTracking(draft.id);
  clock += 60_000;
  missions.resumeTracking(draft.id);
  clock += 10_000;
  const stopped = missions.stopTracking(draft.id);
  assert.equal(stopped.time.trackingActiveDurationMs, 20_000);
  assert.equal(stopped.time.pauseDurationMs, 60_000);
  assert.equal(stopped.time.trackAgeAtStop.label, '1 h 43');
  assert.equal(stopped.time.trackAgeAtStart.label, '1 h 42');
});

test('progression, événements et détails facultatifs sont éditables seulement avant finalisation', () => {
  const missions = store();
  const active = missions.start(missions.createDraft({ dog, handler }).id);
  missions.addProgressPoint(active.id, point);
  missions.addEvent(active.id, { type: 'Indice', note: '' });
  missions.updateDetails(active.id, { searchedPerson: 'Personne recherchée', context: 'Bois' });
  const updated = missions.get(active.id);

  assert.deepEqual(updated.trace[0], { ...point, space: 'mock-map', sequence: 1, role: 'departure', elapsedMs: 0, label: 'Départ' });
  assert.equal(updated.events[0].type, 'Indice');
  assert.equal(updated.events[0].note, null);
  assert.equal(updated.details.searchedPerson, 'Personne recherchée');
  missions.closeField(active.id);
  missions.complete(active.id);
  assert.throws(() => missions.addEvent(active.id, { type: 'Rupture' }), /lecture seule|termin/i);
});

test('les snapshots sont isolés et clear ne conserve rien', () => {
  const missions = store();
  const active = missions.start(missions.createDraft({ dog, handler }).id);
  const snapshot = missions.get(active.id);
  snapshot.handler.name = 'Altéré';
  snapshot.events.push({ type: 'Objet trouvé' });
  assert.equal(missions.get(active.id).handler.name, 'Sébastien');
  assert.deepEqual(missions.get(active.id).events, []);

  const listed = missions.list();
  listed[0].dog.name = 'Altéré';
  assert.equal(missions.get(active.id).dog.name, 'Nox');
  missions.clear();
  assert.deepEqual(missions.list(), []);
});
