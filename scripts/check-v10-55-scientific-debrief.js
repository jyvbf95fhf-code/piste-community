import assert from 'node:assert/strict';
import { buildScientificDebrief } from '../scientific-debrief.mjs';

const points = [
  { lat: 45, lon: 2, recorded_at: '2026-09-01T10:00:00Z' },
  { lat: 45.001, lon: 2.001, recorded_at: '2026-09-01T10:10:00Z' }
];
const session = {
  id: 'fixture-complete',
  started_at: '2026-09-01T10:00:00Z',
  laying_started_at: '2026-09-01T09:30:00Z',
  track_finished_at: '2026-09-01T09:45:00Z',
  driver_started_at: '2026-09-01T10:00:00Z',
  ended_at: '2026-09-01T10:10:00Z'
};
const metrics = {
  timing: {
    laying: { value: 900000, unit: 'ms', provenance: 'calculated' },
    trackAgeAtDriverStart: { value: 900000, unit: 'ms', provenance: 'calculated' },
    recovery: { value: 600000, unit: 'ms', provenance: 'calculated' },
    total: { value: 2400000, unit: 'ms', provenance: 'calculated' }
  },
  distance: {
    trace: { value: 150, unit: 'm', provenance: 'calculated' },
    actual: { value: 220, unit: 'm', provenance: 'calculated' }
  },
  scentCorridor: { available: true, confidence: 'medium' }
};
const measuredWeather = {
  status: 'ready', source: 'weather_snapshot', provenance: 'measured',
  temperature_c: 12, humidity_pct: 65, wind_speed_kmh: 8, wind_direction_deg: 180,
  fetched_at: '2026-09-01T09:45:00Z'
};
const reconstructedWeather = {
  status: 'ready', source: 'open-meteo-archive', provenance: 'reconstructed',
  temperature_c: 12, wind_speed_kmh: 8, wind_direction_deg: 180,
  fetched_at: '2026-09-01T09:45:00Z'
};

const complete = buildScientificDebrief({ session, actual: points, trace: points, metrics, weather: measuredWeather, permissions: { reference: true } });
assert.equal(complete.weather.temperature.category, 'measured');
assert.equal(complete.weather.temperature.value, 12);
assert.equal(complete.weather.humidity.category, 'measured');
assert.equal(complete.timing.trackAge.category, 'calculated');
assert.equal(complete.distance.driver.category, 'calculated');
assert.equal(complete.corridor.category, 'estimated');
assert.equal(complete.summary, 'complete');

const reconstructed = buildScientificDebrief({ session, actual: points, trace: points, metrics, weather: reconstructedWeather, permissions: { reference: true } });
assert.equal(reconstructed.weather.temperature.category, 'estimated');
assert.equal(reconstructed.weather.temperature.provenance.kind, 'reconstructed');
assert.equal(reconstructed.weather.humidity.category, 'unknown');
assert.equal(reconstructed.summary, 'partial');

const absent = buildScientificDebrief({ session, actual: points, trace: points, metrics, weather: null, permissions: { reference: true } });
assert.equal(absent.weather.temperature.category, 'unknown');
assert.equal(absent.weather.temperature.value, null);
assert.equal(absent.summary, 'partial');

const denied = buildScientificDebrief({ session, actual: points, trace: points, metrics, weather: measuredWeather, permissions: { reference: false } });
assert.equal(denied.corridor.category, 'unknown');
assert.equal(denied.corridor.provenance.kind, 'permission-denied');
assert.equal(denied.reference.category, 'unknown');

const legacyUnavailable = buildScientificDebrief({ session, actual: points, trace: points, metrics: { ...metrics, timing: { total: { value: 1, unit: 'ms', provenance: 'unavailable' } } }, weather: null, permissions: { reference: true } });
assert.equal(legacyUnavailable.timing.total.category, 'unknown');
assert.equal(legacyUnavailable.timing.total.value, null);

assert.deepEqual(complete, buildScientificDebrief({ session, actual: points, trace: points, metrics, weather: measuredWeather, permissions: { reference: true } }));
assert.equal(complete.metadata.corridorSource, 'scent-corridor-engine');

const app = await import('node:fs/promises').then(fs => fs.readFile('app.js', 'utf8'));
const css = await import('node:fs/promises').then(fs => fs.readFile('v2.css', 'utf8'));
assert.match(app, /buildScientificDebrief/);
assert.match(app, /scientific-debrief\.mjs/);
assert.doesNotMatch(app, /fetchCoachingHistoricalWeather[\s\S]{0,500}for\s*\(/, 'debrief must not fetch weather per GPS point');
assert.match(app, /MÉTÉO DE SESSION/);
assert.match(app, /data-scientific-category/);
assert.match(app, /coachingDebriefWeatherSource\(data\).*computeScientificMetrics/);
assert.match(css, /\.scientific-debrief-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /\.scientific-debrief-field\{[^}]*min-width:0/);
const reportStart = app.indexOf('async function reportActivitySource');
const reportEnd = app.indexOf('function reportWeatherText', reportStart);
const reportSource = app.slice(reportStart, reportEnd);
const dossierStart = app.indexOf('function renderMissionDossier');
const dossierEnd = app.indexOf('function renderMissionReplay', dossierStart);
const dossierSource = app.slice(dossierStart, dossierEnd);
assert.match(reportSource, /buildScientificDebrief\(/, 'archive source must build the shared scientific model');
assert.match(reportSource, /scientificDebrief/, 'archive source must return the scientific model');
assert.match(dossierSource, /scientificDebriefHtml\(source\.scientificDebrief\)/, 'archive statistics must render the shared scientific model');
assert.match(dossierSource, /coachingArchive\?`<h3>STATISTIQUES/, 'archive statistics branch must remain present');
assert.doesNotMatch(reportSource, /coachingDebriefWeatherSource\(/, 'archive source must not use live coaching weather fallback');
console.log('PASS v10.55 scientific debrief contract');
