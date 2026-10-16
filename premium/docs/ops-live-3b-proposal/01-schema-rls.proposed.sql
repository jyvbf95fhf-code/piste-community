-- PROPOSITION UNIQUEMENT. Non appliquee sur Supabase. Preparation locale uniquement.
-- Projet V2 de developpement uniquement, apres autorisation explicite.
-- Aucun objet Auth, Coaching ou sauvegarde personnelle n'est modifie.
begin;

create table public.ops_live_publications (
 id uuid primary key,
 owner_id uuid not null references auth.users(id),
 local_mission_id text not null check (length(local_mission_id) between 1 and 160),
 generation bigint not null default 1 check (generation > 0),
 version bigint not null default 0 check (version >= 0),
 last_sequence bigint not null default 0 check (last_sequence >= 0),
 sharing boolean not null default false,
 notify_observers boolean not null default true,
 closed_at timestamptz,
 stopped_at timestamptz,
 channel_epoch uuid not null default gen_random_uuid(),
 projection_options jsonb not null default '{}'::jsonb
   check (jsonb_typeof(projection_options) = 'object'
     and projection_options - array['showDog','showHandler','showEvents','showTrackAge','showCorridor'] = '{}'::jsonb),
 -- Metadata validated by server allowlist; no complete dossier, track or receipts.
 projection_metadata jsonb not null default '{}'::jsonb
   check (jsonb_typeof(projection_metadata) = 'object'
     and projection_metadata - array['state','dogName','handlerName','trackingSeconds','trackAge','events'] = '{}'::jsonb
     and octet_length(projection_metadata::text) <= 65536),
 distance_m double precision not null default 0 check (distance_m >= 0 and distance_m < 'Infinity'::double precision),
 last_position_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 -- Proposed maximum live window, not an archive-retention setting.
 active_deadline timestamptz not null default now() + interval '24 hours',
 capture_started_at timestamptz not null default now(),
 retention_seconds integer not null default 604800 check (retention_seconds between 0 and 604800),
 purge_at timestamptz,
 creation_expires_at timestamptz not null,
 purged_at timestamptz,
 unique (owner_id, local_mission_id),
 unique (id, owner_id),
 check (active_deadline > created_at and active_deadline <= created_at + interval '24 hours'),
 check (purge_at is null or purge_at >= created_at)
);

create table public.ops_live_access (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 scope text not null check (scope in ('habitual','publication')),
 publication_id uuid references public.ops_live_publications(id) on delete cascade,
 generation bigint,
 user_id uuid not null references auth.users(id),
 granted_at timestamptz not null default now(),
 revoked_at timestamptz,
 source_access_id uuid references public.ops_live_access(id) on delete cascade,
 notification_version bigint,
 notification_read boolean not null default false,
 foreign key (publication_id, owner_id) references public.ops_live_publications(id, owner_id) on delete cascade,
 check ((scope='habitual' and publication_id is null and generation is null)
     or (scope='publication' and publication_id is not null and generation > 0))
);
create unique index ops_live_habitual_unique on public.ops_live_access(owner_id,user_id) where scope='habitual';
create unique index ops_live_access_unique on public.ops_live_access(publication_id,generation,user_id) where scope='publication';

create table public.ops_live_invites (
 token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
 owner_id uuid not null references auth.users(id),
 scope text not null check (scope in ('habitual','publication')),
 publication_id uuid references public.ops_live_publications(id) on delete cascade,
 generation bigint,
 recipient_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 consumed_at timestamptz,
 revoked_at timestamptz,
 check (expires_at > created_at and expires_at <= created_at + interval '24 hours'),
 foreign key (publication_id, owner_id) references public.ops_live_publications(id, owner_id) on delete cascade,
 check ((scope='habitual' and publication_id is null and generation is null)
     or (scope='publication' and publication_id is not null and generation > 0))
);

create table public.ops_live_commands (
 publication_id uuid not null references public.ops_live_publications(id) on delete cascade,
 command_id uuid not null,
 actor_id uuid not null references auth.users(id),
 generation bigint not null check (generation > 0),
 fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
 command_type text not null check (command_type in
   ('publish','invite','join','revoke','gps-batch','update','stop-sharing','close','retention','mark-notification-read')),
 accepted_version bigint not null check (accepted_version >= 0),
 created_at timestamptz not null default now(),
 primary key (publication_id, command_id)
);

create table public.ops_live_points (
 publication_id uuid not null references public.ops_live_publications(id) on delete cascade,
 generation bigint not null check (generation > 0),
 sequence bigint not null check (sequence > 0),
 segment_id text not null check (length(segment_id) between 1 and 160),
 batch_id uuid not null,
 latitude double precision not null check (latitude between -90 and 90),
 longitude double precision not null check (longitude between -180 and 180),
 accuracy_m double precision not null check (accuracy_m > 0 and accuracy_m <= 30),
 captured_at timestamptz not null,
 received_at timestamptz not null default now(),
 primary key (publication_id, generation, sequence),
 foreign key (publication_id, batch_id)
   references public.ops_live_commands(publication_id, command_id)
   deferrable initially deferred
);

create index ops_live_owner_recent on public.ops_live_publications(owner_id, updated_at desc, id);
create index ops_live_expiry on public.ops_live_publications((coalesce(purge_at, active_deadline)));
create index ops_live_observer on public.ops_live_access(user_id, publication_id, generation) where revoked_at is null;
create index ops_live_invite_recipient on public.ops_live_invites(recipient_id, expires_at) where consumed_at is null and revoked_at is null;
create index ops_live_invite_publication on public.ops_live_invites(publication_id, generation);

-- RLS + SQL privileges both deny browser access, including the owner.
-- Rights owner/observer are rechecked by the authenticated Edge API.
do $$
declare table_name text;
begin
 foreach table_name in array array['ops_live_publications','ops_live_access','ops_live_invites','ops_live_commands','ops_live_points'] loop
  execute format('alter table public.%I enable row level security', table_name);
  execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
  execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
  execute format('create policy ops_live_no_browser_access on public.%I for all to anon, authenticated using (false) with check (false)', table_name);
 end loop;
end $$;

-- Defence against reopening a definitively closed mission or changing ownership.
create function public.ops_live_guard_identity_and_closure()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id
    then
  raise exception 'immutable_identity' using errcode = '22023';
 end if;
 if new.local_mission_id='deleted:'||old.id::text and new.purged_at is not null and not new.sharing and new.projection_metadata='{}'::jsonb and new.projection_options='{}'::jsonb and new.last_position_at is null and new.distance_m=0 and new.closed_at is not distinct from old.closed_at and new.generation=old.generation and new.last_sequence=old.last_sequence then return new; end if;
 if new.local_mission_id is distinct from old.local_mission_id then raise exception 'immutable_identity' using errcode='22023'; end if;
 if old.closed_at is not null and (new.closed_at is distinct from old.closed_at
    or new.generation is distinct from old.generation
    or (new.sharing and not old.sharing)
    or new.last_sequence is distinct from old.last_sequence
    or new.distance_m is distinct from old.distance_m
    or new.projection_metadata is distinct from old.projection_metadata
    or new.last_position_at is distinct from old.last_position_at) then
  raise exception 'publication_closed' using errcode = '22023';
 end if;
 return new;
end $$;
revoke all on function public.ops_live_guard_identity_and_closure() from public, anon, authenticated;
create trigger ops_live_identity_closure before update on public.ops_live_publications
for each row execute function public.ops_live_guard_identity_and_closure();
commit;
