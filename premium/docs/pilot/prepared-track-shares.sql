create table public.v2_prepared_track_shares (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 source_id text not null check(length(source_id) between 1 and 150),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=200000),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 check(expires_at>created_at and expires_at<=created_at+interval '31 days')
);
create index v2_prepared_track_shares_owner on public.v2_prepared_track_shares(owner_id,source_id,created_at desc);
alter table public.v2_prepared_track_shares enable row level security;
revoke all on public.v2_prepared_track_shares from public,anon,authenticated;
grant select,insert,update,delete on public.v2_prepared_track_shares to service_role;
