-- Ephemeral-only setup: force two RPC calls to overlap at the INSERT while the
-- migration's advisory lock serializes the idempotency lookup.
create or replace function private.test_v1054_delay_insert()
returns trigger language plpgsql as $$ begin
  if current_setting('piste.concurrent_test',true)='on' then perform pg_sleep(1); end if;
  return new;
end $$;
drop trigger if exists test_v1054_delay_insert on public.coaching_sessions;
create trigger test_v1054_delay_insert before insert on public.coaching_sessions
for each row execute function private.test_v1054_delay_insert();
