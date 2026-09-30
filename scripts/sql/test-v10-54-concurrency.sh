#!/usr/bin/env bash
set -euo pipefail

key="solo-concurrent-001"
tmp_a="$(mktemp)"
tmp_b="$(mktemp)"
trap 'rm -f "$tmp_a" "$tmp_b"' EXIT

call() {
  local output="$1"
  psql -X -qAt -v ON_ERROR_STOP=1 >"$output" <<SQL
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select set_config('piste.concurrent_test','on',false);
select (public.create_coaching_people_session_v1054(null,
  '[{"user_id":"00000000-0000-0000-0000-000000000001","role":"solo"}]'::jsonb,
  'normal','connected','self_trace','${key}')->>'id');
SQL
}

call "$tmp_a" & pid_a=$!
call "$tmp_b" & pid_b=$!
wait "$pid_a"
wait "$pid_b"

id_a="$(tail -n 1 "$tmp_a" | tr -d '[:space:]')"
id_b="$(tail -n 1 "$tmp_b" | tr -d '[:space:]')"
if [[ ! "$id_a" =~ ^[0-9a-f-]{36}$ || "$id_a" != "$id_b" ]]; then
  echo "FAIL: concurrent calls returned different/invalid ids: '$id_a' '$id_b'" >&2
  exit 1
fi

count="$(psql -X -qAt -v ON_ERROR_STOP=1 -c "select count(*) from public.coaching_sessions where owner_id='00000000-0000-0000-0000-000000000001' and solo_creation_key='${key}'")"
[[ "$(tr -d '[:space:]' <<<"$count")" == "1" ]] || { echo "FAIL: concurrent count is $count" >&2; exit 1; }
echo "PASS: concurrent same-key calls returned $id_a and count=1"

key_a="solo-concurrent-a"
key_b="solo-concurrent-b"
psql -X -qAt -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false); select (public.create_coaching_people_session_v1054(null,'[{\"user_id\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"solo\"}]'::jsonb,'normal','connected','self_trace','${key_a}')->>'id')" >"$tmp_a"
psql -X -qAt -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false); select (public.create_coaching_people_session_v1054(null,'[{\"user_id\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"solo\"}]'::jsonb,'normal','connected','self_trace','${key_b}')->>'id')" >"$tmp_b"
id_a="$(tail -n 1 "$tmp_a" | tr -d '[:space:]')"
id_b="$(tail -n 1 "$tmp_b" | tr -d '[:space:]')"
[[ "$id_a" != "$id_b" ]] || { echo "FAIL: different keys reused one id" >&2; exit 1; }
echo "PASS: different keys created distinct sessions"
