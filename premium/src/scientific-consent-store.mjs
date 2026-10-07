import {
  SCIENTIFIC_CONSENT_VERSION, SCIENTIFIC_CONSENT_CATEGORIES, SCIENTIFIC_OPS_CATEGORIES,
  SCIENTIFIC_SESSION_INCLUSION_STATES, createInitialScientificConsent, deriveScientificConsent
} from './scientific-consent.mjs';

const clone = value => structuredClone(value);
const selfActor = (actor, userId) => actor?.role === 'contributor' && actor?.userId === userId;

export function createScientificConsentStore({ mockUserId, clock = () => new Date().toISOString(), initialEvents = [], initialSessionStates = {} } = {}) {
  if (!mockUserId) throw new TypeError('mockUserId requis pour le store de consentement.');
  const userId = String(mockUserId), consentId = `consent-${userId}`;
  let events = clone(initialEvents);
  const sessionStates = new Map(Object.entries(initialSessionStates).map(([id,state]) => [id, SCIENTIFIC_SESSION_INCLUSION_STATES.includes(state) ? state : 'not_eligible']));
  const assertSelf = actor => {
    if (!selfActor(actor, userId)) throw new Error('Action de consentement non autorisée : seul le contributeur concerné peut modifier ses choix.');
  };
  const append = (actor, type, fields = {}) => {
    const row = {
      eventId: `consent-event-${String(events.length + 1).padStart(5,'0')}`,
      consentId, mockUserId: userId, type, version: SCIENTIFIC_CONSENT_VERSION,
      source: 'user-settings', actor: { userId: actor.userId, role: actor.role }, occurredAt: clock(), ...fields
    };
    events = [...events, row];
    return clone(row);
  };
  return {
    snapshot() { return deriveScientificConsent(events, userId); },
    history() { return clone(events); },
    setParticipation(actor, enabled) {
      assertSelf(actor);
      const next = Boolean(enabled);
      append(actor, next ? 'participation_enabled' : 'participation_disabled');
      return this.snapshot();
    },
    setCategory(actor, category, enabled) {
      assertSelf(actor);
      if (!SCIENTIFIC_CONSENT_CATEGORIES.includes(category)) throw new TypeError(`Catégorie scientifique inconnue : ${category}`);
      if (!this.snapshot().participationEnabled && enabled) throw new Error('Activez d’abord la participation; aucune catégorie ne peut être autorisée seule.');
      append(actor, enabled ? 'category_enabled' : 'category_disabled', { category });
      return this.snapshot();
    },
    setOpsCategory(actor, category, enabled) {
      assertSelf(actor);
      if (!SCIENTIFIC_OPS_CATEGORIES.includes(category)) throw new TypeError(`Catégorie OPS inconnue : ${category}`);
      if (!this.snapshot().participationEnabled && enabled) throw new Error('Activez d’abord la participation; OPS reste séparé et OFF par défaut.');
      append(actor, enabled ? 'ops_category_enabled' : 'ops_category_disabled', { category, source: 'user-settings-ops' });
      return this.snapshot();
    },
    setSessionInclusion(actor, sessionId, state) {
      assertSelf(actor);
      if (!sessionId || !['included','excluded_by_user'].includes(state)) throw new Error('État de session non autorisé.');
      const current = sessionStates.get(String(sessionId)) || 'included';
      if (['excluded_sensitive','not_eligible'].includes(current)) throw new Error('Cette session est exclue par le système et ne peut pas être modifiée.');
      sessionStates.set(String(sessionId), state);
      append(actor, state === 'excluded_by_user' ? 'session_excluded' : 'session_restored', { sessionId: String(sessionId), inclusionState: state });
      return state;
    },
    withdraw(actor) {
      assertSelf(actor);
      append(actor, 'participation_withdrawn');
      return this.snapshot();
    },
    isSessionEligible(sessionId) {
      const state = sessionStates.get(String(sessionId)) || 'included';
      return this.snapshot().participationEnabled && !['excluded_by_user','excluded_sensitive','not_eligible'].includes(state);
    },
    sessionInclusionState(sessionId) { return sessionStates.get(String(sessionId)) || 'included'; },
    sessionInclusionSnapshot() { return Object.fromEntries(sessionStates); },
    // System-controlled fixture metadata is seeded only at construction; no public privileged mutator exists.
    initialConsent() { return createInitialScientificConsent(userId); }
  };
}
