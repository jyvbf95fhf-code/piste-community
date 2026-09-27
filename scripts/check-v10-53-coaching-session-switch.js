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

const clear = functionSource('clearCoachingRealtime');
const open = functionSource('openCoachingSession');
const renderer = functionSource('renderCoachingMap');

assert(open.indexOf('clearCoachingRealtime()') < open.indexOf('activeCoachingSession=s'), 'opening a session must clear the previous session before replacing active state');
for (const token of ['coachingPreviewWatch=null','coachingPreviewPosition=null','coachingOwnPosition=null','coachingLiveWeather=null','coachingCorridorState={available:false']) {
  assert(clear.includes(token), `session cleanup must reset ${token}`);
}
assert(clear.includes('stopCoachingPresence()'), 'session cleanup must stop driver watchers');
assert(clear.includes('stopTraceurTracking()'), 'session cleanup must stop traceur watchers');
assert(clear.includes('clearInterval(coachingWeatherTimer)'), 'session cleanup must stop weather timers');
assert(renderer.includes('activeCoachingSession.coaching_members=memberRes.data.map'), 'map render must hydrate fresh members');
assert(renderer.indexOf('applyV1040RoleSurface()') > renderer.indexOf('activeCoachingSession.coaching_members=memberRes.data.map'), 'role surface must be recalculated after fresh member hydration');

console.log('check-v10-53-coaching-session-switch: PASS');
