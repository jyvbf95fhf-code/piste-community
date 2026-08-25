begin;

alter table public.pistes
  add column if not exists activity_name text,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists collection_name text,
  add column if not exists field_markers jsonb not null default '[]'::jsonb;

alter table public.entrainements
  add column if not exists activity_name text,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists collection_name text,
  add column if not exists field_markers jsonb not null default '[]'::jsonb;

alter table public.coaching_sessions
  add column if not exists dog_id uuid,
  add column if not exists departure_point jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'coaching_sessions_dog_id_fkey'
      and conrelid = 'public.coaching_sessions'::regclass
  ) then
    alter table public.coaching_sessions
      add constraint coaching_sessions_dog_id_fkey
      foreign key (dog_id) references public.dogs(id) on delete set null;
  end if;
end $$;

create index if not exists coaching_sessions_dog_id_idx
  on public.coaching_sessions (dog_id)
  where dog_id is not null;

alter table public.pistes drop constraint if exists pistes_field_markers_array;
alter table public.pistes add constraint pistes_field_markers_array check (
  jsonb_typeof(field_markers) = 'array' and jsonb_array_length(field_markers) <= 250
);

alter table public.entrainements drop constraint if exists entrainements_field_markers_array;
alter table public.entrainements add constraint entrainements_field_markers_array check (
  jsonb_typeof(field_markers) = 'array' and jsonb_array_length(field_markers) <= 250
);

alter table public.coaching_sessions drop constraint if exists coaching_sessions_departure_point_object;
alter table public.coaching_sessions add constraint coaching_sessions_departure_point_object check (
  jsonb_typeof(departure_point) = 'object'
);

comment on column public.pistes.field_markers is
  'Repères horodatés et géolocalisés saisis pendant le pistage.';
comment on column public.entrainements.field_markers is
  'Repères horodatés et géolocalisés saisis pendant l entraînement.';
comment on column public.coaching_sessions.departure_point is
  'Départ explicite de la session; à défaut le premier point du tracé planifié est utilisé.';

commit;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('pistes', 'entrainements', 'coaching_sessions')
  and column_name in ('activity_name', 'is_favorite', 'tags', 'collection_name', 'field_markers', 'dog_id', 'departure_point')
order by table_name, column_name;
