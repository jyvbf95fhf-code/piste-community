import {formatTrackAge} from './coaching-time.mjs';

const parseTimestamp = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function calculateTrackAge(sourceAt, trackingStartedAt, source = 'disappearanceAt') {
  const sourceMs = parseTimestamp(sourceAt);
  const startMs = parseTimestamp(trackingStartedAt);
  if (sourceMs === null || startMs === null || sourceMs > startMs) return null;
  const elapsedMs = startMs - sourceMs;
  const totalMinutes = Math.floor(elapsedMs / 60_000);
  return {
    elapsedMs,
    totalMinutes,
    label: totalMinutes ? formatTrackAge(elapsedMs/1000) : 'moins d’une minute',
    source
  };
}

export function resolveTrackAgeReference({ disappearanceAt = null, lastContactAt = null } = {}, referenceAt = Date.now()) {
  const referenceMs = parseTimestamp(referenceAt);
  const disappearanceMs = parseTimestamp(disappearanceAt);
  if (disappearanceMs !== null && (referenceMs === null || disappearanceMs <= referenceMs)) return { at: disappearanceAt, source: 'disappearanceAt' };
  const contactMs = parseTimestamp(lastContactAt);
  if (contactMs !== null && (referenceMs === null || contactMs <= referenceMs)) return { at: lastContactAt, source: 'lastContactAt' };
  return null;
}
