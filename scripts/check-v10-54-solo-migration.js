#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const file = 'PISTE_V10.54_SOLO_MODES.sql';
assert(fs.existsSync(file), `${file} is missing`);
const sql = fs.readFileSync(file, 'utf8');
const lower = sql.toLowerCase();

assert(/add column if not exists\s+solo_mode\s+text/i.test(sql), 'solo_mode column is not prepared');
assert(/solo_mode\s+is null or solo_mode in \('self_trace','external_traceur'\)/i.test(sql), 'solo_mode CHECK is missing');
assert(/create_coaching_people_session_v1054/i.test(sql), 'v1054 creation RPC is missing');
assert(/start_solo_laying_v1054/i.test(sql), 'self_trace laying transition is missing');
assert(/finish_solo_laying_v1054/i.test(sql), 'self_trace finish transition is missing');
assert(/mark_external_traceur_ready_v1054/i.test(sql), 'external ready transition is missing');
assert(/start_solo_driver_run_v1054/i.test(sql), 'v1054 driver transition is missing');
assert(/finish_solo_run_v1054/i.test(sql), 'v1054 finish transition is missing');
assert(/create_coaching_people_session_v1053/i.test(sql), 'v1053 compatibility preflight is missing');
assert(/solo_mode is null then raise exception 'Sous-mode Solo requis'/i.test(sql), 'Solo mode must be explicit for v1054');
assert(/p_solo_mode='self_trace' and external_mode/i.test(sql), 'self_trace/external guard is missing');
assert(/p_solo_mode='external_traceur' and not external_mode/i.test(sql), 'external_traceur/external guard is missing');
assert(/member_role := item->>'role'/i.test(sql), 'member insertion path is missing');
assert(/external_traceur has one authenticated solo member only[\s\S]*no Traceur/i.test(sql), 'external member rule is not documented');

// Safety: the prepared migration must not weaken policies or grant public access.
assert(!/drop\s+table/i.test(lower), 'destructive DROP TABLE is forbidden');
assert(!/drop\s+policy/i.test(lower), 'RLS policy removal is forbidden');
assert(!/create\s+policy/i.test(lower), 'new RLS policy is outside this migration');
assert(!/grant\s+[^;]*\s+to\s+public/i.test(lower), 'PUBLIC grant is forbidden');
assert(!/grant\s+execute\s+on\s+function[^;]*\s+to\s+anon/i.test(lower), 'anon RPC grant is forbidden');
assert(!/delete\s+from\s+public\.coaching_sessions/i.test(lower), 'session deletion is forbidden');
assert(!/update\s+public\.coaching_sessions\s+set\s+solo_mode/i.test(lower), 'mass backfill is forbidden');
assert(/rollback/i.test(lower), 'rollback documentation is missing');
assert(/prepared, not applied/i.test(lower), 'unapplied status is missing');

console.log('V10.54 solo backend migration static guard: OK');
