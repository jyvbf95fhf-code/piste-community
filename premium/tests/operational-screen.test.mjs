import test from 'node:test';
import assert from 'node:assert/strict';
import { HomeScreen } from '../src/screens.mjs';
import { OperationalScreen } from '../src/operational-screen.mjs';
import { createOperationalMissionStore } from '../src/operational-missions.mjs';
import { operationalMissionView } from '../src/operational-views.mjs';
import { AppShell } from '../src/components.mjs';

const dogs = [
  { id: 'nox', name: 'Nox', status: 'active', breed: 'Malinois' },
  { id: 'uma', name: 'Uma', status: 'training', breed: 'Berger allemand' }
];
const handler = { id: 'mock-current-user', name: 'Sébastien' };

test('la Home conserve un seul raccourci Pistage opérationnel et il ouvre /operational', () => {
  const home = HomeScreen();
  assert.equal((home.match(/Piste opérationnelle/g) || []).length, 1);
  assert.match(home, /class="button button-gold discovery-cta" href="\/operational"/);
});

test('le démarrage rapide ne requiert que le chien; le dernier point connu est facultatif', () => {
  const html = OperationalScreen({ route: { type: 'new' }, dogs });
  assert.match(html, /data-operational-start-form/);
  assert.match(html, /<select[^>]*name="dogId"[^>]*required/);
  assert.match(html, /Dernier point connu/);
  assert.doesNotMatch(html, /name="searchedPerson"[^>]*required/);
  assert.doesNotMatch(html, /name="context"[^>]*required/);
  assert.match(html, /Départ rapide/);
  assert.match(html, /Créer la mission/);
  assert.doesNotMatch(html, /data-operational-action="start"/);
});

test('le conducteur peut ouvrir une mission active sans afficher d’actions Coaching', () => {
  const store = createOperationalMissionStore({ idFactory: () => 'mission-1' });
  const active = store.start(store.createDraft({ dog: dogs[0], handler }).id);
  const html = OperationalScreen({ route: { type: 'mission', missionId: active.id }, view: operationalMissionView(active), dogs });

  assert.match(html, /PISTAGE OPÉRATIONNEL · MOCK/);
  assert.match(html, /En cours/);
  assert.match(html, /data-operational-action="pause"/);
  assert.match(html, /data-operational-action="stop"/);
  assert.doesNotMatch(html, /data-coaching|cockpit Conducteur|Normal · Simple aveugle/);
});

test('le cockpit actif superpose ses commandes terrain et son HUD à la carte', () => {
  const store = createOperationalMissionStore({ idFactory: () => 'mission-cockpit' });
  const active = store.startTracking(store.createDraft({ dog: dogs[0], handler }).id);
  const html = OperationalScreen({ route: { type: 'mission', missionId: active.id }, view: operationalMissionView(active) });
  const cockpit = html.match(/<div class="operational-cockpit-stage"[\s\S]*?<\/div><\/section>/)?.[0] || '';

  assert.ok(cockpit, 'active tracking should render a cockpit map stage');
  assert.match(cockpit, /class="prep-map operational-map/);
  assert.match(cockpit, /data-operational-overlay-controls/);
  assert.match(cockpit, /data-operational-corridor-toggle/);
  assert.match(cockpit, /data-operational-map-mode="progress"/);
  assert.match(cockpit, /data-operational-map-mode="event"/);
  assert.match(cockpit, /data-operational-chrono/);
  assert.match(cockpit, /data-operational-action="pause"/);
  assert.match(cockpit, /data-operational-action="stop"/);
  assert.match(cockpit, /data-operational-action="lock-screen"/);
  assert.match(html, /data-operational-journal/);
  assert.match(html, /data-operational-weather/);
});

test('le shell réserve le viewport au cockpit et libère cet affichage sur les autres écrans', () => {
  const cockpitShell = AppShell('<section class="operational-cockpit-page"></section>', '/operational/missions/1', 'Sébastien', 'S');
  assert.match(cockpitShell, /class="app-shell\s+operational-cockpit-shell"/);
  assert.doesNotMatch(cockpitShell, /<nav class="bottom-nav"/);
  assert.doesNotMatch(AppShell('<section class="operational-mission"></section>', '/operational/missions/1', 'Sébastien', 'S'), /operational-cockpit-shell/);
});

test('l’entrée propose une reprise de mission active sans créer de seconde entrée Home', () => {
  const store = createOperationalMissionStore({ idFactory: () => 'mission-1' });
  const active = store.start(store.createDraft({ dog: dogs[0], handler }).id);
  const html = OperationalScreen({ route: { type: 'entry' }, missions: [active], dogs });
  assert.match(html, /Reprendre la mission/);
  assert.match(html, /href="\/operational\/missions\/mission-1"/);
  assert.doesNotMatch(html, /\/coaching\/session/);
});

test('une entrée sans mission active mène au démarrage rapide', () => {
  const html = OperationalScreen({ route: { type: 'entry' }, missions: [], dogs });
  assert.match(html, /href="\/operational\/new"/);
  assert.match(html, /Départ rapide/);
  assert.match(html, /href="\/operational\/prepare"/);
  assert.match(html, /Préparer une mission/);
});

test('les évaluations 1–5 sont disponibles pendant À compléter seulement', () => {
  const store = createOperationalMissionStore({ idFactory: () => 'evaluation-ui' });
  const draft = store.createDraft({ dog: dogs[0], handler });
  const ready = store.start(draft.id);
  const activeHtml = OperationalScreen({ route: { type: 'mission', missionId: ready.id }, view: operationalMissionView(ready) });
  assert.doesNotMatch(activeHtml, /data-operational-evaluation-form/);

  const stopped = store.stopTracking(ready.id);
  const completionHtml = OperationalScreen({ route: { type: 'mission', missionId: stopped.id }, view: operationalMissionView(stopped) });
  assert.match(completionHtml, /data-operational-evaluation-form/);
  assert.equal((completionHtml.match(/<option value="[1-5]"/g) || []).length, 75);
  assert.match(completionHtml, /data-operational-evaluation-group="dog"/);
  assert.match(completionHtml, /data-operational-evaluation-group="field"/);
  assert.match(completionHtml, /Échelle commune de 1 à 5/);

  const finalized = store.complete(stopped.id);
  const finalHtml = OperationalScreen({ route: { type: 'mission', missionId: finalized.id }, view: operationalMissionView(finalized) });
  assert.doesNotMatch(finalHtml, /data-operational-evaluation-form/);
});

test('la mission préparée conserve les champs facultatifs et ne démarre pas le pistage à la création', () => {
  const html = OperationalScreen({ route: { type: 'prepared' }, dogs, ui: { handler } });
  assert.match(html, /data-operational-intake-form="prepared"/);
  assert.match(html, /name="interventionAddress"/);
  assert.match(html, /name="probableTrackStart"/);
  assert.match(html, /name="disappearanceAt"/);
  assert.doesNotMatch(html, /name="searchedPerson"[^>]*required/);
  assert.doesNotMatch(html, /data-operational-action="start"/);
  assert.match(html, /Enregistrer la préparation/);
});
