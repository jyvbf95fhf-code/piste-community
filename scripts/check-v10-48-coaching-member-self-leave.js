const fs = require('fs');
const assert = require('assert/strict');

const sql = fs.readFileSync('PISTE_V10.48_COACHING_MEMBER_SELF_LEAVE.sql', 'utf8');
const schema = fs.readFileSync('coaching-live-schema.sql', 'utf8');
const dryRun = fs.readFileSync('PISTE_V10.48_COACHING_MEMBER_SELF_LEAVE_DRY_RUN.sql', 'utf8');

assert.match(sql, /create policy "coaching_members_self_delete"/i);
assert.match(sql, /for delete\s+to authenticated/i);
assert.match(sql, /user_id\s*=\s*\(select auth\.uid\(\)\)/i);
assert.match(sql, /s\.owner_id\s*=\s*\(select auth\.uid\(\)\)/i);
assert.match(sql, /not exists\s*\(\s*select 1\s+from public\.coaching_sessions/i);
assert.match(sql, /old\.user_id\s+is distinct from\s+\(select auth\.uid\(\)\)/i);
assert.match(sql, /Le propriétaire doit terminer, annuler ou supprimer la session/);
assert.match(sql, /revoke all on function private\.guard_people_member_v10423\(\) from public, anon, authenticated/i);
assert.match(sql, /create or replace function private\.guard_people_member_v10423\(\)/i);
assert(!/\b(?:drop|create)\s+trigger\b/i.test(sql), 'Le trigger existant doit être conservé');

for (const forbidden of [
  /drop\s+table/i,
  /truncate/i,
  /delete\s+from/i,
  /update\s+public\.(?:coaching_sessions|training_routes|coaching_messages|coaching_markers|coaching_debriefs)/i,
  /insert\s+into\s+public\.(?:coaching_sessions|training_routes|coaching_messages|coaching_markers|coaching_debriefs)/i
]) assert(!forbidden.test(sql), `Instruction non liée détectée: ${forbidden}`);

assert.match(schema, /session_id uuid not null references public\.coaching_sessions\(id\) on delete cascade/i);
assert.match(sql, /if tg_op = 'INSERT'/i);
assert.match(sql, /if tg_op = 'UPDATE'/i);
assert.match(sql, /old\.role <> 'observer'/i);
assert.match(dryRun, /Traceur invité -> ALLOWED/);
assert.match(dryRun, /Conducteur invité -> ALLOWED/);
assert.match(dryRun, /Observateur invité -> ALLOWED/);
assert.match(dryRun, /Coach invité -> ALLOWED/);
assert.match(dryRun, /owner -> REFUSED/);
assert.match(dryRun, /utilisateur A -> REFUSED/);

const canSelfDelete = ({ actor, owner, rowUser }) =>
  actor !== owner && actor === rowUser;
for (const role of ['traceur', 'driver', 'observer', 'coach']) {
  assert.equal(canSelfDelete({actor: `${role}-1`, owner: 'owner-1', rowUser: `${role}-1`}), true, `${role}: self-delete refusé`);
}
assert.equal(canSelfDelete({actor: 'owner-1', owner: 'owner-1', rowUser: 'owner-1'}), false, 'owner: self-delete accepté');
assert.equal(canSelfDelete({actor: 'user-a', owner: 'owner-1', rowUser: 'user-b'}), false, 'suppression de la ligne d’un autre utilisateur acceptée');
assert.equal(canSelfDelete({actor: 'external', owner: 'owner-1', rowUser: 'member-1'}), false, 'utilisateur externe accepté');

console.log('V10.48 coaching member self-leave dry-run: OK (statique, SQL non exécuté)');
