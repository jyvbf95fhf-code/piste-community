import { unknownScientificValue, scientificValue } from './scientific-snapshot.mjs';

const WEATHER_FIELDS = [
  ['temperature', 'temperature_c', '°C'],
  ['humidity', 'humidity_pct', '%'],
  ['windSpeed', 'wind_speed_kmh', 'km/h'],
  ['windDirection', 'wind_direction_deg', '°'],
  ['windGusts', 'wind_gusts_kmh', 'km/h'],
  ['precipitation', 'precipitation_mm', 'mm']
];

const finite = value => Number.isFinite(Number(value));

function legacyCategory(value, fallback = 'unknown') {
  if (value?.category && ['measured', 'calculated', 'estimated', 'unknown'].includes(value.category)) return value.category;
  if (value?.provenance === 'unavailable' || value?.provenance === 'unknown') return 'unknown';
  if (value?.provenance === 'measured' || value?.provenance === 'recorded') return 'measured';
  if (value?.provenance === 'estimated' || value?.provenance === 'reconstructed') return 'estimated';
  if (value?.provenance === 'calculated' || value?.provenance === 'derived') return 'calculated';
  return fallback;
}

function provenanceFor(category, weather, field) {
  if (category === 'measured') return { kind: 'recorded', source: weather.source || 'weather_snapshot', label: 'Mesuré' };
  if (category === 'estimated') return { kind: 'reconstructed', source: weather.source || 'historical-weather', label: 'Reconstruit' };
  if (category === 'calculated') return { kind: 'derived', source: 'scientific-metrics', label: 'Calculé' };
  return { kind: 'missing', source: weather?.source || 'weather-unavailable', label: 'Indisponible' };
}

function weatherField(weather, source, unit) {
  const category = legacyCategory(weather, null) || (source == null || !finite(source) ? 'unknown' : 'estimated');
  if (category === 'unknown' || source == null || !finite(source)) return unknownScientificValue(unit, 'weather-unavailable', { provenance: provenanceFor('unknown', weather || {}, null) });
  return scientificValue(Number(source), { unit, category, provenance: provenanceFor(category, weather || {}, source) });
}

function metricField(entry, unit, reason = 'metric-unavailable') {
  const category = legacyCategory(entry);
  if (category === 'unknown' || entry?.value == null || !finite(entry.value)) return unknownScientificValue(unit, reason, { provenance: { kind: 'missing', source: 'scientific-metrics' } });
  return scientificValue(Number(entry.value), { unit, category, provenance: { kind: category === 'calculated' ? 'derived' : category === 'estimated' ? 'model' : 'recorded', source: 'scientific-metrics' } });
}

export function buildScientificDebrief({ session = {}, actual = [], trace = [], metrics = {}, weather = null, permissions = {} } = {}) {
  const weatherModel = {};
  for (const [name, key, unit] of WEATHER_FIELDS) weatherModel[name] = weatherField(weather, weather?.[key], unit);
  const timing = metrics.timing || {}, distance = metrics.distance || {};
  const timingModel = {
    laying: metricField(timing.laying, 'ms', 'laying-time-unavailable'),
    trackAge: metricField(timing.trackAgeAtDriverStart, 'ms', 'track-age-unavailable'),
    recovery: metricField(timing.recovery, 'ms', 'recovery-time-unavailable'),
    total: metricField(timing.total, 'ms', 'total-time-unavailable')
  };
  const distanceModel = {
    trace: metricField(distance.trace, 'm', 'trace-distance-unavailable'),
    driver: metricField(distance.actual, 'm', 'driver-distance-unavailable')
  };
  const referenceAllowed = permissions.reference !== false;
  const reference = referenceAllowed ? metricField(distance.reference, 'm', 'reference-distance-unavailable') : unknownScientificValue('m', 'permission-denied', { provenance: { kind: 'permission-denied' } });
  const corridor = !referenceAllowed
    ? unknownScientificValue('geometry', 'permission-denied', { provenance: { kind: 'permission-denied' } })
    : metrics.scentCorridor?.available
      ? scientificValue('available', { unit: 'geometry', category: 'estimated', provenance: { kind: 'model', source: 'scent-corridor-engine', label: 'Couloir olfactif estimé' }, confidence: metrics.scentCorridor.confidence || null })
      : unknownScientificValue('geometry', 'corridor-unavailable', { provenance: { kind: 'missing', source: 'scent-corridor-engine' } });
  const weatherKnown = WEATHER_FIELDS.filter(([name]) => weatherModel[name].category !== 'unknown').length;
  const requiredWeather = ['temperature', 'humidity', 'windSpeed', 'windDirection'];
  const requiredWeatherKnown = requiredWeather.every(name => weatherModel[name].category !== 'unknown');
  const summary = requiredWeatherKnown ? 'complete' : weatherKnown || actual.length || trace.length ? 'partial' : 'unavailable';
  return {
    schema: 'scientificDebrief',
    version: '1.0',
    sessionId: session.id || null,
    metadata: { corridorSource: 'scent-corridor-engine', sourcePointCounts: { actual: actual.length, trace: trace.length } },
    weather: weatherModel,
    timing: timingModel,
    distance: distanceModel,
    reference,
    corridor,
    summary
  };
}
