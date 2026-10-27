create table public.v2_push_keys(id boolean primary key default true check(id), public_key text not null, private_key text not null);
alter table public.v2_push_keys enable row level security;
revoke all on public.v2_push_keys from public,anon,authenticated;
grant select,insert,update on public.v2_push_keys to service_role;
create table public.v2_push_subscriptions(owner_id uuid not null references auth.users(id) on delete cascade, endpoint text not null check(length(endpoint)<2000),subscription jsonb not null check(octet_length(subscription::text)<4000),created_at timestamptz not null default now(),primary key(owner_id,endpoint));
alter table public.v2_push_subscriptions enable row level security;
revoke all on public.v2_push_subscriptions from public,anon,authenticated;
grant select,insert,update,delete on public.v2_push_subscriptions to service_role;
