'use strict';
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
(async()=>{
  const { computeScientificMetrics, SCIENTIFIC_METRICS_VERSION, IMMOBILITY_CONFIG } = await import(pathToFileURL(require('node:path').resolve('scientific-metrics-engine.mjs')).href);
  assert.equal(SCIENTIFIC_METRICS_VERSION, '1.0');
  assert.equal(IMMOBILITY_CONFIG.minDurationMs, 20000);
  const distanceMeters=(a,b)=>Math.hypot((b.lat-a.lat)*111000,(b.lon-a.lon)*70000);
  const trace=[
    {lat:48,lon:7,recorded_at:'2026-01-01T10:00:00Z',accuracy_m:5},
    {lat:48,lon:7.0001,recorded_at:'2026-01-01T10:00:10Z',accuracy_m:6},
    {lat:48,lon:7.0001,recorded_at:'2026-01-01T10:00:40Z',accuracy_m:6},
    {lat:48,lon:7.0003,recorded_at:'2026-01-01T10:01:00Z',accuracy_m:7}
  ];
  const result=computeScientificMetrics({trace,actual:trace,reference:trace,session:{track_finished_at:'2026-01-01T09:55:00Z',driver_started_at:'2026-01-01T10:00:00Z',driver_finished_at:'2026-01-01T10:01:00Z'},distanceMeters,permissions:{reference:true},weather:{wind_direction_deg:90,wind_speed_kmh:8,provenance:'measured'},currentTime:'2026-01-01T10:01:00Z'});
  assert.equal(result.metadata.version,'1.0');
  assert.equal(result.timing.trackAgeAtDriverStart.value,300000);
  assert.equal(result.distance.actual.value>0,true);
  assert.equal(result.gpsQuality.totalPoints.value,4);
  assert.equal(result.immobilities.count.value,1);
  assert.equal(result.immobilities.provenance,'calculated');
  assert.equal(result.trackDeviation.available,true);
  assert.equal(result.scentCorridor.available,true);
  assert.equal(result.scentCorridor.provenance,'calculated');
  assert.equal(Array.isArray(result.scientificSegments),true);
  const repeat=computeScientificMetrics({trace,actual:trace,reference:trace,session:{track_finished_at:'2026-01-01T09:55:00Z',driver_started_at:'2026-01-01T10:00:00Z',driver_finished_at:'2026-01-01T10:01:00Z'},distanceMeters,permissions:{reference:true},weather:{wind_direction_deg:90,wind_speed_kmh:8,provenance:'measured'},currentTime:'2026-01-01T10:01:00Z'});
  assert.deepEqual(result,repeat,'same inputs must produce the same metrics');
  const hidden=computeScientificMetrics({trace,actual:trace,reference:trace,session:{},distanceMeters,permissions:{reference:false}});
  assert.equal(hidden.trackDeviation.available,false);
  assert.equal(hidden.scentCorridor.available,false);
  assert.equal(hidden.trackDeviation.reason,'permission-denied');
  const noData=computeScientificMetrics({trace:[],actual:[],session:{},distanceMeters,permissions:{reference:true}});
  assert.equal(noData.gpsQuality.quality,'unavailable');
  assert.equal(noData.immobilities.provenance,'unavailable');
  console.log('PASS v10.53 scientific metrics guard');
})().catch(error=>{console.error(`FAIL v10.53 scientific metrics guard: ${error.message}`);process.exitCode=1});
