import test from 'node:test';
import assert from 'node:assert/strict';
import { OperationalEntryChoices, QuickStartForm, PreparedMissionForm, OperationalNavigation, getNavigationLinks } from '../src/operational-intake.mjs';
import { resolveOperationalRoute } from '../src/operational-views.mjs';
import { createOperationalMissionStore } from '../src/operational-missions.mjs';

const dogs = [{ id: 'nox', name: 'Nox', breed: 'Malinois' }];
const handler = { id: 'handler-1', name: 'Sébastien' };

test('entrée OPS présente seulement les deux parcours demandés', () => {
  const html = OperationalEntryChoices({ missions: [], dogs });
  assert.match(html, /Départ rapide/);
  assert.match(html, /Urgence · partir immédiatement/);
  assert.match(html, /Préparer une mission/);
  assert.match(html, /Renseigner les informations avant le départ/);
  assert.equal((html.match(/data-operational-entry-choice/g) || []).length, 2);
});

test('les formulaires rapide et préparé restent séparés de l’action de démarrage', () => {
  const quick = QuickStartForm({ dogs, handler });
  const prepared = PreparedMissionForm({ dogs, handler });
  assert.match(quick, /data-operational-intake-form="quick"/);
  assert.match(quick, /name="disappearanceAt"/);
  assert.match(quick, /name="interventionAddress"/);
  assert.match(quick, /data-operational-intake-navigation/);
  assert.match(quick, /Créer la mission/);
  assert.doesNotMatch(quick, /data-operational-action="start"/);
  assert.match(prepared, /data-operational-intake-form="prepared"/);
  assert.match(prepared, /name="searchedPerson"/);
  assert.match(prepared, /name="probableTrackStart"/);
  assert.match(prepared, /name="risks"/);
  assert.match(prepared, /data-operational-intake-navigation/);
  assert.match(prepared, /name="dogId"[^>]*required/);
  assert.doesNotMatch(prepared, /name="disappearanceAt"[^>]*required/);
  assert.doesNotMatch(prepared, /name="interventionAddress"[^>]*required/);
});

test('les deux parcours utilisent la même route mission et le même type/store', () => {
  assert.deepEqual(resolveOperationalRoute('/operational/new'), { type: 'new' });
  assert.deepEqual(resolveOperationalRoute('/operational/prepare'), { type: 'prepared' });
  const store = createOperationalMissionStore({ idFactory: (() => { let n=0; return () => `mission-${++n}`; })(), clock: () => 0 });
  const quick = store.createDraft({ dog: dogs[0], handler, entryMode: 'quick' });
  const prepared = store.createDraft({ dog: dogs[0], handler, entryMode: 'prepared' });
  assert.equal(quick.kind, prepared.kind);
  assert.equal(quick.schemaVersion, prepared.schemaVersion);
  assert.deepEqual(Object.keys(quick.time), Object.keys(prepared.time));
  assert.equal(quick.entryMode, 'quick');
  assert.equal(prepared.entryMode, 'prepared');
  assert.equal(quick.status, 'Brouillon');
  assert.equal(prepared.status, 'Brouillon');
});

test('Apple Plans, Google Maps et Waze reçoivent la même adresse encodée sans géocodage', () => {
  const address = '12 rue de l’Église, 67000 Strasbourg #parking';
  const links = getNavigationLinks(address);
  assert.deepEqual(links.map(item => item.label), ['Apple Plans', 'Google Maps', 'Waze']);
  for (const link of links) assert.equal(decodeURIComponent(link.href.split(/[?&](?:daddr|destination|q)=/)[1].split('&')[0]), address);
  assert.ok(links.every(link => /^https:\/\//.test(link.href)));
  assert.deepEqual(getNavigationLinks(' '), []);
  assert.match(OperationalNavigation(address),/Apple Plans[\s\S]*Google Maps[\s\S]*Waze/);
});
