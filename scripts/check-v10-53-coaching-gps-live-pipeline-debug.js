'use strict';
const fs = require('fs');
const assert = require('assert/strict');

const app = fs.readFileSync('app.js', 'utf8');
for (const event of [
  'geolocation:watch-created','geolocation:watch-success','geolocation:watch-error',
  'coaching-location:filter-result','coaching-live-position:write-start',
  'coaching-live-position:write-success','coaching-live-position:write-error',
  'coaching-live-position:realtime-received','coaching-live-position:model-applied',
  'coaching-live-position:marker-render-request','coaching-live-position:marker-rendered',
  'coaching-live-position:marker-skipped'
]) assert(app.includes(`'${event}'`), `missing pipeline event ${event}`);
assert(app.includes("geolocation:watch-create-error"), 'synchronous watch creation errors must be instrumented');
assert(app.includes('gpsPipeline'), 'snapshot must expose compact gpsPipeline state');
assert(app.includes('coachingGpsPipeline'), 'pipeline state must be retained for snapshot');
assert(app.includes('coachingLiveWriteState={table:null'), 'write state must remain available');
assert(app.includes('accuracy-threshold'), 'accuracy filtering reason must be explicit');
assert(app.includes('stale-generation'), 'stale generation filtering reason must be explicit');
assert(app.includes('hidden-by-permissions'), 'marker permission skip reason must be explicit');
assert(app.includes('map-not-ready'), 'marker map readiness skip reason must be explicit');
assert(!/gpsPipeline[^\n]*latitude/.test(app), 'gps pipeline snapshot must not expose latitude');
assert(!/gpsPipeline[^\n]*longitude/.test(app), 'gps pipeline snapshot must not expose longitude');
console.log('check-v10-53-coaching-gps-live-pipeline-debug: PASS');
