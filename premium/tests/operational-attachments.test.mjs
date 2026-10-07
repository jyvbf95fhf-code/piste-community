import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationalMissionStore } from '../src/operational-missions.mjs';
import { gpxFixtures, createTrackLibrary } from '../src/track-library.mjs';
import { operationalMissionView } from '../src/operational-views.mjs';
import { OperationalScreen } from '../src/operational-screen.mjs';

const dog = { id: 'nox', name: 'Nox' };
const handler = { id: 'driver-1', name: 'Sébastien' };

function awaitingMission() {
  const store = createOperationalMissionStore({ idFactory: () => 'mission-1' });
  const active = store.start(store.createDraft({ dog, handler }).id);
  return { store, mission: store.closeField(active.id) };
}

test('une mission peut enregistrer ses informations facultatives sans les exiger à la clôture ni à la fin', () => {
  const { store, mission } = awaitingMission();
  store.updateDetails(mission.id, { searchedPerson: '  Alex  ', context: '', notes: 'Repère forêt' });
  assert.equal(store.get(mission.id).details.searchedPerson, 'Alex');
  assert.equal(store.get(mission.id).details.context, null);
  assert.equal(store.complete(mission.id).status, 'Terminée');
});

test('le GPX de démonstration ne joint que des métadonnées et ne modifie pas la bibliothèque de tracés', () => {
  let nextId = 0;
  const store = createOperationalMissionStore({ idFactory: () => `mission-${++nextId}` });
  const active = store.start(store.createDraft({ dog, handler }).id);
  const mission = store.closeField(active.id);
  const library = createTrackLibrary();
  const before = library.list();
  const fixture = gpxFixtures[0];
  const attached = store.attachGpxDemo(mission.id, fixture.id);

  assert.deepEqual(library.list(), before);
  assert.equal(attached.gpxAttachment.fixtureId, fixture.id);
  assert.equal(attached.gpxAttachment.fileName, fixture.fileName);
  assert.equal(attached.gpxAttachment.geometry, null);
  assert.throws(() => store.attachGpxDemo(mission.id, 'unknown'), /démonstration/i);
  const secondActive = store.start(store.createDraft({ dog, handler }).id);
  assert.throws(() => store.attachGpxDemo(secondActive.id, fixture.id), /indisponible au statut En cours/);
});

test('la météo mock est explicitement démonstrative et peut être retirée sans bloquer la mission', () => {
  const { store, mission } = awaitingMission();
  const enabled = store.setWeatherDemo(mission.id, true);
  assert.equal(enabled.weatherDemo.label, 'Démonstration · non mesuré');
  assert.equal(enabled.weatherDemo.speed, '8 km/h · simulation');
  assert.equal(store.setWeatherDemo(mission.id, false).weatherDemo, null);
  assert.equal(store.complete(mission.id).status, 'Terminée');
});

test('la fiche facultative est éditable avant finalisation; GPX et météo n’acceptent aucun fichier réel', () => {
  const { store, mission } = awaitingMission();
  const html = OperationalScreen({ route: { type: 'mission', missionId: mission.id }, view: operationalMissionView(mission) });

  assert.match(html, /data-operational-details-form/);
  assert.match(html, /Personne recherchée/);
  assert.match(html, /Observations/);
  assert.match(html, /data-operational-gpx-choice/);
  assert.match(html, /data-operational-weather-toggle/);
  assert.match(html, /Démonstration · non mesuré/);
  assert.doesNotMatch(html, /type="file"/);
  assert.doesNotMatch(html, /required[^>]*name="searchedPerson"|name="searchedPerson"[^>]*required/);
});
