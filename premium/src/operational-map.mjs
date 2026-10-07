import { MapShell } from './map-shell.mjs';

function mapPoint(point) {
  if (!point || point.space !== 'mock-map') return null;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: Number((x * 3.6).toFixed(2)), y: Number((y * 3).toFixed(2)) };
}

export function OperationalMap(view, { interactive = false } = {}) {
  if (!view || view.kind !== 'operational' && !view.id) return '';
  const progress = (view.progress || view.trace || []).map(mapPoint).filter(Boolean);
  const lastKnownPoint = mapPoint(view.lastKnownPoint);
  const events = (view.events || []).map(event => ({ ...event, point: mapPoint(event.point) }));
  const mapped = {
    id: view.id,
    start: progress[0] || null,
    lastKnownPoint,
    progress,
    events,
    corridor: view.corridor || (view.olfactoryCorridor ? {
      enabled: view.olfactoryCorridor.enabled,
      label: view.olfactoryCorridor.label
    } : { enabled: false })
  };
  return MapShell({
    start: mapped.start,
    showStart: false,
    paths: [],
    markers: [],
    progress: mapped.progress,
    events: mapped.events,
    corridorEnabled: mapped.corridor.enabled
  }, {
    operational: {
      missionId: mapped.id,
      interactive,
    start: mapped.start,
    lastKnownPoint: mapped.lastKnownPoint,
    trackingState: view.trackingState || 'ready',
      progress: mapped.progress,
      events: mapped.events,
      corridor: mapped.corridor
    }
  });
}
