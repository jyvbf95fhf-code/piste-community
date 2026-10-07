import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTrackAge, resolveTrackAgeReference } from '../src/operational-time.mjs';

const origin = Date.parse('2026-10-06T08:00:00Z');

test('âge de piste inférieur à une heure', () => {
  assert.deepEqual(calculateTrackAge(origin, origin + 18 * 60_000, 'disappearanceAt'), {
    elapsedMs: 18 * 60_000, totalMinutes: 18, label: '18 min', source: 'disappearanceAt'
  });
});

test('âge de piste affiche heures et minutes', () => {
  assert.equal(calculateTrackAge(origin, origin + 102 * 60_000, 'lastContactAt').label, '1 h 42');
  assert.equal(calculateTrackAge(origin, origin + 313 * 60_000, 'disappearanceAt').label, '5 h 13');
});

test('âge de piste affiche jours et heures', () => {
  assert.equal(calculateTrackAge(origin, origin + (26 * 60 + 59) * 60_000).label, '1 j 02 h');
});

test('date absente, invalide ou postérieure au départ reste indisponible', () => {
  assert.equal(calculateTrackAge(null, origin), null);
  assert.equal(calculateTrackAge('demain peut-être', origin), null);
  assert.equal(calculateTrackAge(origin + 1, origin), null);
});

test('disparition est la source prioritaire puis dernier contact, sans inventer de source', () => {
  assert.deepEqual(resolveTrackAgeReference({ disappearanceAt: '2026-10-06T07:00:00Z', lastContactAt: '2026-10-06T07:30:00Z' }), {
    at: '2026-10-06T07:00:00Z', source: 'disappearanceAt'
  });
  assert.deepEqual(resolveTrackAgeReference({ lastContactAt: '2026-10-06T07:30:00Z' }), {
    at: '2026-10-06T07:30:00Z', source: 'lastContactAt'
  });
  assert.deepEqual(resolveTrackAgeReference({ disappearanceAt: '2026-10-06T12:00:00Z', lastContactAt: '2026-10-06T07:30:00Z' }, origin), {
    at: '2026-10-06T07:30:00Z', source: 'lastContactAt'
  });
  assert.equal(resolveTrackAgeReference({}), null);
});
