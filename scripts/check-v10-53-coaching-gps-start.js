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

assert(permission.includes('navigator.geolocation.getCurrentPosition'), 'Coaching GPS preflight must use the browser geolocation API');
assert(permission.includes('Autorisation de localisation refusée'), 'permission denial must be explicit');
assert(permission.includes('Géolocalisation indisponible'), 'unavailable geolocation must be explicit');
assert(permission.includes('GPS met trop de temps'), 'GPS timeout must be explicit');
assert(laying.indexOf('requestCoachingTraceurPermission') < laying.indexOf("coachingTransitionV1040('start_coaching_laying')"), 'preflight must run from the click before the async transition');
assert(laying.includes("coachingPhase(current)!=='laying'"), 'laying start must verify the server-confirmed phase');
assert(laying.includes('isCurrentUserLayingActor(current)'), 'laying start must revalidate the authorized actor');
assert(tracking.includes('coachingWatchPosition') || tracking.includes('navigator.geolocation.watchPosition'), 'traceur tracking must reach watchPosition');
assert(tracking.includes('coachingGpsError'), 'watcher failures must be surfaced');
assert(app.includes("role==='traceur'&&s.laying_mode==='traceur'"), 'traceur authorization remains explicit');
assert(app.includes("role==='coach'&&s.laying_mode==='coach'"), 'coach laying authorization remains explicit');
assert(!functionSource('togglePlannerFollow').includes('requestCoachingTraceurPermission'), 'planner GPS must remain independent');

console.log('check-v10-53-coaching-gps-start: PASS');
