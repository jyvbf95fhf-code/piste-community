-- V10.40 — proposition uniquement. Ne pas exécuter sans revue des politiques actives.
-- Objectif : lecture Observateur contrôlée, écriture GPS réservée aux rôles terrain,
-- sans exposer le tracé au Conducteur en double aveugle.

begin;

-- Colonnes additives proposées pour persister la phase métier et les événements.
-- Le bloc est annulé par ROLLBACK dans ce fichier de préparation : il ne doit
-- pas être copié/exécuté tel quel sans validation des politiques existantes.
alter table if exists public.coaching_sessions add column if not exists phase text not null default 'preparation';
alter table if exists public.coaching_sessions add column if not exists laying_started_at timestamptz;
alter table if exists public.coaching_sessions add column if not exists track_finished_at timestamptz;
alter table if exists public.coaching_sessions add column if not exists coach_ready_at timestamptz;
alter table if exists public.coaching_sessions add column if not exists driver_started_at timestamptz;
alter table if exists public.coaching_sessions add column if not exists driver_finished_at timestamptz;
alter table if exists public.coaching_sessions add column if not exists ended_at timestamptz;
-- À transformer en contrainte séparée après inventaire des anciennes lignes :
-- check (phase in ('preparation','laying','laid','waiting_ready','coach_ready','driver_running','completed'))

-- Vérification préalable (lecture seule) : adapter les prédicats après inspection.
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('coaching_live_points','coaching_trace_points','coaching_messages');

-- La fonction existante doit rester SECURITY INVOKER. Cette proposition ne crée
-- aucune fonction SECURITY DEFINER et ne modifie pas les données historiques.
-- Les statements ci-dessous sont intentionnellement commentés tant que la matrice
-- de rôles réelle n'a pas été confirmée dans SQL Editor.
-- drop policy if exists "coaching_points_team_insert" on public.coaching_live_points;
-- create policy "coaching_points_team_insert" on public.coaching_live_points
--   for insert to authenticated
--   with check (
--     owner_id = (select auth.uid())
--     and private.coaching_role(session_id) in ('driver','coach','traceur','solo')
--   );

-- Contrôles lecture seule à lancer après validation :
select routine_schema, routine_name, routine_type, security_type
from information_schema.routines
where routine_schema in ('public','private')
  and routine_name in ('start_coaching_session','can_read_coaching_live_point');

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='coaching_sessions'
  and column_name in ('phase','laying_started_at','track_finished_at','coach_ready_at','driver_started_at','driver_finished_at','ended_at')
order by ordinal_position;

rollback;
