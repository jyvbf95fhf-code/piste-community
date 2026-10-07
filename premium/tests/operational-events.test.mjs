import test from 'node:test';
import assert from 'node:assert/strict';
import { OPERATIONAL_EVENT_TYPES, createOperationalMissionStore } from '../src/operational-missions.mjs';
import { operationalMissionView } from '../src/operational-views.mjs';
import { OperationalScreen } from '../src/operational-screen.mjs';

const dog = { id: 'nox', name: 'Nox' };
const handler = { id: 'handler', name: 'Sébastien' };
const point = { x: 40, y: 65, space: 'mock-map' };

test('tous les événements terrain sont disponibles sans rendre Fin de piste terminale', () => {
  const store = createOperationalMissionStore({ idFactory: () => 'mission-1' });
  const active = store.start(store.createDraft({ dog, handler }).id);
  for (const type of OPERATIONAL_EVENT_TYPES) store.addEvent(active.id, { type, point });

  const mission = store.get(active.id);
  assert.equal(mission.status, 'En cours');
  assert.equal(mission.events.length, 8);
  assert.equal(mission.events.at(-1).type, 'Fin de piste');
  assert.equal(mission.events.every(event => event.point.space === 'mock-map'), true);
});

test('les actions de carte séparent le placement d’une progression et celui d’un événement', () => {
  const store = createOperationalMissionStore({ idFactory: () => 'mission-1' });
  const active = store.start(store.createDraft({ dog, handler }).id);
  store.addProgressPoint(active.id, point);
  store.addEvent(active.id, { type: 'Indice', point });
  const view = operationalMissionView(store.get(active.id));
  const html = OperationalScreen({ route: { type: 'mission', missionId: active.id }, view, ui: { mode: 'event', eventType: 'Indice' } });

  assert.match(html, /data-operational-map-mode="progress"/);
  assert.match(html, /data-operational-map-mode="event"/);
  assert.match(html, /data-operational-map-mode="event"[^>]*aria-pressed="true"/);
  assert.match(html, /data-operational-event-type/);
  assert.match(html, /data-operational-event-log/);
  assert.match(html, /T\+00:00:00 · simulation/);
});

test('les commandes terrain sont masquées après clôture et aucune donnée facultative ne bloque la clôture', () => {
  const store = createOperationalMissionStore({ idFactory: () => 'mission-1' });
  const active = store.start(store.createDraft({ dog, handler }).id);
  const awaiting = store.closeField(active.id);
  const view = operationalMissionView(awaiting);
  const html = OperationalScreen({ route: { type: 'mission', missionId: active.id }, view });

  assert.match(html, /À compléter/);
  assert.match(html, /data-operational-action="complete"/);
  assert.doesNotMatch(html, /data-operational-map-mode=/);
  assert.equal(awaiting.details.searchedPerson, null);
  assert.equal(awaiting.details.result, null);
});
