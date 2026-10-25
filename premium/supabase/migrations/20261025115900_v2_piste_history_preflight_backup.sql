-- Recovery snapshot before the additive history migration; source tables are not changed.
create schema if not exists private;
create table private.v2_history_preflight_20261025 (
 table_name text primary key, saved_at timestamptz not null default now(), row_count bigint not null,
 snapshot jsonb not null, digest text not null
);
alter table private.v2_history_preflight_20261025 enable row level security;
revoke all on private.v2_history_preflight_20261025 from public,anon,authenticated;
grant select on private.v2_history_preflight_20261025 to service_role;
do $$ declare t text;rows jsonb;n bigint;begin
 foreach t in array array['coaching_remote_sessions','coaching_remote_commands','coaching_remote_invites','coaching_remote_batches','coaching_remote_points','v2_personal_records','v2_personal_commands'] loop
  execute format('lock table public.%I in share mode',t);
  execute format('select coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb),count(*) from public.%I x',t) into rows,n;
  insert into private.v2_history_preflight_20261025(table_name,row_count,snapshot,digest) values(t,n,rows,md5(rows::text));
  if jsonb_array_length(rows)<>n then raise exception 'Backup count mismatch';end if;
 end loop;
end $$;
