-- PISTE Community — Coaching Live V2.1
-- PREPARATION UNIQUEMENT : NE PAS EXECUTER AVANT REVUE DES RLS.

create table if not exists public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid null,
  status text not null default 'waiting'
    check (status in ('waiting','live','ended','cancelled')),
  invite_code text unique,
  expires_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  share_live_location boolean not null default true,
  share_live_track boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.coaching_members (
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('driver','coach','observer')),
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.coaching_live_points (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lon double precision not null,
  accuracy_m double precision,
  speed_mps double precision,
  heading double precision,
  recorded_at timestamptz not null default now()
);

create index if not exists coaching_live_points_session_time_idx
  on public.coaching_live_points(session_id, recorded_at desc);

create table if not exists public.coaching_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'text'
    check (message_type in ('text','quick','system')),
  body text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.coaching_markers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lon double precision not null,
  marker_type text not null default 'note'
    check (marker_type in ('note','loss','recovery','decision','success')),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.coaching_debriefs (
  session_id uuid primary key references public.coaching_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid references auth.users(id) on delete set null,
  strengths text,
  improvement_area text,
  coach_notes text,
  driver_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coaching_sessions enable row level security;
alter table public.coaching_members enable row level security;
alter table public.coaching_live_points enable row level security;
alter table public.coaching_messages enable row level security;
alter table public.coaching_markers enable row level security;
alter table public.coaching_debriefs enable row level security;

-- Les policies RLS finales sont volontairement absentes.
-- Elles doivent être écrites et testées séparément avant activation.
