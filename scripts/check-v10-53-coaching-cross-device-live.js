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

const preview = functionSource('requestCoachingPreviewLocation');
const presence = functionSource('startCoachingPresence');
const traceur = functionSource('startTraceurTracking');
const renderer = functionSource('renderCoachingMap');
const visibility = functionSource('coachingCanSeeLiveOwner');

assert(preview.includes('shareCoachingCurrentPosition'), 'preview watcher must share the current participant position');
assert(presence.includes("from('coaching_live_points')"), 'driver live points must remain persisted');
assert(traceur.includes("from('coaching_trace_points')"), 'traceur points must remain persisted');
assert(presence.includes('shareCoachingCurrentPosition'), 'driver live tracking must share current position for cross-device rendering');
assert(traceur.includes('shareCoachingCurrentPosition'), 'traceur tracking must share current position for cross-device rendering');
assert(presence.indexOf('shareCoachingCurrentPosition') < presence.indexOf('p.accuracy_m)>55'), 'driver preview sharing must happen before the business-point accuracy filter');
assert(traceur.indexOf('shareCoachingCurrentPosition') < traceur.indexOf('accuracy_m)>45'), 'traceur preview sharing must happen before the business-point accuracy filter');
assert(renderer.includes("from('coaching_current_positions')"), 'map rendering must read current participant positions');
assert(renderer.includes('coachingCanSeeLiveOwner'), 'rendering must keep the existing visibility gate');
assert(visibility.includes("role==='driver'"), 'driver visibility rules must remain explicit');
assert(visibility.includes("role==='traceur'"), 'traceur visibility rules must remain explicit');

console.log('check-v10-53-coaching-cross-device-live: PASS');
