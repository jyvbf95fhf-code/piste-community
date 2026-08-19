-- PISTE Community V10.20 — paramètres du modèle olfactif estimatif
-- Les politiques RLS existantes des deux tables continuent de s'appliquer.

alter table public.training_routes
  add column if not exists odor_model jsonb not null default '{}'::jsonb;

alter table public.training_routes
  drop constraint if exists training_routes_odor_model_object;
alter table public.training_routes
  add constraint training_routes_odor_model_object
  check (jsonb_typeof(odor_model) = 'object');

alter table public.coaching_sessions
  add column if not exists odor_model jsonb not null default '{}'::jsonb;

alter table public.coaching_sessions
  drop constraint if exists coaching_sessions_odor_model_object;
alter table public.coaching_sessions
  add constraint coaching_sessions_odor_model_object
  check (jsonb_typeof(odor_model) = 'object');

comment on column public.training_routes.odor_model is
  'Paramètres manuels du modèle pédagogique de dispersion olfactive; ne constitue pas une mesure réelle.';
comment on column public.coaching_sessions.odor_model is
  'Copie figée des paramètres olfactifs du scénario lors de la création de la session.';
