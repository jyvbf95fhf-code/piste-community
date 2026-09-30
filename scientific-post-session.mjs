/**
 * Post-session adapter: maps the V10.53 corridor result into the V10.55
 * scientificSnapshot contract. It does not calculate a corridor or fetch data.
 */
import { createScientificSnapshot, scientificValue, unknownScientificValue } from './scientific-snapshot.mjs';

const WEATHER_FIELDS = ['wind_direction_deg', 'wind_speed_kmh', 'wind_gusts_kmh', 'temperature_c', 'humidity_pct', 'precipitation_mm'];
const missingWarning = warning => warning?.code && /unavailable|unknown|incomplete|missing|reconstructed|insufficient/.test(warning.code);
const cleanWeather = weather => WEATHER_FIELDS.reduce((out, key) => {
  if (weather && weather[key] !== undefined && weather[key] !== null) out[key] = weather[key];
  return out;
}, {});

function weatherScientificValue(weather) {
  const source = weather?.source || null;
  const reconstructed = weather?.provenance === 'reconstructed' || /histor|archive|reconstruct/i.test(String(source || ''));
  const values = cleanWeather(weather);
  if (!Object.keys(values).length) return unknownScientificValue('weather-record', 'weather-unavailable');
  return scientificValue({ source, fields: Object.keys(values) }, {
    unit: 'weather-record',
    category: reconstructed ? 'estimated' : 'measured',
    provenance: { kind: reconstructed ? 'reconstructed' : 'recorded', source: source || 'weather_snapshot', label: reconstructed ? 'Météo historique reconstruite' : 'Snapshot météo enregistré' },
    confidence: reconstructed ? 'low' : 'medium'
  });
}

export function buildPostSessionCorridorSnapshot({ sessionId = null, result = null, weather = null, referencePointCount = 0, permission = true, reason = null } = {}) {
  if (!permission) return unavailableCorridorSnapshot({ sessionId, reason: reason || 'permission-denied', permissionDenied: true });
  const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
  const missing = warnings.filter(missingWarning).map(warning => warning.code);
  const hasGeometry = !!result?.geometry;
  const corridor = hasGeometry
    ? scientificValue({ type: result.geometry.type, version: result.version, pointCount: referencePointCount }, { unit: 'estimated-corridor', category: 'estimated', provenance: { kind: 'model', source: 'scent-corridor-engine@1.0', label: 'Couloir olfactif estimé' }, confidence: result.confidence?.level || 'low' })
    : unknownScientificValue('estimated-corridor', reason || 'corridor-unavailable');
  const fields = {
    corridor,
    confidence: hasGeometry ? scientificValue(result.confidence?.score ?? 0, { unit: 'ratio', category: 'calculated', provenance: { kind: 'derived', source: 'scent-corridor-engine@1.0' }, confidence: result.confidence?.level || 'low' }) : unknownScientificValue('ratio', 'corridor-unavailable'),
    weather: weatherScientificValue(weather),
    referencePointCount: referencePointCount > 0 ? scientificValue(referencePointCount, { unit: 'count', category: 'measured', provenance: { kind: 'recorded', source: 'authorized-reference-track' } }) : unknownScientificValue('count', 'reference-missing')
  };
  return createScientificSnapshot({
    sessionId,
    fields,
    metadata: {
      state: !hasGeometry ? 'unavailable' : missing.length ? 'partial' : 'complete',
      missing,
      warnings: warnings.map(warning => warning.code),
      reason: reason || (!hasGeometry ? 'corridor-unavailable' : null),
      engine: 'scent-corridor-engine@1.0'
    }
  });
}

export function adaptScientificMetric(metric, { unit = 'unknown', source = 'scientific-metrics-engine@1.0' } = {}) {
  if (!metric || metric.provenance === 'unavailable' || metric.value === null || metric.value === undefined) {
    return unknownScientificValue(unit, metric?.reason || 'source-unavailable', { provenance: { kind: 'missing', source } });
  }
  const category = ['measured', 'calculated', 'estimated'].includes(metric.provenance) ? metric.provenance : 'calculated';
  const kind = category === 'measured' ? 'recorded' : category === 'estimated' ? 'model' : 'derived';
  return scientificValue(metric.value, { unit, category, provenance: { kind, source }, confidence: metric.confidence || null });
}

export function unavailableCorridorSnapshot({ sessionId = null, reason = 'corridor-unavailable', permissionDenied = false } = {}) {
  const kind = permissionDenied ? 'permission-denied' : 'missing';
  return createScientificSnapshot({
    sessionId,
    fields: {
      corridor: unknownScientificValue('estimated-corridor', reason, { provenance: { kind } }),
      confidence: unknownScientificValue('ratio', reason, { provenance: { kind } }),
      weather: unknownScientificValue('weather-record', 'source-unavailable'),
      referencePointCount: unknownScientificValue('count', 'reference-missing')
    },
    metadata: { state: 'unavailable', missing: [reason], warnings: [], reason, engine: 'scent-corridor-engine@1.0' }
  });
}

export function corridorSummaryState(snapshot) {
  return ['complete', 'partial', 'unavailable'].includes(snapshot?.metadata?.state) ? snapshot.metadata.state : 'unavailable';
}

export function corridorSummaryText(snapshot) {
  const state = corridorSummaryState(snapshot);
  if (state === 'unavailable') return 'Estimation indisponible';
  const confidence = snapshot.fields?.corridor?.confidence || 'faible';
  const weather = snapshot.fields?.weather?.category === 'estimated' ? ' · météo reconstruite' : snapshot.fields?.weather?.category === 'unknown' ? ' · météo inconnue' : '';
  return `Couloir olfactif estimé · confiance ${confidence}${weather}`;
}
