-- PISTE Community — enrichissement de la fiche chien
-- Migration additive : les fiches existantes restent compatibles.

alter table if exists public.dogs
  add column if not exists height_cm numeric,
  add column if not exists origin text;

alter table public.dogs
  drop constraint if exists dogs_height_cm_check,
  add constraint dogs_height_cm_check
    check (height_cm is null or (height_cm >= 10 and height_cm <= 120));

alter table public.dogs
  drop constraint if exists dogs_origin_length_check,
  add constraint dogs_origin_length_check
    check (origin is null or char_length(origin) <= 160);

comment on column public.dogs.height_cm is 'Taille du chien au garrot en centimètres';
comment on column public.dogs.origin is 'Provenance libre : élevage, unité, refuge, ville ou pays';
