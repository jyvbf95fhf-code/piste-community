#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const file = 'PISTE_V10.54_MAP_VISIBILITY_BY_ROLE.sql';
const sql = fs.readFileSync(file, 'utf8');
assert(/MIGRATION PREPARED\s+—\s+NOT APPLIED/.test(sql), 'migration status must remain not applied');
assert(/add column if not exists map_visibility_by_role jsonb null/i.test(sql), 'additive map visibility column missing');
for (const role of ['coach','traceur','driver','observer']) assert(sql.includes(`'${role}'`), `role ${role} missing`);
assert(/create or replace function private\.resolve_coaching_map_visibility_v1054/i.test(sql), 'server resolver missing');
assert(/create or replace function public\.create_coaching_people_session_v1054/i.test(sql), 'versioned create RPC missing');
assert(/create or replace function public\.get_my_coaching_sessions_v1054/i.test(sql), 'versioned projection missing');
assert(/revoke all on function public\.create_coaching_people_session_v1054[^;]*from public,anon,authenticated/i.test(sql), 'create RPC grants are not restricted');
assert(/revoke all on function public\.get_my_coaching_sessions_v1054[^;]*from public,anon,authenticated/i.test(sql), 'projection grants are not restricted');
assert(!/grant\s+[^;]+\s+to\s+(?:public|anon)\b/i.test(sql), 'public/anon grant found');
assert(!/\b(drop\s+table|truncate\s+table)\b/i.test(sql), 'destructive table operation found');
assert(!/create policy|drop policy|alter policy/i.test(sql), 'RLS policy change must not be prepared implicitly');
assert(/planned_route|planned_markers|odor_model/.test(sql), 'projection does not strip protected route fields');
assert(/PISTE_V10\.54_SOLO_MODES\.sql/.test(sql), 'Solo migration compatibility note missing');
assert(/Rollback/i.test(sql) && /drop function public\.get_my_coaching_sessions_v1054/.test(sql), 'rollback is not documented');
console.log('V10.54 map visibility migration guard: OK');
