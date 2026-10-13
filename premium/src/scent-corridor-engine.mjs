/*
 * Native, deterministic and UI-agnostic model for the estimated scent corridor.
 * It is an explanatory geometry heuristic, never a measured position of scent.
 */

export const SCENT_CORRIDOR_VERSION = '1.0';
export const SCENT_CORRIDOR_DEFAULT_ON = true;
const EARTH_RADIUS_M = 6371008.8;
const MAX_WIDTH_M = 500;
const MAX_DRIFT_M = 400;

const finite = value => Number.isFinite(Number(value));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function parseTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.abs(value) < 1e12 ? value * 1000 : value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function provenanceFor(value, fallback = 'unavailable') {
  if (['measured', 'reconstructed', 'calculated', 'estimated', 'unavailable'].includes(value)) return value;
  return fallback;
}

export function normalizeTrackForScentCorridor(track) {
  const source = Array.isArray(track) ? track : [];
  const warnings = [];
  const points = [];
  source.forEach((raw, index) => {
    const lat = Number(raw?.lat);
    const lon = Number(raw?.lon ?? raw?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      warnings.push({ code: 'invalid_coordinate', message: 'Un point GPS invalide a été ignoré.', index });
      return;
    }
    const timestamp = parseTimestamp(raw?.recorded_at ?? raw?.timestamp ?? raw?.t);
    points.push({
      lat,
      lon,
      timestamp,
      altitude: finite(raw?.altitude) ? Number(raw.altitude) : null,
      accuracy_m: finite(raw?.accuracy_m ?? raw?.accuracy) ? Number(raw.accuracy_m ?? raw.accuracy) : null,
      speed_mps: finite(raw?.speed_mps ?? raw?.speed) ? Number(raw.speed_mps ?? raw.speed) : null,
      heading_deg: finite(raw?.heading_deg ?? raw?.heading) ? Number(raw.heading_deg ?? raw.heading) : null,
      sourceIndex: index
    });
  });
  const timestampCount = points.filter(point => point.timestamp !== null).length;
  const hasTimestamps = points.length > 0 && timestampCount === points.length;
  if (!hasTimestamps) warnings.push({ code: 'incomplete_timestamps', message: 'Les horodatages GPS sont absents ou incomplets.' });
  const ordered = hasTimestamps ? points.slice().sort((a, b) => a.timestamp - b.timestamp || a.sourceIndex - b.sourceIndex) : points;
  return {
    points: ordered,
    hasTimestamps,
    startTimestamp: hasTimestamps ? ordered[0]?.timestamp ?? null : null,
    endTimestamp: hasTimestamps ? ordered.at(-1)?.timestamp ?? null : null,
    durationMs: hasTimestamps && ordered.length > 1 ? Math.max(0, ordered.at(-1).timestamp - ordered[0].timestamp) : null,
    warnings,
    provenance: { coordinates: 'measured', timestamps: hasTimestamps ? 'measured' : 'unavailable' }
  };
}

export function normalizeWeatherForScentCorridor(weather) {
  const source = weather && typeof weather === 'object' ? weather : {};
  const explicit = source.fieldProvenance || {};
  const defaultProvenance = provenanceFor(source.provenance, /histor|archive|reconstruct/i.test(String(source.source || '')) ? 'reconstructed' : 'unavailable');
  const number = (keys, min = -Infinity, max = Infinity) => {
    const key = keys.find(name => finite(source[name]));
    if (!key) return { value: null, provenance: 'unavailable' };
    return { value: clamp(Number(source[key]), min, max), provenance: provenanceFor(explicit[key], defaultProvenance === 'unavailable' ? 'measured' : defaultProvenance) };
  };
  const direction = number(['wind_direction_deg', 'wind_direction_10m'], 0, 360);
  if (direction.value !== null) direction.value = ((direction.value % 360) + 360) % 360;
  return {
    wind_direction_deg: direction,
    wind_speed_kmh: number(['wind_speed_kmh', 'wind_speed_10m'], 0, 150),
    wind_gusts_kmh: number(['wind_gusts_kmh', 'gust_kmh', 'wind_gusts_10m'], 0, 200),
    temperature_c: number(['temperature_c', 'temperature_2m'], -80, 80),
    humidity_pct: number(['humidity_pct', 'relative_humidity_2m'], 0, 100),
    precipitation_mm: number(['precipitation_mm', 'precipitation', 'rain'], 0, 1000),
    source: source.source || null,
    status: source.status || null
  };
}

function destination(point, bearingDeg, distanceM) {
  const bearing = bearingDeg * Math.PI / 180;
  const lat = point.lat * Math.PI / 180;
  const lon = point.lon * Math.PI / 180;
  const angular = distanceM / EARTH_RADIUS_M;
  const nextLat = Math.asin(Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(bearing));
  const nextLon = lon + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat), Math.cos(angular) - Math.sin(lat) * Math.sin(nextLat));
  return { lat: nextLat * 180 / Math.PI, lon: ((nextLon * 180 / Math.PI + 540) % 360) - 180 };
}

function bearingBetween(a, b) {
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const delta = (b.lon - a.lon) * Math.PI / 180;
  return (Math.atan2(Math.sin(delta) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(delta)) * 180 / Math.PI + 360) % 360;
}

function weatherValue(weather, key) { return weather[key]?.value ?? null; }

function warning(code, message, details = {}) { return { code, message, ...details }; }

export function validateScentCorridorInput(input = {}) {
  const track = normalizeTrackForScentCorridor(input.track);
  const errors = [];
  if (track.points.length < 2) errors.push({ code: 'insufficient_track', message: 'Au moins deux points GPS valides sont nécessaires.' });
  return { valid: errors.length === 0, errors, trackWarnings: track.warnings };
}

export function getScentCorridorConfidence(input = {}, result = {}) {
  const weather = normalizeWeatherForScentCorridor(input.weather);
  const track = result.track || normalizeTrackForScentCorridor(input.track);
  const availableWeather = ['wind_direction_deg', 'wind_speed_kmh'].filter(key => weatherValue(weather, key) !== null).length;
  const weatherScore = availableWeather / 2;
  const timestampScore = track.hasTimestamps ? 1 : 0;
  const ageScore = result.ageHours !== null && result.ageHours !== undefined ? 1 : 0;
  const accuracy = Number(input.gpsQuality?.accuracy_m ?? track.points.find(point => point.accuracy_m !== null)?.accuracy_m);
  const gpsScore = Number.isFinite(accuracy) ? (accuracy <= 10 ? 1 : accuracy <= 30 ? .7 : .35) : .45;
  const score = clamp(.5 * weatherScore + .2 * timestampScore + .15 * ageScore + .15 * gpsScore, 0, 1);
  return { score: Number(score.toFixed(3)), level: score >= .75 ? 'high' : score >= .45 ? 'medium' : 'low' };
}

export function computeScentCorridor(input = {}) {
  const track = normalizeTrackForScentCorridor(input.track);
  const weather = normalizeWeatherForScentCorridor(input.weather);
  const warnings = [...track.warnings];
  if (track.points.length < 2) {
    warnings.push(warning('insufficient_track', 'Couloir indisponible : trace GPS insuffisante.'));
    return { version: SCENT_CORRIDOR_VERSION, enabled: SCENT_CORRIDOR_DEFAULT_ON, geometry: null, centerline: [], innerBoundary: [], outerBoundary: [], innerWidthsM: [], outerWidthsM: [], ageHours: null, confidence: { score: 0, level: 'low' }, provenance: { weather: {}, gps: 'measured', age: 'unavailable' }, warnings };
  }
  const referenceMs = parseTimestamp(input.trackStartedAt ?? input.referenceTime ?? track.startTimestamp);
  const nowMs = parseTimestamp(input.currentTime) ?? Date.now();
  const ageHours = referenceMs === null ? null : clamp(Math.max(0, nowMs - referenceMs) / 3600000, 0, 24 * 30);
  if (ageHours === null) warnings.push(warning('track_age_unknown', 'Âge de piste inconnu : dispersion limitée à une estimation prudente.'));
  const speed = weatherValue(weather, 'wind_speed_kmh') ?? 0;
  const gust = weatherValue(weather, 'wind_gusts_kmh');
  const direction = weatherValue(weather, 'wind_direction_deg');
  const temperature = weatherValue(weather, 'temperature_c');
  const humidity = weatherValue(weather, 'humidity_pct');
  const rain = weatherValue(weather, 'precipitation_mm');
  if (direction === null || speed === null) warnings.push(warning('wind_unavailable', 'Vent indisponible : le couloir est une estimation de faible confiance.'));
  if (gust === null) warnings.push(warning('gusts_unavailable', 'Rafales indisponibles.'));
  if (temperature === null) warnings.push(warning('temperature_unavailable', 'Température indisponible.'));
  if (humidity === null) warnings.push(warning('humidity_unavailable', 'Humidité indisponible.'));
  if (rain === null) warnings.push(warning('rain_unavailable', 'Pluie indisponible.'));
  const effectiveDirection = direction ?? 0;
  const downwind = (effectiveDirection + 180) % 360;
  const age = ageHours ?? 0;
  const environment = input.environment || input.terrainContext?.environment || 'unknown';
  const terrainFactor = { open: 1, mixed: .9, forest: .7, urban: .8 }[environment] ?? 1;
  const gustFactor = gust === null ? 1 : 1 + clamp(Math.max(0, gust - speed), 0, 80) / 180;
  const moistureFactor = humidity === null ? 1 : 1 + clamp((humidity - 50) / 200, -.2, .25);
  const rainFactor = rain === null ? 1 : 1 + clamp(rain / 80, 0, .25);
  const temperatureFactor = temperature === null ? 1 : 1 + clamp((20 - temperature) / 200, -.15, .15);
  const drift = clamp(speed * (12 + 7 * Math.sqrt(Math.max(age, .05))) * gustFactor * terrainFactor, 0, MAX_DRIFT_M);
  const centerline = track.points.map(point => destination(point, downwind, drift));
  const outerWidthsM = track.points.map((_, index) => clamp((9 + speed * 1.35 + age * 3.2) * gustFactor * moistureFactor * rainFactor * temperatureFactor * (1 + index / Math.max(1, track.points.length - 1) * .12), 8, MAX_WIDTH_M));
  const innerWidthsM = outerWidthsM.map(width => clamp(width * .52, 5, MAX_WIDTH_M / 2));
  const boundary = widths => {
    const left = centerline.map((point, index) => destination(point, downwind - 90, widths[index]));
    const right = centerline.map((point, index) => destination(point, downwind + 90, widths[index])).reverse();
    return [...left, ...right];
  };
  const confidence = getScentCorridorConfidence(input, { track, ageHours });
  const weatherProvenance = Object.fromEntries(Object.entries(weather).filter(([, value]) => value && typeof value === 'object' && 'provenance' in value).map(([key, value]) => [key, value.provenance]));
  const provenance = { gps: 'measured', timestamps: track.hasTimestamps ? 'measured' : 'unavailable', age: ageHours === null ? 'unavailable' : 'calculated', weather: weatherProvenance, geometry: 'estimated' };
  if (weather.source && /histor|archive|reconstruct/i.test(weather.source)) warnings.push(warning('reconstructed_historical_weather', 'La météo historique est reconstruite et non mesurée localement.'));
  if (!track.hasTimestamps) warnings.push(warning('old_track_without_timing', 'La chronologie GPS est incomplète.'));
  if (input.terrainContext?.relief === undefined && input.terrainContext?.landCover === undefined) warnings.push(warning('terrain_unknown', 'Relief et végétation indisponibles pour ce calcul.'));
  return {
    version: SCENT_CORRIDOR_VERSION,
    enabled: SCENT_CORRIDOR_DEFAULT_ON,
    geometry: { type: 'estimated_corridor', centerline, innerBoundary: boundary(innerWidthsM), outerBoundary: boundary(outerWidthsM), downwindBearingDeg: downwind, driftM: Number(drift.toFixed(2)), environment },
    centerline,
    innerBoundary: boundary(innerWidthsM),
    outerBoundary: boundary(outerWidthsM),
    innerWidthsM,
    outerWidthsM,
    ageHours: ageHours === null ? null : Number(ageHours.toFixed(3)),
    confidence,
    provenance,
    warnings,
    limitations: ['Estimation déterministe et explicable.', 'Ne localise pas une odeur avec certitude.', 'Le relief, la végétation et la chimie réelle du terrain ne sont pas modélisés sans données autorisées.']
  };
}
