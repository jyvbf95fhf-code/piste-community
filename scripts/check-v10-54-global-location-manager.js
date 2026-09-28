#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('app.js', 'utf8');
const manager = app.match(/const globalLocationManager=\(\(\)=>\{[\s\S]*?\n\}\)\(\);/);
assert(manager, 'GlobalLocationManager is missing');
const source = manager[0];

assert((app.match(/navigator\.geolocation\.watchPosition\(/g) || []).length === 1, 'more than one watchPosition call remains');
assert(/if\(watchId!==null\)return true/.test(source), 'ensure must be idempotent');
assert(/subscribeLocation/.test(source) && /unsubscribeLocation/.test(source), 'consumer subscription API is missing');
assert(/restartInFlight/.test(source) && /if\(age>15000&&!restartInFlight\)/.test(source), 'foreground stale restart guard is missing');
assert(/visibilitychange/.test(source) && /pageshow/.test(source) && /focus/.test(source), 'foreground lifecycle hooks are missing');
assert(/navigator\.permissions\?\.query/.test(source), 'Permissions API capability detection is missing');
assert(/permissionState==='denied'/.test(source) && /permission-denied/.test(source), 'denied state handling is missing');
assert(/position-unavailable/.test(source) && /timeout/.test(source), 'GPS error categories are missing');
assert(/coachingWatchPosition\([^]*globalLocationManager\.subscribeLocation/.test(app), 'Coaching is not subscribed to the manager');
assert(/globalLocationManager\.subscribeLocation\('planner'/.test(app), 'Planner is not subscribed to the manager');
assert(/globalLocationManager\.subscribeLocation\('terrain-recording'/.test(app), 'terrain recording is not subscribed to the manager');
assert(/globalLocationManager\.unsubscribeLocation\(traceurWatch\)/.test(app), 'Traceur cleanup is not manager-scoped');
assert(/globalLocationManager\.unsubscribeLocation\(coachingPresenceWatch\)/.test(app), 'Presence cleanup is not manager-scoped');
assert(/globalLocationManager\.unsubscribeLocation\(coachingPreviewWatch\)/.test(app), 'Preview cleanup is not manager-scoped');
const clearRealtime = app.slice(app.indexOf('function clearCoachingRealtime'), app.indexOf('function scenarioGateRole'));
assert(!/stopGlobalLocationWatch/.test(clearRealtime), 'leaving Coaching must not stop the global GPS');
assert(/coachingRuntimeGeneration/.test(clearRealtime), 'session lifecycle must retain its existing generation guard');
assert(/requestCoachingOrientation/.test(app) && /DeviceOrientationEvent\.requestPermission/.test(app), 'orientation permission is not separate');
assert(/globalLocation:globalLocationManager\.snapshot\(\)/.test(app), 'global location diagnostics are missing');
assert(!/globalLocationManager\.snapshot\(\)[\s\S]*latitude/.test(source), 'raw latitude must not be in manager diagnostics');
assert(/startCoachingPresence\(\)/.test(app) && /startTraceurTracking\(\)/.test(app), 'legacy Coaching consumers disappeared');

console.log('V10.54 global location manager guard: OK');
