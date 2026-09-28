const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('app.js', 'utf8');

assert(/replayLast=false/.test(app) || /replayLast/.test(app), 'global location replay option is missing');
assert(/last-point-replayed/.test(app), 'fresh last location replay is not instrumented');
assert(/\['preview','presence'\]\.includes\(source\)/.test(app), 'Coaching preview/presence consumers do not request replay');
assert(/coachingSessionSwitch/.test(app), 'session switch diagnostic state is missing');
for (const key of ['previousSessionPresent','currentSessionPresent','previousConsumerRemoved','currentConsumerAttached','replayedLastLocationToCurrentConsumer','sessionSwitchGeneration','lastSessionCleanupAt','lastSessionAttachAt']) {
  assert(new RegExp(key).test(app), `session switch field ${key} is missing`);
}
assert(/coachingGpsReady=true;/.test(app), 'replayed preview position cannot mark Coaching GPS ready');
assert(/function coachingStartGateSnapshot/.test(app) && /startGate:coachingStartGateSnapshot/.test(app), 'Coaching start gate diagnostic is missing');
assert(/globalLocationManager\.unsubscribeLocation\(coachingPreviewWatch\)/.test(app), 'Session cleanup does not remove preview consumer');
assert(/function clearCoachingRealtime[\s\S]*?stopCoachingPresence\(\);stopTraceurTracking\(\)/.test(app), 'Session cleanup does not remove active Coaching consumers');
assert((app.match(/navigator\.geolocation\.watchPosition\(/g) || []).length === 1, 'more than one native watcher remains');
assert(/<summary>Debug GPS \/ Coaching/.test(app), 'compact debug panel label is missing');
assert(/copyCoachingDiagnostic/.test(app) && /JSON\.stringify\(payload/.test(app), 'debug copy action is missing');
assert(/coachingDebugPanelEnabled\(\)/.test(app), 'debug panel environment gate is missing');
assert(!/coachingSessionSwitch\s*=\s*\{[^}]*\b(?:lat|lon|latitude|longitude)\b/.test(app), 'session switch diagnostics must not contain raw coordinates');

console.log('V10.54 Coaching session switch guard: PASS');
