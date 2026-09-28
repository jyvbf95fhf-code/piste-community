const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('app.js', 'utf8');

assert(!/setTimeout\(init,0\)/.test(app), 'global location must not bootstrap on page load');
assert(/if\(!isAuthenticated\(\)\)\{setState\('idle','unauthenticated'\);return false\}/.test(app), 'watch creation must require authentication');
assert(/await globalLocationManager\.init\(\)/.test(app), 'authenticated boot must initialize global location');
assert(/event==='SIGNED_IN'&&s\)[\s\S]*?globalLocationManager\.init\(\)/.test(app), 'SIGNED_IN must initialize global location');
assert(/globalLocationManager\.reset\('logout'\)/.test(app), 'logout must reset global location');
assert(/const reset=reason=>/.test(app) && /consumers\.clear\(\)/.test(app), 'global location reset must clear state and consumers');
const clearRealtime = app.slice(app.indexOf('function clearCoachingRealtime'), app.indexOf('function scenarioGateRole'));
assert(!/globalLocationManager\.stopGlobalLocationWatch/.test(clearRealtime), 'leaving Coaching must not stop global location');
assert(/const handleForeground=[\s\S]*?ensure\(\)/.test(app), 'foreground lifecycle must retain global watch behavior');

console.log('V10.54 global location auth guard: OK');
