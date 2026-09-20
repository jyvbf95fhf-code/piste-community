const fs = require('fs');
const assert = require('assert/strict');

const sql = fs.readFileSync('PISTE_V10.49.1D_FIX_SOLO_SEARCH_CHOICE.sql', 'utf8');
const verify = fs.readFileSync('PISTE_V10.49.1D_FIX_SOLO_SEARCH_CHOICE_VERIFY.sql', 'utf8');
const source = fs.readFileSync('PISTE_V10.49.1D_COACHING_SOLO_DIRECT_RUN.sql', 'utf8');

const ok = (condition, message) => assert(condition, message);

ok(/create or replace function private\.guard_coaching_deferred_transition_v1045\(\)/.test(sql), 'transition guard replacement missing');
ok(/security definer set search_path=''/.test(sql), 'SECURITY DEFINER/search_path missing');
ok(/solo_mode boolean/.test(sql), 'Solo detection variable missing');
ok(/count\(\*\)=1\s+and count\(\*\) filter \(where m\.role='solo'\)=1/.test(sql), 'Solo membership proof missing');
ok(/d\.search_mode is null\s+and\s+not solo_mode/.test(sql), 'Solo-only search-choice bypass missing');
ok(/raise exception 'Attendez le choix de recherche du Traceur'/.test(sql), 'classic search-choice guard was removed');
ok(/d\.search_mode='deferred'/.test(sql) && /d\.traceur_ready_at is null/.test(sql), 'deferred readiness guard missing');
ok(!/create\s+(table|policy|trigger)|alter\s+table|drop\s+(table|function|policy|trigger)|delete\s+from|truncate\s+/i.test(sql), 'unexpected schema/data mutation present');
ok(/revoke all on function private\.guard_coaching_deferred_transition_v1045\(\) from public,anon,authenticated/.test(sql), 'private EXECUTE revoke missing');
ok(!/\b(insert|update|delete|create|alter|drop|grant|revoke)\b|\bdo\s+\$/i.test(verify), 'VERIFY must remain read-only');
ok(/start_solo_run/.test(source) && !/search_mode/.test(source), 'Solo direct-run source unexpectedly owns search-choice validation');

console.log('V10.49.1D Solo search-choice fix backend static checks: PASS');
