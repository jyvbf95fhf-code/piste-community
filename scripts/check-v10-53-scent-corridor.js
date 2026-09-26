const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const point = (lat, lon, recorded_at) => ({ lat, lon, recorded_at });
const route = [
  point(48.1000, 7.1000, '2026-09-26T10:00:00Z'),
  point(48.1010, 7.1000, '2026-09-26T10:10:00Z'),
  point(48.1020, 7.1000, '2026-09-26T10:20:00Z')
];

(async () => {
  const engine = await import('../scent-corridor-engine.mjs');
  const { computeScentCorridor, validateScentCorridorInput, normalizeWeatherForScentCorridor, normalizeTrackForScentCorridor, getScentCorridorConfidence } = engine;
  assert(typeof computeScentCorridor === 'function', 'computeScentCorridor missing');
  assert(typeof validateScentCorridorInput === 'function', 'validateScentCorridorInput missing');
  assert(typeof normalizeWeatherForScentCorridor === 'function', 'weather normalizer missing');
  assert(typeof normalizeTrackForScentCorridor === 'function', 'track normalizer missing');
  assert(typeof getScentCorridorConfidence === 'function', 'confidence helper missing');
  const source = require('fs').readFileSync('scent-corridor-engine.mjs', 'utf8');
  const app = require('fs').readFileSync('app.js', 'utf8');
  assert(app.includes("from './scent-corridor-engine.mjs'"), 'app does not use central engine');
  assert(!/\b(document|window|L\.|fetch\s*\()/.test(source), 'engine must remain UI/network independent');

  const input = {
    track: route,
    weather: { source: 'open-meteo', wind_direction_deg: 90, wind_speed_kmh: 12, wind_gusts_kmh: 22, temperature_c: 18, humidity_pct: 65, precipitation_mm: 0 },
    trackStartedAt: '2026-09-26T10:00:00Z',
    currentTime: '2026-09-26T11:00:00Z',
    environment: 'mixed',
    gpsQuality: { accuracy_m: 8 }
  };
  const validation = validateScentCorridorInput(input);
  assert(validation.valid, 'minimal valid input rejected');
  const result = computeScentCorridor(input);
  assert(result && result.geometry, 'geometry missing');
  assert(result.centerline.length === route.length, 'centerline length mismatch');
  assert(result.innerBoundary.length === route.length * 2 && result.outerBoundary.length === route.length * 2, 'boundaries polygon length mismatch');
  assert(['high', 'medium', 'low'].includes(result.confidence.level), 'invalid confidence level');
  assert(Number.isFinite(result.confidence.score), 'confidence score invalid');
  assert(result.provenance.weather.wind_speed_kmh, 'weather provenance missing');
  assert(result.warnings.every(w => w && w.code && w.message), 'warning shape invalid');

  const deterministic = computeScentCorridor(input);
  assert(JSON.stringify(result) === JSON.stringify(deterministic), 'result is not deterministic');
  assert(result.centerline.every(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)), 'NaN/Infinity in centerline');
  assert(result.outerWidthsM.every(v => Number.isFinite(v) && v >= 0 && v <= 500), 'width outside bounds');

  const weather = normalizeWeatherForScentCorridor({ wind_direction_deg: 90, wind_speed_kmh: 4 });
  assert(weather.wind_speed_kmh.value === 4 && weather.wind_speed_kmh.provenance === 'unavailable' || weather.wind_speed_kmh.provenance, 'weather normalization failed');
  const trackMissingTime = normalizeTrackForScentCorridor([{ lat: 48.1, lon: 7.1 }, { lat: 48.2, lon: 7.2 }]);
  assert(trackMissingTime.points.length === 2 && trackMissingTime.hasTimestamps === false, 'missing timestamp handling failed');
  const invalid = computeScentCorridor({ track: [{ lat: 999, lon: 2 }, { lat: 48.1, lon: 7.1 }], weather: null });
  assert(invalid.geometry === null && invalid.warnings.some(w => w.code === 'insufficient_track'), 'invalid track handling failed');
  const noWeather = computeScentCorridor({ track: route, trackStartedAt: route[0].recorded_at, currentTime: route[1].recorded_at });
  assert(noWeather.geometry && noWeather.confidence.level === 'low', 'missing weather confidence failed');
  const reconstructed = computeScentCorridor({ ...input, weather: { ...input.weather, provenance: 'reconstructed', source: 'historical-open-meteo' } });
  assert(reconstructed.provenance.weather.wind_speed_kmh === 'reconstructed', 'historical provenance failed');
  const longRoute = Array.from({ length: 180 }, (_, index) => point(48.1 + index * 0.00001, 7.1 + index * 0.00001, new Date(Date.parse(route[0].recorded_at) + index * 60000).toISOString()));
  const longResult = computeScentCorridor({ ...input, track: longRoute, currentTime: new Date(Date.parse(route[0].recorded_at) + 3 * 3600000).toISOString() });
  assert(longResult.centerline.length === 180 && longResult.outerBoundary.every(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)), 'long trace calculation failed');
  assert(getScentCorridorConfidence(input, result).level === result.confidence.level, 'confidence helper mismatch');
  console.log('check-v10-53-scent-corridor: PASS');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
