const fs=require('fs'),assert=require('assert/strict');
const app=fs.readFileSync('app.js','utf8');
assert.match(app,/const globalLiveSync=\{/);
for(const token of ['channels:new Map()','timers:new Map()','listeners:new Map()','inFlight:new Map()','dirtyScopes:new Set()','start(userId)','stop()','invalidate(scope','resyncAppData(scopes)','snapshot()'])assert.match(app,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`missing ${token}`);
assert.match(app,/fallbackIntervalMs:30000/);
assert.match(app,/visibilitychange/);assert.match(app,/pageshow/);assert.match(app,/window,'online'/);assert.match(app,/window,'offline'/);
assert.match(app,/coaching_sessions/);assert.match(app,/coaching_session_scenarios/);assert.match(app,/coaching_scenario_reads/);assert.match(app,/coaching_debrief_observations/);
for(const gpsTable of ['coaching_live_points','coaching_trace_points','coaching_current_positions']){
 const globalStart=app.indexOf('const globalLiveSync='),globalEnd=app.indexOf('const GLOBAL_LIVE_SYNC_DEV',globalStart),global=app.slice(globalStart,globalEnd);
 assert.doesNotMatch(global,new RegExp(`table:'${gpsTable}'`),`GPS table must not be global channel: ${gpsTable}`);
}
assert.match(app,/loadCoachingHub\(\)/);assert.match(app,/refreshMine\(\)/);assert.match(app,/refreshTrainings\(\)/);assert.match(app,/loadDogs/);assert.match(app,/loadGoals/);
assert.match(app,/if\(this\.resyncPromise\)return this\.resyncPromise/);
assert.match(app,/this\.visible&&this\.online/);
assert.match(app,/globalLiveSync\.stop\(\)/);assert.match(app,/globalLiveSync\.start\(s\.user\.id\)/);
assert.doesNotMatch(app,/setInterval\(\(\)=>refreshSocialBadge\(\),60000\)/);
assert.doesNotMatch(app,/\bglobalLiveSync[\s\S]{0,1200}supabase\.from\(['"]coaching_live_points/);
console.log('Global Live Sync guard: PASS');
