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

// Recording authorization must be phase- and mode-specific, not role-only.
assert(/can_record_people_point_v10423[\s\S]*m\.role='traceur'[\s\S]*s\.phase='laying'/i.test(sql), 'normal Traceur laying authorization disappeared');
assert(/can_record_people_point_v10423[\s\S]*m\.role='driver'[\s\S]*s\.phase='driver_running'/i.test(sql), 'normal Driver running authorization disappeared');
assert(/m\.role='solo'[\s\S]*s\.solo_mode='self_trace'[\s\S]*s\.phase='laying'/i.test(sql), 'self_trace laying authorization is missing');
assert(/m\.role='solo'[\s\S]*s\.solo_mode='self_trace'[\s\S]*s\.phase='driver_running'/i.test(sql), 'self_trace driver authorization is missing');
assert(/m\.role='solo'[\s\S]*s\.solo_mode in \('self_trace','external_traceur'\)[\s\S]*s\.phase='driver_running'/i.test(sql), 'external_traceur driver authorization is missing');
assert(/m\.role='solo'[\s\S]*s\.solo_mode='self_trace'/i.test(sql) && /p_trace[\s\S]*driver_running/i.test(sql), 'recording helper does not distinguish tables/phases');
assert(/external_traceur[\s\S]*must|external_traceur[\s\S]*requires|solo_mode='self_trace'/i.test(sql), 'external_traceur exclusion is not documented');
assert(/s\.solo_mode is null and s\.phase='laying'/i.test(sql), 'legacy NULL Solo laying compatibility is not explicit');
assert(/s\.solo_mode is null and s\.phase='driver_running'/i.test(sql), 'legacy NULL Solo driver compatibility is not explicit');
assert(/legacy[\s\S]*fallback|compatibility fallback/i.test(sql), 'legacy NULL fallback is not documented');

// Retry safety is optional and backward-compatible for callers that omit it.
assert(/add column if not exists\s+solo_creation_key/i.test(sql), 'idempotency storage is missing');
assert(/pg_advisory_xact_lock/i.test(sql), 'idempotency lock is missing');
assert(/p_idempotency_key\s+text\s+default\s+null/i.test(sql), 'optional idempotency parameter is missing');
assert(/idempotent_replay/i.test(sql), 'idempotent replay result is undocumented');

// Safety: the prepared migration must not weaken policies or grant public access.
assert(!/drop\s+table/i.test(lower), 'destructive DROP TABLE is forbidden');
assert(!/drop\s+policy/i.test(lower), 'RLS policy removal is forbidden');
assert(!/create\s+policy/i.test(lower), 'new RLS policy is outside this migration');
assert(!/grant\s+[^;]*\s+to\s+public/i.test(lower), 'PUBLIC grant is forbidden');
assert(!/grant\s+execute\s+on\s+function[^;]*\s+to\s+anon/i.test(lower), 'anon RPC grant is forbidden');
assert(!/grant\s+execute\s+on\s+function[^;]*\s+to\s+public/i.test(lower), 'PUBLIC RPC grant is forbidden');
assert(!/delete\s+from\s+public\.coaching_sessions/i.test(lower), 'session deletion is forbidden');
assert(!/update\s+public\.coaching_sessions\s+set\s+solo_mode/i.test(lower), 'mass backfill is forbidden');
assert(/rollback/i.test(lower), 'rollback documentation is missing');
assert(/complete prior definition|complete v10\.53 body/i.test(lower), 'rollback is not autonomous');
assert(/restore private\.guard_people_session_v10423/i.test(lower), 'trigger rollback is missing');
assert(/(prepared|hardened), not applied/i.test(lower), 'unapplied status is missing');

console.log('V10.54 solo backend migration static guard: OK');
