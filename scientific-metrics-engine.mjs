/* Pure, deterministic scientific metrics. No DOM, network or persistence. */
import { computeScentCorridor, SCENT_CORRIDOR_VERSION } from './scent-corridor-engine.mjs';

export const SCIENTIFIC_METRICS_VERSION = '1.0';
export const IMMOBILITY_CONFIG = Object.freeze({
  minDurationMs: 20_000,
  maxGapMs: 120_000,
  maxDisplacementM: 12,
  poorAccuracyM: 30,
  poorAccuracyMultiplier: 1.5
});

const finite = value => Number.isFinite(Number(value));
const timestamp = value => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return Math.abs(value) < 1e12 ? value * 1000 : value;
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : null;
};
const cleanPoints = points => (Array.isArray(points) ? points : []).map((point, index) => ({
  ...point,
  lat: Number(point?.lat),
  lon: Number(point?.lon ?? point?.lng),
  accuracy_m: finite(point?.accuracy_m ?? point?.accuracy) ? Number(point.accuracy_m ?? point.accuracy) : null,
  timestamp: timestamp(point?.recorded_at ?? point?.timestamp ?? point?.t),
  sourceIndex: index
})).filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lon)).sort((a, b) => (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity) || a.sourceIndex - b.sourceIndex);
const metric = (value, unit, provenance, confidence = 'medium', extra = {}) => ({ value: value ?? null, unit, provenance, confidence, ...extra });
const unavailable = (unit, reason = 'insufficient-data') => metric(null, unit, 'unavailable', 'low', { reason });
const median = values => { const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b); if (!sorted.length) return null; const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b, distanceMeters) => typeof distanceMeters === 'function' ? Number(distanceMeters(a, b)) : NaN;
const routeDistance = (points, distanceMeters) => { let total = 0; for (let i = 1; i < points.length; i++) { const segment = distance(points[i - 1], points[i], distanceMeters); if (Number.isFinite(segment)) total += Math.max(0, segment); } return total; };
const durationBetween = (start, end) => { const a = timestamp(start), b = timestamp(end); return a !== null && b !== null && b >= a ? b - a : null; };
const confidenceFromGps = quality => quality === 'high' ? 'high' : quality === 'medium' ? 'medium' : 'low';

function gpsQuality(points) {
  if (!points.length) return { quality: 'unavailable', totalPoints: unavailable('count'), medianInterval: unavailable('ms'), significantGaps: unavailable('count'), meanAccuracy: unavailable('m'), poorAccuracyRatio: unavailable('ratio'), provenance: 'unavailable', warnings: ['no-gps-points'] };
  const intervals = [], accuracies = [];
  for (let i = 0; i < points.length; i++) {
    if (points[i].accuracy_m !== null) accuracies.push(points[i].accuracy_m);
    if (i && points[i].timestamp !== null && points[i - 1].timestamp !== null) intervals.push(points[i].timestamp - points[i - 1].timestamp);
  }
  const medianAccuracy = median(accuracies), meanAccuracy = accuracies.length ? accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length : null;
  const significant = intervals.filter(interval => interval > IMMOBILITY_CONFIG.maxGapMs).length;
  const poor = accuracies.length ? accuracies.filter(value => value > IMMOBILITY_CONFIG.poorAccuracyM).length / accuracies.length : null;
  const quality = !intervals.length && !accuracies.length ? 'low' : (meanAccuracy !== null && meanAccuracy <= 10 && significant === 0 ? 'high' : (meanAccuracy === null || meanAccuracy <= 30) && significant <= Math.max(1, Math.ceil(points.length * .05)) ? 'medium' : 'low');
  return { quality, totalPoints: metric(points.length, 'count', 'measured', confidenceFromGps(quality)), medianInterval: intervals.length ? metric(median(intervals), 'ms', 'calculated', confidenceFromGps(quality)) : unavailable('ms', 'timestamps-missing'), significantGaps: metric(significant, 'count', 'calculated', confidenceFromGps(quality)), meanAccuracy: meanAccuracy === null ? unavailable('m', 'accuracy-missing') : metric(Number(meanAccuracy.toFixed(2)), 'm', 'measured', confidenceFromGps(quality)), poorAccuracyRatio: poor === null ? unavailable('ratio', 'accuracy-missing') : metric(Number(poor.toFixed(3)), 'ratio', 'calculated', confidenceFromGps(quality)), provenance: accuracies.length ? 'measured' : 'unavailable', warnings: significant ? ['significant-gps-gaps'] : [] };
}

function manualPauseMetrics(intervals = []) {
  const clean = intervals.map(interval => { const start = timestamp(interval?.startAt ?? interval?.started_at ?? interval?.start), end = timestamp(interval?.endAt ?? interval?.ended_at ?? interval?.end); return start !== null && end !== null && end >= start ? { startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString(), durationMs: end - start, provenance: 'measured' } : null; }).filter(Boolean);
  const total = clean.reduce((sum, interval) => sum + interval.durationMs, 0);
  return { count: metric(clean.length, 'count', clean.length ? 'measured' : 'unavailable'), totalDuration: clean.length ? metric(total, 'ms', 'calculated') : unavailable('ms', 'pause-data-missing'), intervals: clean };
}

function detectImmobilities(points, quality, distanceMeters) {
  if (points.length < 2 || !points.every(point => point.timestamp !== null)) return { count: unavailable('count', 'timestamps-missing'), totalDuration: unavailable('ms', 'timestamps-missing'), meanDuration: unavailable('ms', 'timestamps-missing'), maxDuration: unavailable('ms', 'timestamps-missing'), intervals: [], provenance: 'unavailable', confidence: 'low', warnings: ['immobility-data-insufficient'] };
  const accuracy = Number(quality.meanAccuracy?.value), displacementLimit = IMMOBILITY_CONFIG.maxDisplacementM * (Number.isFinite(accuracy) && accuracy > IMMOBILITY_CONFIG.poorAccuracyM ? IMMOBILITY_CONFIG.poorAccuracyMultiplier : 1), intervals = [];
  let runStart = null, runEnd = null;
  const flush = () => { if (runStart !== null && runEnd !== null && runEnd - runStart >= IMMOBILITY_CONFIG.minDurationMs) intervals.push({ startAt: new Date(runStart).toISOString(), endAt: new Date(runEnd).toISOString(), durationMs: runEnd - runStart, provenance: 'calculated', confidence: quality.quality === 'low' ? 'low' : 'medium' }); runStart = null; runEnd = null; };
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].timestamp - points[i - 1].timestamp, moved = distance(points[i - 1], points[i], distanceMeters);
    const displacement = Number.isFinite(moved) ? moved : Infinity;
    if (dt > 0 && dt <= IMMOBILITY_CONFIG.maxGapMs && displacement <= displacementLimit) { if (runStart === null) runStart = points[i - 1].timestamp; runEnd = points[i].timestamp; } else flush();
  }
  flush();
  const durations = intervals.map(interval => interval.durationMs), total = durations.reduce((sum, value) => sum + value, 0);
  return { count: metric(intervals.length, 'count', 'calculated', quality.quality), totalDuration: metric(total, 'ms', 'calculated', quality.quality), meanDuration: metric(durations.length ? total / durations.length : 0, 'ms', 'calculated', quality.quality), maxDuration: metric(durations.length ? Math.max(...durations) : 0, 'ms', 'calculated', quality.quality), intervals, provenance: 'calculated', confidence: quality.quality, warnings: quality.quality === 'low' ? ['low-gps-quality'] : [] };
}

function distanceToReference(point, reference, distanceMeters) { if (!reference.length) return NaN; return Math.min(...reference.map(candidate => distance(point, candidate, distanceMeters)).filter(Number.isFinite)); }
function trackDeviation(actual, reference, distanceMeters, permitted) {
  if (!permitted) return { available: false, reason: 'permission-denied', median: unavailable('m', 'permission-denied'), mean: unavailable('m', 'permission-denied'), p90: unavailable('m', 'permission-denied'), max: unavailable('m', 'permission-denied') };
  if (actual.length < 1 || reference.length < 2 || typeof distanceMeters !== 'function') return { available: false, reason: 'insufficient-reference', median: unavailable('m'), mean: unavailable('m'), p90: unavailable('m'), max: unavailable('m') };
  const values = actual.map(point => distanceToReference(point, reference, distanceMeters)).filter(Number.isFinite).sort((a, b) => a - b), percentile = ratio => values[Math.min(values.length - 1, Math.floor((values.length - 1) * ratio))];
  const quality = values.length ? 'medium' : 'low';
  return { available: true, reason: null, median: metric(Number(median(values).toFixed(2)), 'm', 'calculated', quality), mean: metric(Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)), 'm', 'calculated', quality), p90: metric(Number(percentile(.9).toFixed(2)), 'm', 'calculated', quality), max: metric(Number(Math.max(...values).toFixed(2)), 'm', 'calculated', quality) };
}

function insidePolygon(point, polygon) { let inside = false; for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) { const xi = polygon[i].lon, yi = polygon[i].lat, xj = polygon[j].lon, yj = polygon[j].lat, hit = ((yi > point.lat) !== (yj > point.lat)) && point.lon < (xj - xi) * (point.lat - yi) / ((yj - yi) || Number.EPSILON) + xi; if (hit) inside = !inside; } return inside; }
function corridorMetrics(actual, source, corridorResult, distanceMeters, permitted) {
  if (!permitted) return { available: false, reason: 'permission-denied', provenance: 'unavailable' };
  if (!corridorResult?.geometry || actual.length < 1) return { available: false, reason: 'corridor-unavailable', provenance: 'unavailable' };
  const geometry = corridorResult.geometry, inside = actual.map(point => insidePolygon(point, geometry.outerBoundary)), segments = [];
  let insideDuration = 0, outsideDuration = 0, exits = 0, reentries = 0, outsideStart = null;
  for (let i = 1; i < actual.length; i++) { const dt = actual[i].timestamp !== null && actual[i - 1].timestamp !== null ? Math.max(0, actual[i].timestamp - actual[i - 1].timestamp) : 0; if (inside[i]) { insideDuration += dt; if (!inside[i - 1]) { reentries++; if (outsideStart !== null) segments.push({ startAt: new Date(outsideStart).toISOString(), endAt: new Date(actual[i - 1].timestamp).toISOString(), durationMs: Math.max(0, actual[i - 1].timestamp - outsideStart), reason: 'corridor_exit', provenance: 'calculated' }); outsideStart = null; } } else { outsideDuration += dt; if (inside[i - 1]) { exits++; outsideStart = actual[i - 1].timestamp; } } }
  if (outsideStart !== null && actual.at(-1).timestamp !== null) segments.push({ startAt: new Date(outsideStart).toISOString(), endAt: new Date(actual.at(-1).timestamp).toISOString(), durationMs: Math.max(0, actual.at(-1).timestamp - outsideStart), reason: 'corridor_exit', provenance: 'calculated' });
  const total = insideDuration + outsideDuration, center = actual.map(point => distanceToReference(point, geometry.centerline || [], distanceMeters)).filter(Number.isFinite), confidence = corridorResult.confidence?.level || 'low';
  return { available: true, provenance: 'calculated', confidence, corridorVersion: corridorResult.version || SCENT_CORRIDOR_VERSION, insideDuration: metric(insideDuration, 'ms', 'calculated', confidence), outsideDuration: metric(outsideDuration, 'ms', 'calculated', confidence), insideRatio: metric(total ? insideDuration / total : 0, 'ratio', 'calculated', confidence), outsideRatio: metric(total ? outsideDuration / total : 0, 'ratio', 'calculated', confidence), exits: metric(exits, 'count', 'calculated', confidence), reentries: metric(reentries, 'count', 'calculated', confidence), maxDistanceToCenter: center.length ? metric(Math.max(...center), 'm', 'calculated', confidence) : unavailable('m'), segments };
}

function windMetrics(actual, weather) {
  if (!actual.length || !weather || !finite(weather.wind_direction_deg)) return { available: false, reason: 'wind-unavailable', provenance: 'unavailable', samples: [] };
  const direction = Number(weather.wind_direction_deg), samples = [];
  for (let i = 1; i < actual.length; i++) { if (actual[i].timestamp === null || actual[i - 1].timestamp === null) continue; const bearing = Math.atan2((actual[i].lon - actual[i - 1].lon) * Math.cos(actual[i].lat * Math.PI / 180), actual[i].lat - actual[i - 1].lat) * 180 / Math.PI; const normalized = (bearing + 360) % 360, delta = ((normalized - direction + 540) % 360) - 180; samples.push({ at: new Date(actual[i].timestamp).toISOString(), relativeAngleDeg: Number(delta.toFixed(2)), lateralComponentKmh: finite(weather.wind_speed_kmh) ? Number((Number(weather.wind_speed_kmh) * Math.sin(delta * Math.PI / 180)).toFixed(2)) : null, provenance: 'calculated' }); }
  return { available: samples.length > 0, provenance: 'calculated', weatherProvenance: weather.provenance || 'unavailable', samples };
}

export function computeScientificMetrics(input = {}) {
  const distanceMeters = input.distanceMeters, actual = cleanPoints(input.actual || []), trace = cleanPoints(input.trace || []), reference = cleanPoints(input.reference || trace), session = input.session || {}, permissions = input.permissions || {}, quality = gpsQuality(actual), pauses = manualPauseMetrics(input.pauseIntervals || []), immobilities = detectImmobilities(actual, quality, distanceMeters);
  const totalDuration = durationBetween(session.started_at || session.start_at || actual[0]?.timestamp, session.ended_at || session.end_at || actual.at(-1)?.timestamp), layingDuration = durationBetween(session.laying_started_at || session.track_started_at, session.track_finished_at || session.laying_ended_at), trackAge = durationBetween(session.track_finished_at || session.traceur_ready_at, session.driver_started_at || actual[0]?.timestamp), recoveryDuration = durationBetween(session.driver_started_at, session.driver_finished_at || session.ended_at || actual.at(-1)?.timestamp);
  const timing = { total: totalDuration === null ? unavailable('ms', 'timestamps-missing') : metric(totalDuration, 'ms', 'calculated'), laying: layingDuration === null ? unavailable('ms', 'timestamps-missing') : metric(layingDuration, 'ms', 'calculated'), trackAgeAtDriverStart: trackAge === null ? unavailable('ms', 'timestamps-missing') : metric(trackAge, 'ms', 'calculated'), readyDelay: durationBetween(session.track_finished_at, session.traceur_ready_at) === null ? unavailable('ms', 'timestamps-missing') : metric(durationBetween(session.track_finished_at, session.traceur_ready_at), 'ms', 'calculated'), driverDelayAfterReady: durationBetween(session.traceur_ready_at, session.driver_started_at) === null ? unavailable('ms', 'timestamps-missing') : metric(durationBetween(session.traceur_ready_at, session.driver_started_at), 'ms', 'calculated'), recovery: recoveryDuration === null ? unavailable('ms', 'timestamps-missing') : metric(recoveryDuration, 'ms', 'calculated'), manualPauseDuration: pauses.totalDuration };
  const distances = { reference: reference.length > 1 ? metric(routeDistance(reference, distanceMeters), 'm', 'calculated') : unavailable('m', 'reference-missing'), actual: actual.length > 1 ? metric(routeDistance(actual, distanceMeters), 'm', 'calculated') : unavailable('m', 'track-missing'), trace: trace.length > 1 ? metric(routeDistance(trace, distanceMeters), 'm', 'calculated') : unavailable('m', 'trace-missing') };
  distances.actualToReferenceRatio = distances.reference.value > 0 && distances.actual.value !== null ? metric(distances.actual.value / distances.reference.value, 'ratio', 'calculated') : unavailable('ratio', 'reference-missing');
  const referenceAllowed = permissions.reference !== false, deterministicNow = input.currentTime ?? session.ended_at ?? actual.at(-1)?.timestamp ?? reference.at(-1)?.timestamp, corridorResult = input.corridorResult || (referenceAllowed && reference.length > 1 ? computeScentCorridor({ track: reference, weather: input.weather, trackStartedAt: session.track_finished_at || session.traceur_ready_at || reference[0]?.timestamp, currentTime: deterministicNow, environment: input.environment }) : null);
  const trackDeviationMetrics = trackDeviation(actual, reference, distanceMeters, referenceAllowed), corridor = corridorMetrics(actual, input, corridorResult, distanceMeters, referenceAllowed), scientificSegments = [...(immobilities.intervals || []).map(interval => ({ ...interval, reason: 'immobility_detected' })), ...(corridor.segments || [])];
  const computedAt = timestamp(input.computedAt ?? input.currentTime ?? session.ended_at ?? actual.at(-1)?.timestamp);
  return { metadata: { version: SCIENTIFIC_METRICS_VERSION, corridorVersion: corridorResult?.version || SCENT_CORRIDOR_VERSION, computedAt: computedAt === null ? null : new Date(computedAt).toISOString(), provenance: 'calculated' }, timing, distance: distances, gpsQuality: quality, pauses, immobilities, trackDeviation: trackDeviationMetrics, scentCorridor: corridor, wind: windMetrics(actual, input.weather), scientificSegments, warnings: [...quality.warnings, ...immobilities.warnings], raw: { actualPoints: actual.length, tracePoints: trace.length, referencePoints: reference.length } };
}
