'use strict';
const fs = require('fs');
const assert = require('assert/strict');

const app = fs.readFileSync('app.js', 'utf8');
assert(app.includes('coachingDebugEnabled'), 'diagnostics must be environment gated');
assert(app.includes("v10-51-1-test"), 'diagnostics must be limited to the Preview project');
assert(app.includes('coachingSnapshot'), 'snapshot API must be exposed');
assert(app.includes('coachingEvents'), 'event ring buffer API must be exposed');
assert(app.includes('captureCoachingSnapshot'), 'named snapshot capture must be exposed');
assert(app.includes('coachingDebugBuffer.length>200'), 'diagnostic ring buffer must be bounded');
for (const token of ['coachingRuntimeGeneration','activeCoachingSession','coachingLocationPermissionState','traceurWatch','coachingPresenceWatch','coachingPreviewWatch','coachingScenarioState','coachingScenarioGate','coachingSessions','coachingLiveWriteState','globalLiveSync']) {
  assert(app.includes(token), `diagnostics must include ${token}`);
}
for (const event of ['openCoachingSession:start','openCoachingSession:loaded','openCoachingSession:after-refresh','openCoachingSession:surface-applied','openCoachingSession:done','loadCoachingHub:start','loadCoachingHub:done','refreshActiveCoachingSession:start','refreshActiveCoachingSession:done','globalLiveSync:invalidate','globalLiveSync:resync-start','globalLiveSync:resync-done','realtime:coaching_members','applyV1040RoleSurface','updateCoachingPrimaryActions','updateCoachingPhase','requestCoachingTraceurPermission','startTraceurTracking','startCoachingPresence','requestCoachingPreviewLocation','stopTraceurTracking','stopCoachingPresence','resetCoachingGpsTransientState','clearCoachingRealtime','advanceCoachingRuntime']) {
  assert(app.includes(`'${event}'`), `diagnostic event missing: ${event}`);
}
assert(!app.includes('window.__pisteDebug.coachingSnapshot ='), 'diagnostics must not be installed globally in production');
assert(app.includes('coachingDebugToken'), 'diagnostics must hash identifiers');
assert(!app.includes('coachingDebugRecord(\'gps:position\''), 'diagnostics must not record raw GPS positions');
console.log('check-v10-53-coaching-multisession-diagnostics: PASS');
