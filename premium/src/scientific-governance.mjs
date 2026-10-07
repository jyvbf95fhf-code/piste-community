import { SCIENTIFIC_CONSENT_CATEGORIES, SCIENTIFIC_OPS_CATEGORIES, SCIENTIFIC_CONSENT_VERSION } from './scientific-consent.mjs';

const clone = value => structuredClone(value);
const contributors = new Set(Array.from({length:10},(_,index)=>`contributor-${String(index+1).padStart(2,'0')}`));
const allowedGovernanceEvents = new Set(['suspend_inclusion','exclude_sensitive_session','revoke_researcher_access']);

export function scientificContributionRoleFor(mockUserId) {
  if (mockUserId === 'sebastien') return 'scientific_owner';
  if (mockUserId === 'ethologist-demo') return 'researcher';
  if (mockUserId === 'scientific-reader-demo') return 'scientific_reader';
  if (contributors.has(String(mockUserId))) return 'contributor';
  return 'standard';
}

export function authorizeConsentMutation({ actorUserId, actorRole, subjectUserId } = {}) {
  const allowed = actorRole === 'contributor' && String(actorUserId) === String(subjectUserId) && contributors.has(String(subjectUserId));
  return { allowed, reason: allowed ? 'self_contribution' : 'consentement réservé au contributeur concerné' };
}

export function appendScientificGovernanceEvent(log = [], input = {}) {
  if (!allowedGovernanceEvents.has(input.type)) throw new Error('Action de gouvernance non autorisée.');
  if (input.actorRole !== 'scientific_owner') throw new Error('Action réservée au responsable scientifique.');
  const event = {
    eventId: `governance-${String(log.length + 1).padStart(5,'0')}`,
    actorRole: input.actorRole,
    type: input.type,
    targetPseudonymousId: input.targetPseudonymousId || null,
    consentVersion: input.consentVersion || SCIENTIFIC_CONSENT_VERSION,
    occurredAt: input.occurredAt || null,
    details: input.details ? clone(input.details) : null,
    synthetic: true
  };
  return [...clone(log), event];
}

export function canSetSessionInclusion(currentState, nextState, sessionClass = 'training') {
  if (!['included','excluded_by_user'].includes(nextState)) return false;
  if (['excluded_sensitive','not_eligible'].includes(currentState)) return false;
  if (sessionClass === 'ops' && currentState === 'not_eligible') return false;
  return true;
}

export function buildContributionStatus(consentSnapshot = {}) {
  const categories = consentSnapshot.categories || {};
  const opsCategories = consentSnapshot.opsCategories || {};
  const enabledCategories = SCIENTIFIC_CONSENT_CATEGORIES.filter(category => categories[category] === true);
  const enabledOps = SCIENTIFIC_OPS_CATEGORIES.filter(category => opsCategories[category] === true);
  const status = consentSnapshot.status || (!consentSnapshot.participationEnabled ? 'disabled' : enabledCategories.length ? 'partial' : 'partial');
  const opsStatus = enabledOps.length ? (enabledOps.length === SCIENTIFIC_OPS_CATEGORIES.length ? 'OPS : Partagé' : 'OPS : Partagé partiellement') : 'OPS : Non partagé';
  return { status, enabledCategories, opsStatus, lastUpdatedAt: consentSnapshot.updatedAt || null, consentVersion: consentSnapshot.consentVersion || SCIENTIFIC_CONSENT_VERSION };
}
