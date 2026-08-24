begin;

alter table public.operational_calls
  add column if not exists imported_tracks jsonb not null default '[]'::jsonb;

alter table public.operational_calls
  drop constraint if exists operational_calls_imported_tracks_array;

alter table public.operational_calls
  add constraint operational_calls_imported_tracks_array check (
    jsonb_typeof(imported_tracks) = 'array'
    and jsonb_array_length(imported_tracks) <= 5
  );

comment on column public.operational_calls.imported_tracks is
  'Couches GPX de référence de l intervention. Elles restent distinctes de la trace GPS enregistrée par le conducteur.';

commit;
