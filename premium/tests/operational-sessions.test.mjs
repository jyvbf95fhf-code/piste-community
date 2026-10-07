import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationalMissionStore } from '../src/operational-missions.mjs';
import { sessionListView, resolveConsultationRoute } from '../src/session-views.mjs';
import { SessionListResults } from '../src/sessions-screen.mjs';
import { OperationalSessionDetailScreen } from '../src/operational-screen.mjs';

const dog = { id: 'nox', name: 'Nox', breed: 'Malinois' };
const handler = { id: 'driver-1', name: 'Sébastien' };

function missions() {
  let id = 0;
  const store = createOperationalMissionStore({ idFactory: () => `operation-${++id}` });
  const active = store.start(store.createDraft({ dog, handler }).id);
  const incomplete = store.start(store.createDraft({ dog, handler }).id);
  const toComplete = store.closeField(incomplete.id);
  const completeActive = store.start(store.createDraft({ dog, handler }).id);
  const completed = store.complete(store.closeField(completeActive.id).id);
  const archiveActive = store.start(store.createDraft({ dog, handler }).id);
  const archived = store.archive(store.complete(store.closeField(archiveActive.id).id).id);
  return { store, active, toComplete, completed, archived };
}

test('les missions opérationnelles s’agrègent dans les filtres Sessions sans devenir des snapshots Coaching', () => {
  const { store, active, toComplete, completed, archived } = missions();
  const all = sessionListView({ list: () => [] }, { operationalMissions: store.list(), demoRows: false });
  assert.deepEqual(all.map(row => row.status), ['En cours', 'À compléter', 'Terminée', 'Archivée']);
  assert.equal(sessionListView({ list: () => [] }, { filter: 'En cours', operationalMissions: store.list(), demoRows: false }).length, 2);
  assert.equal(sessionListView({ list: () => [] }, { filter: 'Terminées', operationalMissions: [completed], demoRows: false })[0].kind, 'operational');
  assert.equal(sessionListView({ list: () => [] }, { filter: 'Archivées', operationalMissions: [archived], demoRows: false })[0].readOnly, true);
  assert.equal(all.find(row => row.id === active.id).href, `/operational/missions/${active.id}`);
  assert.equal(all.find(row => row.id === toComplete.id).canResume, false);
  assert.equal('searchState' in all[0], false);
});

test('le filtre chien fonctionne pour les missions et les statistiques absentes restent absentes', () => {
  const { store } = missions();
  const rows = sessionListView({ list: () => [] }, { dogId: 'nox', operationalMissions: store.list(), demoRows: false });
  assert.equal(rows.length, 4);
  assert.equal(rows.every(row => row.dogId === 'nox'), true);
  assert.equal(rows[0].distance, null);
  assert.equal(rows[0].duration, null);
  assert.equal(sessionListView({ list: () => [] }, { dogId: 'uma', operationalMissions: store.list(), demoRows: false }).length, 0);
});

test('les missions finales utilisent les routes de consultation et replay centrales', () => {
  const { completed, archived } = missions();
  const rows = sessionListView({ list: () => [] }, { operationalMissions: [completed, archived], demoRows: false });
  assert.equal(rows[0].href, `/sessions/${completed.id}`);
  assert.equal(rows[0].replayHref, `/sessions/${completed.id}/replay`);
  assert.equal(resolveConsultationRoute(rows[0].href).type, 'session-detail');
  assert.equal(resolveConsultationRoute(rows[0].replayHref).type, 'session-replay');
  assert.equal(rows[1].status, 'Archivée');
});

test('l’écran Sessions identifie la provenance opérationnelle', () => {
  const { store } = missions();
  const row = sessionListView({ list: () => [] }, { operationalMissions: store.list(), demoRows: false })[0];
  const html = SessionListResults([row]);
  assert.match(html, /Mission opérationnelle/);
  assert.match(html, /data-session-kind="operational"/);
  assert.match(html, /Nox/);
});

test('la consultation active renvoie seulement vers Pistage opérationnel; aucune commande Coaching', () => {
  const { active, completed } = missions();
  const activeHtml = OperationalSessionDetailScreen(active);
  assert.match(activeHtml, /Continuer la mission opérationnelle/);
  assert.match(activeHtml, /\/operational\/missions\/operation-1/);
  assert.doesNotMatch(activeHtml, /\/coaching\/session|data-coaching/);

  const completedHtml = OperationalSessionDetailScreen(completed);
  assert.match(completedHtml, /Lecture seule/);
  assert.match(completedHtml, /\/sessions\/operation-3\/replay/);
  assert.doesNotMatch(completedHtml, /data-operational-action=/);
});
