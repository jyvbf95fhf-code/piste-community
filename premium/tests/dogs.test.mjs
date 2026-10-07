import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from '../src/data.mjs';
import { resolveMockRoute } from '../src/mock-auth.mjs';
import { createDogsStore, resolveDogsRoute, summarizeDogActivity } from '../src/dogs.mjs';
import { DogProfileScreen } from '../src/dogs-screen.mjs';

test('Nox reuses the existing dog fixture and its local demo session history', () => {
  const store = createDogsStore();
  const nox = store.get('nox');

  assert.equal(nox.name, mock.dog.name);
  assert.equal(nox.breed, mock.dog.breed);
  assert.equal(nox.age, mock.dog.age);
  assert.deepEqual(nox.sessions.map(session => session.title), [mock.session.title, mock.recent.title]);
  assert.equal(summarizeDogActivity(nox).sessionCount, 2);
  assert.equal(summarizeDogActivity(nox).totalDistanceMeters, 2050);
  assert.equal(summarizeDogActivity(nox).totalDurationMinutes, 42);
});

test('dog store returns copies and updates only its in-memory records', () => {
  const store = createDogsStore();
  const before = store.get('nox');
  before.name = 'Mutated outside';
  assert.equal(store.get('nox').name, mock.dog.name);

  const created = store.create({ name: 'Lune', breed: 'Berger belge', status: 'training' });
  assert.match(created.id, /^dog-/);
  assert.equal(store.get(created.id).name, 'Lune');

  const updated = store.update(created.id, { specialty: 'Recherche', status: 'retired' });
  assert.equal(updated.specialty, 'Recherche');
  assert.equal(updated.status, 'retired');
  assert.equal(store.archive(created.id).status, 'archived');
  assert.equal(store.get(created.id).status, 'archived');
  assert.equal(store.get('missing'), null);
  assert.equal(store.update('missing', { name: 'Inconnu' }), null);
});

test('empty and incomplete history reports unavailable metrics without substituting values', () => {
  const summary = summarizeDogActivity({ sessions: [] });
  assert.equal(summary.sessionCount, 0);
  assert.equal(summary.totalDistanceMeters, null);
  assert.equal(summary.totalDurationMinutes, null);
  assert.equal(summary.averageDistanceMeters, null);
  assert.equal(summary.averageDurationMinutes, null);
  assert.equal(summary.completionRate, null);

  const incomplete = summarizeDogActivity({ sessions: [{ title: 'Sans mesures' }] });
  assert.equal(incomplete.sessionCount, 1);
  assert.equal(incomplete.totalDistanceMeters, null);
  assert.equal(incomplete.totalDurationMinutes, null);
  assert.equal(incomplete.lastActivity, null);
});

test('creation requires a name and rejects unknown status values', () => {
  const store = createDogsStore({ dogs: [] });
  assert.throws(() => store.create({ name: '  ' }), /nom/i);
  assert.throws(() => store.create({ name: 'Lune', status: 'unknown' }), /statut/i);
  assert.deepEqual(store.list(), []);
});

test('dog profile accepts optional identity, retirement, note, photo and multiple disciplines in memory', () => {
  const store = createDogsStore({ dogs: [] });
  const dog = store.create({
    name: 'Roxy', officialName: 'Roxy du Val', status: 'retired', retirementDate: '2025-05-12',
    notes: 'Calme en recherche.', personalPhotoDataUrl: 'data:image/png;base64,AA==',
    disciplines: ['tracking', 'search']
  });

  assert.equal(dog.officialName, 'Roxy du Val');
  assert.equal(dog.retirementDate, '2025-05-12');
  assert.equal(dog.notes, 'Calme en recherche.');
  assert.equal(dog.personalPhotoDataUrl, 'data:image/png;base64,AA==');
  assert.deepEqual(dog.disciplines, ['tracking', 'search']);
  assert.equal(store.get(dog.id).personalPhotoDataUrl, 'data:image/png;base64,AA==');
});

test('legacy single specialty remains available as a discipline when no list exists', () => {
  const legacyDog = { id: 'legacy', name: 'Kira', specialty: 'Recherche' };
  const store = createDogsStore({ dogs: [legacyDog] });
  const html = DogProfileScreen(store.get('legacy'));
  assert.match(html, /Recherche/);
  assert.match(html, /dog-discipline is-listed[^]*<strong>Recherche<\/strong>/);
});

test('dog photo only accepts local image data and can be cleared back to mock portrait', () => {
  const store = createDogsStore({ dogs: [] });
  const dog = store.create({ name: 'Pixel', personalPhotoDataUrl: 'data:image/jpeg;base64,/9j/2Q==' });
  assert.equal(dog.personalPhotoDataUrl, 'data:image/jpeg;base64,/9j/2Q==');
  assert.throws(() => store.update(dog.id, { personalPhotoDataUrl: 'https://example.test/dog.jpg' }), /photo/i);
  assert.equal(store.update(dog.id, { personalPhotoDataUrl: null }).personalPhotoDataUrl, null);
});

test('dog routes distinguish list, create, detail and edit without accepting extra path segments', () => {
  assert.deepEqual(resolveDogsRoute('/dogs'), { type: 'list' });
  assert.deepEqual(resolveDogsRoute('/dogs/new'), { type: 'create' });
  assert.deepEqual(resolveDogsRoute('/dogs/nox'), { type: 'profile', dogId: 'nox' });
  assert.deepEqual(resolveDogsRoute('/dogs/nox/edit'), { type: 'edit', dogId: 'nox' });
  assert.deepEqual(resolveDogsRoute('/dogs/dog%2D2'), { type: 'profile', dogId: 'dog-2' });
  assert.equal(resolveDogsRoute('/dogs/nox/other'), null);
});

test('dog routes keep using the existing mock-auth route gate', () => {
  assert.equal(resolveMockRoute('/dogs/nox', { authenticated: false }), '/auth');
  assert.equal(resolveMockRoute('/dogs/nox', { authenticated: true }), '/dogs/nox');
});
