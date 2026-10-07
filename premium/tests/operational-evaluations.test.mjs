import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationalMissionStore } from '../src/operational-missions.mjs';
import { DOG_EVALUATION_CRITERIA, FIELD_EVALUATION_CRITERIA, OPERATIONAL_PAUSE_CLASSIFICATIONS } from '../src/operational-data.mjs';

const dog = { id: 'nox', name: 'Nox' };
const handler = { id: 'handler-1', name: 'Sébastien' };

test('les évaluations chien et terrain partagent une échelle 1–5 et gardent un commentaire libre', () => {
  let now = 1_800_000_000_000;
  const store = createOperationalMissionStore({ idFactory: () => 'eval-1', clock: () => now });
  const draft = store.createDraft({ dog, handler });
  const dogRatings = Object.fromEntries(DOG_EVALUATION_CRITERIA.map((key, index) => [key, index % 5 + 1]));
  const fieldRatings = Object.fromEntries(FIELD_EVALUATION_CRITERIA.map((key, index) => [key, index % 5 + 1]));
  const updated = store.saveEvaluation(draft.id, { dog: { ...dogRatings, comment: 'Bonne concentration en zone ouverte.' }, field: { ...fieldRatings, comment: 'Sol humide.' } });
  assert.deepEqual(updated.dogEvaluation, { ...dogRatings, comment: 'Bonne concentration en zone ouverte.' });
  assert.deepEqual(updated.fieldEvaluation, { ...fieldRatings, comment: 'Sol humide.' });
  assert.throws(() => store.saveEvaluation(draft.id, { dog: { motivation: 0 } }), /1 à 5|échelle/i);
  assert.throws(() => store.saveEvaluation(draft.id, { field: { terrainDifficulty: 6 } }), /1 à 5|échelle/i);
  store.start(draft.id);
  store.stopTracking(draft.id);
  store.complete(draft.id);
  assert.throws(() => store.saveEvaluation(draft.id, { dog: { motivation: 3 } }), /lecture seule/i);
});

test('une pause manuelle forme un intervalle explicite de la personne qui a confirmé', () => {
  let now = 1_800_000_000_000;
  const store = createOperationalMissionStore({ idFactory: () => 'pause-1', clock: () => now });
  const mission = store.start(store.createDraft({ dog, handler }).id);
  store.pauseTracking(mission.id);
  now += 90_000;
  const resumed = store.resumeTracking(mission.id);
  assert.deepEqual(resumed.pauseObservations[0], {
    id: 'pause-1-pause-1', classification: 'manual_pause', detectedAt: 1_800_000_000_000,
    endedAt: now, duration: 90_000, detectionSource: 'user_action',
    confirmationState: 'user_confirmed', confirmedBy: 'handler-1', note: null
  });
  assert.equal(resumed.time.pauseDurationMs, 90_000);
});

test('les détections d’immobilité sont des annotations et ne changent jamais seules le chrono', () => {
  let now = 1_800_000_000_000;
  const store = createOperationalMissionStore({ idFactory: () => 'still-1', clock: () => now });
  const mission = store.start(store.createDraft({ dog, handler }).id);
  now += 120_000;
  const before = store.get(mission.id);
  const detected = store.recordPauseClassification(mission.id, {
    classification: 'auto_stationary_detected', detectedAt: now - 120_000,
    endedAt: now, duration: 120_000, detectionSource: 'future_location_engine',
    confirmationState: 'pending', confirmedBy: null
  });
  assert.equal(detected.trackingState, 'active');
  assert.equal(detected.trackingElapsedMs, before.trackingElapsedMs);
  assert.equal(detected.trackingPausedMs, 0);
  const work = store.recordPauseClassification(mission.id, {
    classification: 'auto_stationary_reclassified_work', detectedAt: now - 120_000,
    endedAt: now, duration: 120_000, detectionSource: 'future_location_engine',
    confirmationState: 'user_confirmed', confirmedBy: 'handler-1', note: 'Recherche statique.'
  });
  assert.equal(work.trackingState, 'active');
  assert.equal(work.trackingElapsedMs, 120_000);
  assert.equal(work.trackingPausedMs, 0);
  assert.ok(OPERATIONAL_PAUSE_CLASSIFICATIONS.includes('auto_stationary_confirmed_pause'));
});
