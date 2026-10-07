import test from 'node:test';
import assert from 'node:assert/strict';
import { createDogsStore } from '../src/dogs.mjs';
import { DogFormScreen, DogNotFoundScreen, DogProfileScreen, DogsListScreen } from '../src/dogs-screen.mjs';

test('dog list shows compact profile cards, status, activity and add action', () => {
  const html = DogsListScreen(createDogsStore().list());
  assert.match(html, /Mes chiens/);
  assert.match(html, /Nox/);
  assert.match(html, /En formation/);
  assert.match(html, /Ajouter un chien/);
  assert.match(html, /href="\/dogs\/nox"/);
  assert.match(html, /hero-malinois-mountain\.png/);
});

test('dog profile reuses mock session history and labels unavailable science data', () => {
  const dog = createDogsStore().get('nox');
  const html = DogProfileScreen(dog);
  assert.match(html, /Pistage/);
  assert.match(html, /Sous les pins/);
  assert.match(html, /Lisière de forêt/);
  assert.match(html, /2,05 km/);
  assert.match(html, /42 min/);
  assert.match(html, /Aucune donnée disponible/);
  assert.match(html, /Température/);
  assert.match(html, /Fréquence cardiaque/);
  assert.match(html, /href="\/sessions\?dog=nox"/);
  assert.doesNotMatch(html, /\b38,\d|\b\d{2,3}\s*bpm/i);
});

test('dog without activity does not receive invented metrics or history', () => {
  const dog = createDogsStore().get('uma');
  const html = DogProfileScreen(dog);
  assert.match(html, /Aucune donnée disponible/);
  assert.match(html, /Aucune session associée/);
  assert.match(html, /En formation/);
  assert.doesNotMatch(html, /0 km|0 min/);
});

test('add and edit forms use mock portraits without file upload controls', () => {
  const add = DogFormScreen(null);
  assert.match(add, /Ajouter un chien/);
  assert.match(add, /data-dog-form="create"/);
  assert.match(add, /name="dateOfBirth"/);
  assert.match(add, /name="registrationNumber"/);
  assert.match(add, /name="portrait"/);
  assert.match(add, /type="file"[^>]*data-dog-photo/);
  assert.match(add, /accept="image\/png,image\/jpeg,image\/webp,image\/gif"/);
  assert.doesNotMatch(add, /action="https?:/);

  const edit = DogFormScreen(createDogsStore().get('arko'));
  assert.match(edit, /Modifier le profil/);
  assert.match(edit, /value="Arko"/);
  assert.match(edit, /value="retired" selected/);
});

test('archived dogs stay clearly identified and unknown profiles get a return state', () => {
  const store = createDogsStore();
  const archived = store.archive('arko');
  assert.match(DogProfileScreen(archived), /Archivé/);
  assert.match(DogNotFoundScreen(), /Chien introuvable/);
  assert.match(DogNotFoundScreen(), /href="\/dogs"/);
});

test('dog profile fields are escaped before they reach the screen', () => {
  const html = DogProfileScreen({
    id: 'escaped', name: '<img src=x>', breed: 'Race & <autre>', specialty: 'Piste "A"',
    status: 'active', portrait: 'silhouette', disciplines: [], sessions: [], age: null
  });
  assert.doesNotMatch(html, /<img src=x>/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.match(html, /Race &amp; &lt;autre&gt;/);
});

test('form exposes personal photo selection, optional identity notes and conditional retirement date', () => {
  const store = createDogsStore();
  const active = DogFormScreen(store.get('nox'));
  assert.match(active, /name="photo"[^>]*type="file"|type="file"[^>]*name="photo"/);
  assert.match(active, /Ajouter une photo/);
  assert.match(active, /Nom officiel/);
  assert.match(active, /Notes/);
  assert.match(active, /data-dog-retirement-field hidden/);
  assert.match(active, /name="disciplines" value="tracking" checked/);

  const retired = DogFormScreen(store.get('arko'));
  assert.match(retired, /Date de réforme \/ retraite/);
  assert.match(retired, /Utiliser le portrait mock/);
});

test('profile renders optional official name, retirement date, notes and session CTA without affecting specialty', () => {
  const html = DogProfileScreen({
    ...createDogsStore().get('arko'), officialName: 'Arko du Nord', retirementDate: '2024-09-01',
    notes: 'Très posé en recherche.', disciplines: ['defense', 'search']
  });
  assert.match(html, /Arko du Nord/);
  assert.match(html, /Date de réforme \/ retraite/);
  assert.match(html, /Très posé en recherche\./);
  assert.match(html, /Défense/);
  assert.match(html, /Recherche/);
  assert.match(html, /Voir les sessions de ce chien/);
  assert.match(html, /href="\/sessions\?dog=arko"/);

  const empty = DogProfileScreen(createDogsStore().get('nox'));
  assert.match(empty, /Aucune note/);
  assert.doesNotMatch(empty, /Nom officiel/);
  assert.doesNotMatch(empty, /Date de réforme \/ retraite/);
});

test('personal photo data URI takes precedence over the mock portrait in list and profile', () => {
  const dog = { ...createDogsStore().get('nox'), personalPhotoDataUrl: 'data:image/png;base64,AA==' };
  const list = DogsListScreen([dog]);
  const profile = DogProfileScreen(dog);
  assert.match(list, /data:image\/png;base64,AA==/);
  assert.match(profile, /data:image\/png;base64,AA==/);
  assert.doesNotMatch(profile, /hero-malinois-mountain\.png/);
});
