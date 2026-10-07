import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationalMissionStore } from '../src/operational-missions.mjs';
import { operationalMissionView, operationalReplayView, operationalSessionRows, resolveOperationalRoute } from '../src/operational-views.mjs';

const dog = { id: 'nox', name: 'Nox', breed: 'Malinois' };
const handler = { id: 'driver-1', name: 'Sébastien' };

function setup() {
  let nextId = 0;
  const store = createOperationalMissionStore({ idFactory: () => `mission ${++nextId}` });
  const draft = store.createDraft({ dog, handler });
  return { store, draft };
}

test('les routes opérationnelles sont explicites et rejettent les chemins mal formés', () => {
  assert.deepEqual(resolveOperationalRoute('/operational'), { type: 'entry' });
  assert.deepEqual(resolveOperationalRoute('/operational/'), { type: 'entry' });
  assert.deepEqual(resolveOperationalRoute('/operational/new'), { type: 'new' });
  assert.deepEqual(resolveOperationalRoute('/operational/prepare'), { type: 'prepared' });
  assert.deepEqual(resolveOperationalRoute('/operational/missions/mission%201'), { type: 'mission', missionId: 'mission 1' });
  assert.deepEqual(resolveOperationalRoute('/operational/missions/mission-1/replay'), { type: 'replay', missionId: 'mission-1' });
  assert.equal(resolveOperationalRoute('/operational/missions/%E0%A4%A'), null);
  assert.equal(resolveOperationalRoute('/operational/missions/a/b'), null);
  assert.equal(resolveOperationalRoute('/operational/new/replay'), null);
});

test('la vue de mission expose le chien, les capacités liées au statut et les données absentes comme indisponibles', () => {
  const { store, draft } = setup();
  const beforeStart = operationalMissionView(draft, { dogs: [dog] });
  assert.equal(beforeStart.dogName, 'Nox');
  assert.equal(beforeStart.status, 'Brouillon');
  assert.equal(beforeStart.canStart, true);
  assert.equal(beforeStart.canCloseField, false);
  assert.equal(beforeStart.distance, null);
  assert.equal(beforeStart.weatherLabel, 'Aucune donnée disponible');
  assert.equal(beforeStart.corridor.enabled, false);
  assert.equal(beforeStart.corridor.label, null);

  const active = store.start(draft.id);
  const view = operationalMissionView(active, { dogs: [] });
  assert.equal(view.dogName, 'Nox');
  assert.equal(view.canCloseField, true);
  assert.equal(view.canComplete, false);
  assert.deepEqual(view.progress, []);
});

test('la projection sépare pause et arrêt, autorise les événements manuels en pause et garde le chrono simulé', () => {
  let clock = 10_000;
  const store = createOperationalMissionStore({ idFactory: () => 'mission-pause', clock: () => clock });
  const draft = store.createDraft({ dog, handler });
  store.startTracking(draft.id);
  clock += 7_000;
  store.pauseTracking(draft.id);
  store.addEvent(draft.id, { type: 'Indice', point: { x: 10, y: 20 } });
  const view = operationalMissionView(store.get(draft.id));

  assert.equal(view.status, 'En cours');
  assert.equal(view.trackingState, 'paused');
  assert.equal(view.trackingLabel, 'Suivi en pause');
  assert.equal(view.trackingElapsedMs, 7_000);
  assert.equal(view.canAddProgress, false);
  assert.equal(view.canAddEvent, true);
  assert.equal(view.canResume, true);
  assert.equal(view.events[0].timeLabel, 'T+00:00:07 · simulation');
});

test('le replay expose le journal séquencé et conserve la fin de suivi distincte de Fin de piste', () => {
  const { store, draft } = setup();
  store.startTracking(draft.id);
  store.addProgressPoint(draft.id, { x: 12, y: 28 });
  store.addEvent(draft.id, { type: 'Fin de piste', point: { x: 12, y: 28 } });
  store.stopTracking(draft.id);
  const replay = operationalReplayView(store.complete(draft.id));

  assert.deepEqual(replay.timeline.map(item => item.kind), [
    'tracking_started', 'progress', 'terrain_event', 'tracking_stopped', 'ready_to_complete', 'mission_completed'
  ]);
  assert.equal(replay.timeline.find(item => item.kind === 'terrain_event').event.type, 'Fin de piste');
  assert.equal(replay.trace[0].role, 'departure');
  assert.equal(replay.trace[0].isTrackingEnd, true);
});

test('un replay est indisponible avant finalisation et read-only ensuite sans créer de trace', () => {
  const { store, draft } = setup();
  const active = store.start(draft.id);
  store.addProgressPoint(active.id, { x: 12, y: 28 });
  assert.equal(operationalReplayView(store.get(active.id)), null);

  store.closeField(active.id);
  const completed = store.complete(active.id);
  const replay = operationalReplayView(completed);
  assert.equal(replay.readOnly, true);
  assert.equal(replay.status, 'Terminée');
  assert.equal(replay.trace.length, 1);
  assert.equal(replay.trace[0].space, 'mock-map');
  assert.equal(replay.distance, null);
  assert.deepEqual(replay.events, []);
  assert.equal(replay.olfactoryCorridor, null);
  assert.equal(store.get(active.id).trace.length, 1);
});

test('la projection de replay restaure le couloir seulement si activé et le marque explicitement estimé', () => {
  const { store, draft } = setup();
  store.start(draft.id);
  store.setCorridorEnabled(draft.id, true);
  store.closeField(draft.id);
  const replay = operationalReplayView(store.complete(draft.id));

  assert.deepEqual(replay.olfactoryCorridor, {
    enabled: true,
    label: 'ESTIMÉ · simulation',
    geometry: 'mock-overlay'
  });
  assert.equal(replay.weather, null);
});

test('la projection de Sessions conserve son type et son propre lien sans convertir la mission en Coaching', () => {
  const { store, draft } = setup();
  const active = store.start(draft.id);
  store.addProgressPoint(active.id, { x: 12, y: 28 });
  store.addEvent(active.id, { type: 'Indice' });
  const row = operationalSessionRows(store.list())[0];

  assert.equal(row.kind, 'operational');
  assert.equal(row.provenance, 'Mission opérationnelle');
  assert.equal(row.status, 'En cours');
  assert.equal(row.dogId, 'nox');
  assert.equal(row.href, '/operational/missions/mission%201');
  assert.equal(row.replayHref, null);
  assert.equal(row.distance, null);
  assert.equal(row.duration, null);
  assert.equal('searchState' in row, false);
});

test('les missions terminées et archivées obtiennent uniquement des liens de consultation/replay', () => {
  const { store, draft } = setup();
  store.start(draft.id);
  store.closeField(draft.id);
  const completed = store.complete(draft.id);
  const archived = store.archive(draft.id);
  const rows = operationalSessionRows([completed, archived]);

  assert.equal(rows[0].status, 'Terminée');
  assert.equal(rows[0].readOnly, true);
  assert.equal(rows[0].replayHref, '/sessions/mission%201/replay');
  assert.equal(rows[1].status, 'Archivée');
  assert.equal(rows[1].readOnly, true);
});

test('la projection Sessions indique une pause opérationnelle sans changer le statut de mission', () => {
  let clock=30_000;
  const store=createOperationalMissionStore({idFactory:()=> 'mission-paused-row',clock:()=>clock});
  const draft=store.createDraft({dog,handler});
  store.startTracking(draft.id);
  clock+=2_000;
  store.pauseTracking(draft.id);
  const row=operationalSessionRows(store.list())[0];
  assert.equal(row.status,'En cours');
  assert.equal(row.trackingState,'paused');
  assert.equal(row.trackingLabel,'Suivi en pause');
});

test('la projection ne permet Archiver que pour Terminée avec suivi arrêté', () => {
  const { store, draft } = setup();
  assert.equal(operationalMissionView({ ...draft, status:'À compléter', trackingState:'stopped' }).canArchive, false);
  assert.equal(operationalMissionView({ ...draft, status:'Terminée', trackingState:'active' }).canArchive, false);
  assert.equal(operationalMissionView({ ...draft, status:'Terminée', trackingState:'stopped' }).canArchive, true);
});

test('la projection Sessions expose âge/durée opérationnels uniquement lorsque disponibles',()=>{
  let clock=1_800_000_000_000;
  const store=createOperationalMissionStore({idFactory:()=> 'ops-session-age',clock:()=>clock});
  const source=new Date(clock-90*60_000).toISOString();
  const draft=store.createDraft({dog,handler,time:{disappearanceAt:source}});
  store.startTracking(draft.id);
  clock+=12*60_000;
  store.stopTracking(draft.id);
  const row=operationalSessionRows(store.list())[0];
  assert.equal(row.trackAge,'1 h 30');
  assert.equal(row.duration,'12 min · simulation');
  const noData=operationalSessionRows([setup().draft])[0];
  assert.equal(noData.trackAge,null);
  assert.equal(noData.duration,null);
});
