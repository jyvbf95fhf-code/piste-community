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

assert(app.includes('coachingRuntimeGeneration'), 'runtime must have a session generation token');
assert(app.includes('coachingRuntimeIsCurrent'), 'async Coaching work must have a generation guard');
const open = functionSource('openCoachingSession');
const clear = functionSource('clearCoachingRealtime');
const map = functionSource('renderCoachingMap');
const refresh = functionSource('refreshActiveCoachingSession');
const transition = functionSource('coachingTransitionV1040');
const change = functionSource('handleCoachingSessionChange');
const schedule = functionSource('scheduleCoachingMapRender');
assert(open.includes('advanceCoachingRuntime()'), 'opening a session must advance the runtime generation');
assert(open.includes('coachingRuntimeIsCurrent'), 'opening a session must ignore stale async results');
assert(map.includes('coachingRuntimeIsCurrent'), 'map rendering must ignore stale async results');
assert(refresh.includes('coachingRuntimeIsCurrent'), 'session refresh must ignore stale async results');
assert(transition.includes('coachingRuntimeIsCurrent'), 'RPC transitions must ignore stale async results');
assert(change.includes('refreshActiveCoachingSession(id,generation)'), 'realtime refresh must use the active generation');
assert(change.includes('coachingRuntimeIsCurrent(id,generation)'), 'realtime callbacks must ignore stale sessions');
assert(schedule.includes('coachingRuntimeIsCurrent(id,generation)'), 'delayed map renders must ignore stale sessions');
for (const token of ['stopCoachingPresence()','stopTraceurTracking()','coachingPreviewWatch=null','coachingLiveWeather=null','coachingCorridorState={available:false']) {
  assert(clear.includes(token), `runtime cleanup must reset ${token}`);
}
assert(app.includes('coachingLiveWriteState'), 'last live write result must be observable in Preview diagnostics');

console.log('check-v10-53-coaching-runtime-lifecycle: PASS');
