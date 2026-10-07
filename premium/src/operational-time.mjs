const parseTimestamp = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function formatTrackAge(totalMinutes) {
  if (totalMinutes < 60) return totalMinutes === 0 ? 'moins d’une minute' : `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes ? `${hours} h ${String(minutes).padStart(2, '0')}` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j ${String(hours % 24).padStart(2, '0')} h`;
}

export function calculateTrackAge(sourceAt, trackingStartedAt, source = 'disappearanceAt') {
  const sourceMs = parseTimestamp(sourceAt);
  const startMs = parseTimestamp(trackingStartedAt);
  if (sourceMs === null || startMs === null || sourceMs > startMs) return null;
  const elapsedMs = startMs - sourceMs;
  const totalMinutes = Math.floor(elapsedMs / 60_000);
  return {
    elapsedMs,
    totalMinutes,
    label: formatTrackAge(totalMinutes),
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
