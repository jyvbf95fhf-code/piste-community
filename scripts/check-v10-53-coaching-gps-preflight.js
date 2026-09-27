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

const permission = functionSource('requestCoachingTraceurPermission');
const laying = functionSource('startCoachingLaying');
const tracking = functionSource('startTraceurTracking');

assert(permission.includes('navigator.geolocation.getCurrentPosition'), 'preflight must use browser geolocation in the click context');
assert(/error\?\.code===1[\s\S]*resolve\(false\)/.test(permission), 'permission denial (code 1) must block laying');
assert(/error\?\.code===2\|\|error\?\.code===3[\s\S]*resolve\(true\)/.test(permission), 'transient GPS errors (codes 2/3) must allow laying to continue');
assert(permission.includes('Pose démarrée — recherche de la position GPS…'), 'transient preflight errors must show a non-blocking acquisition message');
assert(laying.indexOf('requestCoachingTraceurPermission') < laying.indexOf("coachingTransitionV1040('start_coaching_laying')"), 'preflight must run before the server transition');
assert(tracking.includes('navigator.geolocation.watchPosition'), 'watchPosition must remain responsible for acquisition');
assert(/err\?\.code===1[\s\S]*stopTraceurTracking\(\)/.test(tracking), 'explicit permission denial must stop the watcher');
assert(!/err\?\.code===1\?[^;]+:[^;]+;if\(\$\('traceurStatus'\)\)[^;]+;stopTraceurTracking\(\)/.test(tracking), 'transient watcher errors must not unconditionally stop the watcher');
assert(app.includes("role==='traceur'&&s.laying_mode==='traceur'"), 'traceur authorization must remain explicit');
assert(app.includes("role==='coach'&&s.laying_mode==='coach'"), 'coach laying authorization must remain explicit');
assert(!functionSource('togglePlannerFollow').includes('requestCoachingTraceurPermission'), 'planner GPS must remain independent');

console.log('check-v10-53-coaching-gps-preflight: PASS');
