import test from 'node:test';
import assert from 'node:assert/strict';
import { MapShell } from '../src/map-shell.mjs';
import { OperationalMap } from '../src/operational-map.mjs';

const missionView = {
  id: 'mission-1',
  status: 'En cours',
  title: 'Mission terrain · Nox',
  dogName: 'Nox',
  lastKnownPoint: { x: 12, y: 24, space: 'mock-map' },
  progress: [{ x: 40, y: 55, space: 'mock-map', sequence: 1, label: 'Progression 1' }],
  events: [{ id: 'event-1', type: 'Indice', note: 'Sous le pin', point: { x: 55, y: 65, space: 'mock-map' }, timeLabel: 'Événement 1 · simulation' }],
  corridor: { enabled: true, label: 'ESTIMÉ · simulation' }
};

const coachingView = {
  start: { x: 40, y: 50 },
  showStart: true,
  paths: [{ kind: 'search', label: 'Tracé Conducteur', d: 'M40 50 L80 90' }],
  markers: [{ id: 'driver', role: 'driver', name: 'Conducteur', freshness: 'fresh', x: 80, y: 90 }],
  viewerId: 'driver',
  orientation: null,
  arrival: null
};

test('la carte opérationnelle montre départ, progression, événements et le couloir uniquement quand il est activé', () => {
  const markup = OperationalMap(missionView, { interactive: true });

  assert.match(markup, /data-operational-map="mission-1"/);
  assert.match(markup, /data-operational-start/);
  assert.match(markup, /data-operational-progress/);
  assert.match(markup, /data-operational-event="Indice"/);
  assert.match(markup, /data-operational-interactive="true"/);
  assert.match(markup, /ESTIMÉ · simulation/);
  assert.match(markup, /Aucune donnée GPS réelle/);
});

test('la trace mock matérialise son premier point comme départ et son dernier comme fin de suivi', () => {
  const markup = OperationalMap({
    ...missionView,
    lastKnownPoint: null,
    progress: [
      { x: 25, y: 30, space: 'mock-map', sequence: 1, role: 'departure', label: 'Départ' },
      { x: 45, y: 55, space: 'mock-map', sequence: 2, role: 'progress', label: 'Progression 1' },
      { x: 65, y: 75, space: 'mock-map', sequence: 3, role: 'progress', label: 'Progression 2', isTrackingEnd: true }
    ],
    trackingState: 'stopped',
    events: [{ ...missionView.events[0], type: 'Fin de piste' }]
  });

  assert.match(markup, /data-operational-start="true"/);
  assert.match(markup, /DÉPART/);
  assert.match(markup, /data-operational-tracking-end="true"/);
  assert.match(markup, /FIN DU SUIVI/);
  assert.match(markup, /data-operational-event="Fin de piste"/);
});

test('la carte de mission ne fabrique pas de trajet absent et masque la couche si OFF', () => {
  const markup = OperationalMap({ ...missionView, lastKnownPoint: null, progress: [], events: [], corridor: { enabled: false } });
  assert.doesNotMatch(markup, /data-operational-start/);
  assert.doesNotMatch(markup, /data-operational-progress/);
  assert.doesNotMatch(markup, /data-operational-event=/);
  assert.doesNotMatch(markup, /ESTIMÉ · simulation/);
});

test('les appels Coaching à MapShell gardent leur markup historique sans couches opérationnelles', () => {
  const baseline = MapShell(coachingView);
  const afterExtension = MapShell(coachingView, { postSession: false });
  assert.equal(afterExtension, baseline);
  assert.match(baseline, /data-map-actor="driver"/);
  assert.match(baseline, /data-map-path="search"/);
  assert.doesNotMatch(baseline, /data-operational/);
});

test('MapShell n’ajoute ses couches que quand elles sont explicitement fournies', () => {
  const view = { ...coachingView, progress: [{ x: 40, y: 50 }, { x: 80, y: 100 }], events: [], corridorEnabled: true };
  const markup = MapShell(view, { operational: { interactive: true, progress: view.progress, events: view.events, corridor: { enabled: true, label: 'ESTIMÉ · simulation' } } });
  assert.match(markup, /data-operational-progress/);
  assert.match(markup, /ESTIMÉ · simulation/);
  assert.match(markup, /data-operational-interactive="true"/);
});
