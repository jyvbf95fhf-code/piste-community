export const SCIENTIFIC_CONSENT_VERSION = 'scientific-consent-v1';

export const SCIENTIFIC_CONSENT_CATEGORIES = Object.freeze([
  'training_session', 'gps_trace', 'weather', 'dog_metrics', 'field_events',
  'longitudinal_history', 'reference_trace', 'jumolf_feedback', 'driver_annotations'
]);

export const SCIENTIFIC_OPS_CATEGORIES = Object.freeze([
  'tracking_metrics', 'pseudonymized_trace', 'non_sensitive_events', 'weather', 'track_age', 'generic_environment'
]);

export const SCIENTIFIC_SESSION_INCLUSION_STATES = Object.freeze([
  'included', 'excluded_by_user', 'excluded_sensitive', 'not_eligible'
]);

const emptyCategories = keys => Object.fromEntries(keys.map(key => [key, false]));
const clone = value => structuredClone(value);

export function createInitialScientificConsent(mockUserId) {
  return {
    consentId: `consent-${String(mockUserId)}`,
    mockUserId: String(mockUserId),
    participationEnabled: false,
    status: 'disabled',
    consentVersion: SCIENTIFIC_CONSENT_VERSION,
    grantedAt: null,
    revokedAt: null,
    updatedAt: null,
    source: 'user-settings',
    categories: emptyCategories(SCIENTIFIC_CONSENT_CATEGORIES),
    opsCategories: emptyCategories(SCIENTIFIC_OPS_CATEGORIES)
  };
}

export function deriveScientificConsent(events = [], mockUserId) {
  const consent = createInitialScientificConsent(mockUserId);
  const ordered = [...events].filter(event => event.mockUserId === String(mockUserId)).sort((a,b) => String(a.occurredAt).localeCompare(String(b.occurredAt)) || String(a.eventId).localeCompare(String(b.eventId)));
  for (const event of ordered) {
    consent.consentId = event.consentId || consent.consentId;
    consent.consentVersion = event.version || consent.consentVersion;
    consent.source = event.source || consent.source;
    consent.updatedAt = event.occurredAt || consent.updatedAt;
    if (event.type === 'participation_enabled') {
      consent.participationEnabled = true;
      consent.grantedAt ||= event.occurredAt || null;
    } else if (event.type === 'participation_disabled' || event.type === 'participation_withdrawn') {
      consent.participationEnabled = false;
      consent.categories = emptyCategories(SCIENTIFIC_CONSENT_CATEGORIES);
      consent.opsCategories = emptyCategories(SCIENTIFIC_OPS_CATEGORIES);
      consent.revokedAt = event.occurredAt || consent.revokedAt;
    } else if (event.type === 'category_enabled' || event.type === 'category_disabled') {
      if (SCIENTIFIC_CONSENT_CATEGORIES.includes(event.category)) consent.categories[event.category] = event.type === 'category_enabled';
    } else if (event.type === 'ops_category_enabled' || event.type === 'ops_category_disabled') {
      if (SCIENTIFIC_OPS_CATEGORIES.includes(event.category)) consent.opsCategories[event.category] = event.type === 'ops_category_enabled';
    }
  }
  const generalValues = Object.values(consent.categories);
  consent.status = !consent.participationEnabled
    ? (ordered.at(-1)?.type === 'participation_withdrawn' ? 'withdrawn' : 'disabled')
    : generalValues.length > 0 && generalValues.every(Boolean) ? 'active' : 'partial';
  return clone(consent);
}
