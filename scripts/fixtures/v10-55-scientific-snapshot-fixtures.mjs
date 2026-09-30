import { createScientificSnapshot, scientificValue, unknownScientificValue } from '../../scientific-snapshot.mjs';

const measured = (value, unit, source, extra = {}) => scientificValue(value, { unit, category: 'measured', provenance: { kind: 'recorded', source }, ...extra });
const calculated = (value, unit, source, extra = {}) => scientificValue(value, { unit, category: 'calculated', provenance: { kind: 'derived', source }, ...extra });
const estimated = (value, unit, source, label, extra = {}) => scientificValue(value, { ...extra, unit, category: 'estimated', provenance: { kind: extra.provenance?.kind || 'reconstructed', source, label, ...extra.provenance } });

const complete = () => createScientificSnapshot({
  sessionId: 'fixture-complete',
  period: { start: '2026-01-01T10:00:00Z', end: '2026-01-01T10:30:00Z' },
  fields: {
    gpsPointCount: measured(6, 'count', 'coaching_live_points'),
    routeDistance: measured(420, 'm', 'reference-route'),
    driverDistance: calculated(465, 'm', 'scientific-metrics-engine@1.0'),
    duration: calculated(1800000, 'ms', 'scientific-metrics-engine@1.0'),
    weather: measured({ temperatureC: 12, humidityPct: 68, windKmh: 8 }, 'weather-record', 'weather_snapshot'),
    observation: measured('synthetic observation', 'text', 'coaching_debrief_observations'),
    gpsQuality: calculated(0.92, 'ratio', 'scientific-metrics-engine@1.0')
  },
  raw: {
    route: [{ lat: 45, lon: 2, recorded_at: '2026-01-01T10:00:00Z' }, { lat: 45.001, lon: 2.001, recorded_at: '2026-01-01T10:10:00Z' }],
    trace: [{ lat: 45, lon: 2, recorded_at: '2026-01-01T10:00:00Z' }],
    driver: [{ lat: 45, lon: 2, recorded_at: '2026-01-01T10:15:00Z' }]
  }
});

const partial = () => createScientificSnapshot({
  sessionId: 'fixture-partial',
  period: { start: '2026-01-02T11:00:00Z' },
  fields: {
    gpsPointCount: measured(2, 'count', 'coaching_live_points'),
    routeDistance: calculated(100, 'm', 'scientific-metrics-engine@1.0'),
    duration: unknownScientificValue('ms', 'timestamps-missing'),
    weather: measured({ temperatureC: 9 }, 'weather-record', 'weather_snapshot', { confidence: 'low' }),
    wind: unknownScientificValue('km/h', 'wind-missing')
  },
  raw: { route: [{ lat: 45, lon: 2 }], driver: [{ lat: 45, lon: 2 }] }
});

const poor = () => createScientificSnapshot({
  sessionId: 'fixture-poor-history',
  fields: {
    gpsPointCount: measured(1, 'count', 'legacy-archive'),
    weather: estimated({ temperatureC: 10, humidityPct: 70 }, 'weather-record', 'open-meteo-reconstruction', 'reconstruction historique'),
    driverDistance: unknownScientificValue('m', 'track-missing'),
    timestamp: unknownScientificValue('timestamp', 'historical-timestamp-missing')
  },
  raw: { archive: { legacy: true } }
});

const empty = () => createScientificSnapshot({ sessionId: 'fixture-empty', fields: {
  gpsPointCount: unknownScientificValue('count', 'no-gps-points'),
  weather: unknownScientificValue('weather-record', 'weather-unavailable'),
  routeDistance: unknownScientificValue('m', 'reference-missing'),
  observation: unknownScientificValue('text', 'observation-missing')
} });

const corridor = () => createScientificSnapshot({
  sessionId: 'fixture-corridor',
  fields: {
    scentCorridor: estimated({ geometry: 'synthetic-estimated-corridor' }, 'geometry', 'scent-corridor-engine@1.0', 'Couloir olfactif estimé', { confidence: 'medium', provenance: { kind: 'model' } }),
    corridorConfidence: calculated(0.64, 'ratio', 'scent-corridor-engine@1.0')
  },
  raw: { referencePointCount: 3, weatherSource: 'weather_snapshot' }
});

export function createScientificFixtures() {
  return { complete: complete(), partial: partial(), poor: poor(), empty: empty(), corridor: corridor() };
}
