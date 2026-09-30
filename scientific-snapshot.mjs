/**
 * Pure V10.55 scientific representation/provenance contract.
 * This module does not fetch, persist, authorize or calculate scientific data.
 */

export const SCIENTIFIC_SNAPSHOT_VERSION = '1.0';
export const SCIENTIFIC_PROVENANCE = Object.freeze({
  measured: 'measured',
  calculated: 'calculated',
  estimated: 'estimated',
  unknown: 'unknown'
});

const PROVENANCE_KINDS = new Set(['recorded', 'derived', 'model', 'reconstructed', 'missing', 'permission-denied', 'unknown']);
const CATEGORIES = new Set(Object.values(SCIENTIFIC_PROVENANCE));
const DEFAULT_KIND = Object.freeze({ measured: 'recorded', calculated: 'derived', estimated: 'model', unknown: 'missing' });

const cleanText = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const cleanTime = value => {
  if (value === null || value === undefined) return null;
  const parsed = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

function normalizeProvenance(category, provenance = {}) {
  const source = cleanText(provenance.source);
  const label = cleanText(provenance.label);
  const note = cleanText(provenance.note);
  const kind = cleanText(provenance.kind) || DEFAULT_KIND[category];
  if (!PROVENANCE_KINDS.has(kind)) throw new TypeError(`invalid scientific provenance kind: ${kind}`);
  if (category === 'measured' && ['model', 'reconstructed'].includes(kind)) throw new TypeError('measured cannot use model or reconstructed provenance');
  if (category === 'estimated' && ['recorded', 'derived'].includes(kind)) throw new TypeError('estimated cannot use recorded or derived provenance');
  if (category === 'unknown' && !['missing', 'permission-denied', 'unknown'].includes(kind)) throw new TypeError('unknown requires missing, permission-denied or unknown provenance');
  return { kind, ...(source ? { source } : {}), ...(label ? { label } : {}), ...(note ? { note } : {}) };
}

export function scientificValue(value, { unit, category, provenance, confidence = null, timestamp = null, validFrom = null, validTo = null, reason = null } = {}) {
  const normalizedUnit = cleanText(unit);
  if (!normalizedUnit) throw new TypeError('scientific value unit is required');
  if (!CATEGORIES.has(category)) throw new TypeError(`invalid scientific category: ${category}`);
  const normalizedProvenance = normalizeProvenance(category, provenance);
  const normalizedValue = category === 'unknown' ? null : (value ?? null);
  if (category !== 'unknown' && normalizedValue === null) throw new TypeError(`${category} scientific value cannot be null`);
  const normalizedConfidence = confidence === null || confidence === undefined ? null : cleanText(confidence);
  if (confidence !== null && confidence !== undefined && !normalizedConfidence) throw new TypeError('scientific confidence must be text');
  return {
    value: normalizedValue,
    unit: normalizedUnit,
    category,
    provenance: normalizedProvenance,
    confidence: normalizedConfidence,
    timestamp: cleanTime(timestamp),
    validFrom: cleanTime(validFrom),
    validTo: cleanTime(validTo),
    ...(cleanText(reason) ? { reason: cleanText(reason) } : {})
  };
}

export function unknownScientificValue(unit, reason = 'unavailable', options = {}) {
  return scientificValue(null, { ...options, unit, category: 'unknown', provenance: { kind: options.provenance?.kind || (reason === 'permission-denied' ? 'permission-denied' : 'missing'), source: options.provenance?.source, note: options.provenance?.note }, reason });
}

export function createScientificSnapshot({ sessionId = null, period = null, fields = {}, raw = {}, metadata = {} } = {}) {
  const normalizedFields = {};
  for (const [name, field] of Object.entries(fields || {})) {
    if (!field || typeof field !== 'object') throw new TypeError(`scientific field ${name} is invalid`);
    normalizedFields[name] = scientificValue(field.value, field);
  }
  return {
    schema: 'scientificSnapshot',
    version: SCIENTIFIC_SNAPSHOT_VERSION,
    sessionId: cleanText(sessionId),
    period: period && typeof period === 'object' ? { start: cleanTime(period.start), end: cleanTime(period.end) } : null,
    fields: normalizedFields,
    raw: raw && typeof raw === 'object' ? raw : {},
    metadata: metadata && typeof metadata === 'object' ? { ...metadata } : {}
  };
}

export function projectScientificSnapshot(snapshot, allowedFields = []) {
  const allowed = new Set(Array.isArray(allowedFields) ? allowedFields : []);
  const fields = {};
  for (const [name, field] of Object.entries(snapshot?.fields || {})) {
    fields[name] = allowed.has(name) ? field : unknownScientificValue(field.unit, 'permission-denied', { provenance: { kind: 'permission-denied' } });
  }
  return { ...snapshot, fields };
}
