const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
function assert(condition, message) { if (!condition) throw new Error(message); }

assert(app.includes("from './scent-corridor-engine.mjs'"), 'Coaching must import the central scent engine');
assert(app.includes('computeScentCorridor({'), 'central engine is not called from Coaching calculation path');
assert(app.includes('let coachingLayerVisibility={planned:true,trace:true,actual:true,odor:true'), 'corridor is not ON by default');
assert(app.includes('function coachingCanSeeOdor'), 'permission gate missing');
assert(app.includes('coachingCorridorState={available:false,confidence:null,warnings:[],provenance:null}'), 'live corridor state reset missing');
assert(app.includes('corridorConfidence') && app.includes('corridorWarnings'), 'central confidence/warnings not retained in Coaching state');
assert(app.includes('coachingDataVisibility'), 'existing visibility rules are not reused');
assert(app.includes('function changeCoachingOdorPreference'), 'odor toggle handler missing');
assert(html.includes('data-coaching-odor-preference'), 'Coaching odor toggle missing');
assert(html.includes('id="refreshCoachingWeather"'), 'compact weather refresh control missing');
assert(app.includes('coachingWeatherRequestId') && app.includes('coachingWeatherRequestMatches'), 'weather request/session guard missing');
assert(app.includes('scheduleCoachingLiveWeather') && app.includes('420000'), 'bounded weather refresh missing');
assert(app.includes('coachingLayers=[]'), 'Coaching layer cleanup state missing');
assert(app.includes('if(coachingLayerVisibility.odor)addLiveOdorCorridor'), 'live corridor render gate missing');
const liveCorridorBlock = app.match(/function addLiveOdorCorridor[\s\S]*?\nfunction /)?.[0] || '';
assert(!liveCorridorBlock.includes('requestAnimationFrame'), 'second RAF-like corridor loop detected');
assert(!/immobil|stoppage.?auto|temps.?hors.?couloir|distance.?centre/i.test(app), 'Bloc 7 statistics/immobility leaked into Bloc 4');
console.log('check-v10-53-coaching-live-scent: PASS');
