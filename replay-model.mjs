/**
 * Pure, read-only replay data model.
 *
 * This module deliberately does not import the application, Supabase, Leaflet
 * or geolocation APIs. Callers provide only the rows they are already allowed
 * to read and receive a normalized in-memory dataset.
 */

export const REPLAY_ACTORS = Object.freeze({
  TRACEUR: 'traceur',
  DRIVER: 'driver',
  PLANNED: 'planned',
  EXTERNAL: 'external'
});

const TIMESTAMP_KEYS = Object.freeze(['recorded_at', 'created_at', 'updated_at', 'timestamp', 't', 'time']);

function finiteNumber(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeTimestamp(value) {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value === 'number' || (typeof value === 'string' && /^\s*-?\d+(?:\.\d+)?\s*$/.test(value))) {
    const number = finiteNumber(value);
    if (number === null || number < 0) return null;
    // Unix seconds are currently below 1e11; larger values are milliseconds.
    return number < 100000000000 ? Math.round(number * 1000) : Math.round(number);
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coordinateFrom(row, key, alternateKey) {
  const value = finiteNumber(row?.[key] ?? row?.[alternateKey]);
  if (value === null) return null;
  if (key === 'lat' && (value < -90 || value > 90)) return null;
  if (key === 'lon' && (value < -180 || value > 180)) return null;
  return value;
}

function firstValue(row, keys) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return null;
}

function timestampValue(row, timestampKey) {
  if (timestampKey) return row?.[timestampKey] ?? null;
  return firstValue(row, TIMESTAMP_KEYS);
}

function optionalMetric(row, keys) {
  return finiteNumber(firstValue(row, keys));
}

export function normalizeReplayPoint(row, options = {}) {
  if (!row || typeof row !== 'object') return null;
  const lat = coordinateFrom(row, 'lat', 'latitude');
  const lon = coordinateFrom(row, 'lon', 'lng');
  if (lat === null || lon === null) return null;
  const timestampInput = timestampValue(row, options.timestampKey);
  const timestamp = timestampInput === null ? null : normalizeTimestamp(timestampInput);
  if (timestampInput !== null && timestamp === null) return null;
  const point = {
    actor: row.actor ?? options.actor ?? null,
    timestamp,
    lat,
    lon,
    source: row.source ?? options.source ?? null,
    raw: row
  };
  const altitude = optionalMetric(row, ['altitudeM', 'altitude_m', 'alt']);
  const speed = optionalMetric(row, ['speedMps', 'speed_mps', 'speed']);
  const heading = optionalMetric(row, ['headingDeg', 'heading_deg', 'heading']);
  if (altitude !== null) point.altitude = altitude;
  if (speed !== null) point.speed = speed;
  if (heading !== null) point.heading = heading;
  const accuracy = optionalMetric(row, ['accuracyM', 'accuracy_m', 'acc']);
  if (accuracy !== null) point.accuracy = accuracy;
  return point;
}

export function normalizeReplayPoints(rows, options = {}) {
  const input = Array.isArray(rows) ? rows : [];
  const points = [];
  let invalidCount = 0;
  input.forEach((row, index) => {
    const point = normalizeReplayPoint(row, options);
    if (!point) {
      invalidCount += 1;
      return;
    }
    point.sourceIndex = index;
    points.push(point);
  });
  const hasTimestamps = points.length > 0 && points.every(point => Number.isFinite(point.timestamp));
  const timestampCount = points.filter(point => Number.isFinite(point.timestamp)).length;
  if (hasTimestamps) {
    points.sort((a, b) => a.timestamp - b.timestamp || a.sourceIndex - b.sourceIndex);
  }
  points.forEach(point => delete point.sourceIndex);
  return {
    points,
    invalidCount,
    timestampCount,
    hasTimestamps,
    timestampComplete: points.length > 0 && timestampCount === points.length
  };
}

export function normalizeReplayEvent(row, options = {}) {
  if (!row || typeof row !== 'object') return null;
  const timestampInput = timestampValue(row, options.timestampKey);
  const timestamp = timestampInput === null ? null : normalizeTimestamp(timestampInput);
  if (!Number.isFinite(timestamp)) return null;
  const event = {
    id: row.id ?? options.id ?? null,
    timestamp,
    type: row.type ?? row.event_type ?? row.marker_type ?? options.type ?? 'event',
    actor: row.actor ?? options.actor ?? null,
    source: row.source ?? options.source ?? null,
    timestampSource: options.timestampKey || TIMESTAMP_KEYS.find(key => row[key] !== undefined && row[key] !== null && row[key] !== '') || null,
    raw: row
  };
  const lat = coordinateFrom(row, 'lat', 'latitude');
  const lon = coordinateFrom(row, 'lon', 'lng');
  if (lat !== null && lon !== null) {
    event.lat = lat;
    event.lon = lon;
  }
  const label = row.label ?? row.name ?? row.note ?? row.comment ?? row.text ?? row.body;
  if (label !== null && label !== undefined && label !== '') event.label = String(label);
  return event;
}

function rowsFor(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.points)) return value.points;
  return [];
}

function normalizeTrack(value, actor, source) {
  return normalizeReplayPoints(rowsFor(value), { actor, source });
}

function normalizeEventRows(rows, source, type, timestampKey = null) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => normalizeReplayEvent(row, { source, type, timestampKey }))
    .filter(Boolean);
}

function trackHasPoints(track) {
  return track.points.length > 0;
}

export function buildReplayDataset(sources = {}) {
  const traceur = normalizeTrack(sources.traceur ?? sources.traceurPoints, REPLAY_ACTORS.TRACEUR, 'traceur');
  const driver = normalizeTrack(sources.driver ?? sources.driverPoints ?? sources.conducteur, REPLAY_ACTORS.DRIVER, 'driver');
  const planned = normalizeTrack(sources.planned ?? sources.plannedRoute ?? sources.route, REPLAY_ACTORS.PLANNED, 'planned_route');
  const external = normalizeTrack(sources.external, REPLAY_ACTORS.EXTERNAL, 'external');
  const actorTracks = [traceur, driver, external].filter(trackHasPoints);
  const timestampedActorTracks = actorTracks.filter(track => track.timestampComplete);
  const hasIncompleteTrack = actorTracks.some(track => !track.timestampComplete);
  const timestampValues = timestampedActorTracks.flatMap(track => track.points.map(point => point.timestamp));
  const startTimestamp = timestampValues.length ? Math.min(...timestampValues) : null;
  const endTimestamp = timestampValues.length ? Math.max(...timestampValues) : null;
  const hasTimestamps = actorTracks.length > 0 && !hasIncompleteTrack && timestampValues.length > 0;
  const hasAltitude = actorTracks.some(track => track.points.some(point => Number.isFinite(point.altitude)));
  const hasSpeed = actorTracks.some(track => track.points.some(point => Number.isFinite(point.speed)));
  let replayUnavailableReason = null;
  if (!actorTracks.length) replayUnavailableReason = 'no_tracks';
  else if (hasIncompleteTrack && actorTracks.some(track => track.timestampCount === 0)) replayUnavailableReason = 'missing_timestamps';
  else if (hasIncompleteTrack) replayUnavailableReason = 'incomplete_timestamps';
  const eventRows = [
    ...normalizeEventRows(sources.events, 'events'),
    ...normalizeEventRows(sources.markers, 'coaching_markers'),
    // Debrief observations are post-session records unless they carry an explicit
    // recorded_at field. Never turn created_at into a fake terrain timestamp.
    ...normalizeEventRows(sources.observations, 'coaching_debrief_observations', 'observation', 'recorded_at'),
    ...normalizeEventRows(sources.messages, 'coaching_messages', 'message')
  ];
  const uniqueEvents = [...new Map(eventRows.map(event => [
    `${event.source || ''}:${event.id || ''}:${event.timestamp}:${event.type}:${event.lat ?? ''}:${event.lon ?? ''}`,
    event
  ])).values()];
  uniqueEvents.sort((a, b) => a.timestamp - b.timestamp);
  const capabilities = {
    hasTraceur: trackHasPoints(traceur),
    hasDriver: trackHasPoints(driver),
    hasTimestamps,
    hasAltitude,
    hasSpeed,
    durationMs: startTimestamp !== null && endTimestamp !== null ? Math.max(0, endTimestamp - startTimestamp) : null,
    startTimestamp,
    endTimestamp,
    replayAvailable: hasTimestamps,
    replayUnavailableReason
  };
  return {
    tracks: { traceur: traceur.points, driver: driver.points, planned: planned.points, external: external.points },
    events: uniqueEvents,
    capabilities
  };
}
