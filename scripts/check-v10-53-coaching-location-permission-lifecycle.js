'use strict';
const fs = require('fs');
const assert = require('assert/strict');

const app = fs.readFileSync('app.js', 'utf8');
function functionSource(name) {
  const match = app.match(new RegExp(`(?:async )?function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`));
  assert(match, `missing ${name}`);
  let index = match.index + match[0].length;
  let depth = 1;
  while (index < app.length && depth) {
    if (app[index] === '{') depth += 1;
    if (app[index] === '}') depth -= 1;
    index += 1;
  }
  return app.slice(match.index, index);
}

assert(app.includes("coachingLocationPermissionState='unknown'"), 'permission state must start unknown per page visit');
assert(/setCoachingLocationPermissionState\('granted'/.test(app), 'permission state must persist granted');
assert(/setCoachingLocationPermissionState\('denied'/.test(app), 'permission state must persist denied');
const request = functionSource('requestCoachingTraceurPermission');
assert(request.includes("coachingLocationPermissionState==='granted'") && !request.match(/coachingLocationPermissionState==='granted'[\s\S]{0,120}getCurrentPosition/), 'granted sessions must skip preflight getCurrentPosition');
assert(request.includes("error?.code===1") && request.includes("error?.code===2||error?.code===3"), 'permission denial must be distinct from transient GPS errors');
assert(/setCoachingLocationPermissionState\('denied'/.test(request), 'explicit denial must block');
assert(/setCoachingLocationPermissionState\('unknown'/.test(request), 'transient preflight errors must allow watcher start');
for (const name of ['clearCoachingRealtime', 'resetCoachingGpsTransientState', 'returnToCoachingSessions']) {
  const source = functionSource(name);
  assert(!source.includes('coachingLocationPermissionState='), `${name} must not reset global permission state`);
}
for (const name of ['startTraceurTracking', 'startCoachingPresence']) {
  const source = functionSource(name);
  assert(source.includes('navigator.geolocation.watchPosition'), `${name} must use a session watcher`);
  assert(/setCoachingLocationPermissionState\('denied'/.test(source), `${name} must handle permission revocation`);
}
assert(app.includes('clearWatch(coachingPreviewWatch)'), 'preview watcher must be cleared per session');
assert(app.includes('clearWatch(traceurWatch)'), 'traceur watcher must be cleared per session');
assert(app.includes('clearWatch(coachingPresenceWatch)'), 'presence watcher must be cleared per session');

console.log('check-v10-53-coaching-location-permission-lifecycle: PASS');
