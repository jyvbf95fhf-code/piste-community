#!/usr/bin/env node
const fs = require('fs');
const app = fs.readFileSync('app.js','utf8');
const html = fs.readFileSync('index.html','utf8');
const failures = [];
const must = (ok, message) => { if (!ok) failures.push(message); };

must(html.includes('Je trace moi-même puis je relève'), 'F01 self_trace UI label missing');
must(html.includes('Une autre personne trace pour moi puis je relève'), 'F01 external_traceur UI label missing');
must(/soloMode/.test(app), 'F02 soloMode contract field missing');
must(/self_trace/.test(app) && /external_traceur/.test(app), 'F02/F03 solo mode values missing');
must(/soloMode[^\n]*self_trace|self_trace[^\n]*soloMode/.test(app), 'F04 self_trace is not explicit in normalized contract');
must(/create_coaching_people_session_v1054/.test(app), 'F05 v1054 creation RPC not wired');
must(/idempotency/i.test(app), 'F06 stable idempotency key not wired');
must(/start_solo_laying_v1054/.test(app), 'F07 self_trace laying RPC missing');
must(/finish_solo_laying_v1054/.test(app), 'F08 finish laying RPC missing');
must(/start_solo_driver_run_v1054/.test(app), 'F09 driver RPC missing');
must(/coaching_trace_points/.test(app) && /coaching_live_points/.test(app), 'F10 distinct recording destinations missing');
must(/mark_external_traceur_ready_v1054/.test(app), 'F11 external traceur RPC missing');
must(/solo_mode\s*===\s*null|solo_mode\?\?null|legacy/i.test(app), 'F13 legacy solo fallback missing');
must((app.match(/watchPosition\s*\(/g)||[]).length <= 1, 'F14 more than one native watchPosition call');
must(/get_my_coaching_sessions_v1054/.test(app), 'F15 v1054 session projection/recovery missing');
must(!/mapVisibilityByRole/.test(app), 'F16 abandoned mapVisibilityByRole leaked into frontend');
must(!/supabase\.from\(['"]coaching_sessions['"]\)\.insert/.test(app), 'F18 direct session SQL-like insert detected');
if (failures.length) { console.error(failures.map(x => `FAIL ${x}`).join('\n')); process.exit(1); }
console.log('PASS check-v10-54-solo-frontend');
