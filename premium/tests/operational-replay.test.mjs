import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationalMissionStore } from '../src/operational-missions.mjs';
import { operationalMissionView, operationalReplayView } from '../src/operational-views.mjs';
import { OperationalScreen } from '../src/operational-screen.mjs';
import { OperationalReplayScreen } from '../src/operational-replay-screen.mjs';

const dog = { id: 'nox', name: 'Nox', breed: 'Malinois' };
const handler = { id: 'driver-1', name: 'Sébastien' };
const point = { x: 20, y: 40 };

function createFinalMission({ archived = false, corridor = false } = {}) {
  const store = createOperationalMissionStore({ idFactory: () => 'mission-1' });
  const active = store.start(store.createDraft({ dog, handler }).id, { lastKnownPoint: point });
  store.addProgressPoint(active.id, { x: 35, y: 48 });
  store.addEvent(active.id, { type: 'Indice', note: 'Lisière', point: { x: 35, y: 48 } });
  store.setWeatherDemo(active.id, true);
  store.setCorridorEnabled(active.id, corridor);
  store.closeField(active.id);
  const completed = store.complete(active.id);
  return { store, mission: archived ? store.archive(active.id) : completed };
}

test('le bouton du couloir est indépendant et reste visible comme ESTIMÉ · simulation', () => {
  const store = createOperationalMissionStore({ idFactory: () => 'mission-1' });
  const active = store.start(store.createDraft({ dog, handler }).id);
  const view = operationalMissionView(active);
  const html = OperationalScreen({ route: { type: 'mission', missionId: active.id }, view });

  assert.match(html, /data-operational-corridor-toggle="on"/);
  assert.match(html, /Couloir olfactif/);
  assert.match(html, /ESTIMÉ · simulation/);
  assert.equal(store.setCorridorEnabled(active.id, true).status, 'En cours');
  assert.equal(store.setCorridorEnabled(active.id, false).status, 'En cours');
});

test('le replay restitue la carte et le couloir seulement si celui-ci était activé', () => {
  const { mission: enabled } = createFinalMission({ corridor: true });
  const replayView = operationalReplayView(enabled);
  const html = OperationalReplayScreen(replayView);

  assert.match(html, /data-operational-replay="mission-1"/);
  assert.match(html, /data-operational-progress/);
  assert.match(html, /data-operational-event="Indice"/);
  assert.match(html, /ESTIMÉ · simulation/);
  assert.match(html, /Démonstration · non mesuré/);
  assert.match(html, /Lecture seule/);

  const { mission: disabled } = createFinalMission({ corridor: false });
  assert.doesNotMatch(OperationalReplayScreen(operationalReplayView(disabled)), /ESTIMÉ · simulation/);
});

test('le replay indique les éléments indisponibles et ne crée aucune trace ou donnée', () => {
  const store = createOperationalMissionStore({ idFactory: () => 'mission-1' });
  const active = store.start(store.createDraft({ dog, handler }).id);
  store.closeField(active.id);
  const completed = store.complete(active.id);
  const html = OperationalReplayScreen(operationalReplayView(completed));

  assert.match(html, /Tracé terrain indisponible/);
  assert.match(html, /Événements indisponibles/);
  assert.equal(store.get(active.id).trace.length, 0);
  assert.equal(store.get(active.id).events.length, 0);
  assert.equal(store.get(active.id).weatherDemo, null);
});

test('terminée et archivée sont lecture seule; les actions du couloir et de fiche disparaissent', () => {
  for (const archived of [false, true]) {
    const { mission } = createFinalMission({ archived, corridor: true });
    const view = operationalMissionView(mission);
    const html = OperationalScreen({ route: { type: 'mission', missionId: mission.id }, view });
    assert.equal(view.readOnly, true);
    assert.doesNotMatch(html, /data-operational-corridor-toggle/);
    assert.doesNotMatch(html, /data-operational-details-form/);
    assert.match(html, /Ouvrir le replay/);
  }
});
