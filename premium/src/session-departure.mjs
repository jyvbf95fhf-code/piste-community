export const MAX_DEPARTURE_LENGTH = 160;

export function normalizeSessionDeparture(value) {
  if (typeof value !== 'string' || /[\p{Cc}\p{Cs}]/u.test(value)) return null;
  const destination = value.trim();
  if (!destination || destination.length > MAX_DEPARTURE_LENGTH) return null;
  const pair = destination.match(/^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/);
  if (!pair) return destination;
  return departureFromPoint({ latitude: Number(pair[1]), longitude: Number(pair[2]) });
}

export function departureFromPoint(point) {
  if (!Number.isFinite(point?.latitude) || Math.abs(point.latitude) > 90 ||
      !Number.isFinite(point?.longitude) || Math.abs(point.longitude) > 180) return null;
  return `${Number(point.latitude.toFixed(6))}, ${Number(point.longitude.toFixed(6))}`;
}
