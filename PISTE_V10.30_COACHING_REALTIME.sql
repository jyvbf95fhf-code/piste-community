-- PISTE Community V10.30 — Coaching multi-équipe en temps réel
-- Projet Supabase : cobekrttsojzwoetyaad
-- À exécuter dans SQL Editor avant de tester la Preview Vercel.

begin;

alter table public.coaching_members
  drop constraint if exists coaching_members_role_check;
alter table public.coaching_members
  add constraint coaching_members_role_check
  check (role in ('driver','coach','traceur','observer','solo'));

-- La décision de visibilité est centralisée côté base : masquer un calque dans
-- l'interface ne suffirait pas à garantir le double aveugle.
create or replace function private.can_read_coaching_live_point(
  p_session_id uuid,
  p_owner_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_viewer_role text;
  v_target_role text;
  v_visibility text;
  v_status text;
begin
  if v_user is null then return false; end if;
  if v_user = p_owner_id then return true; end if;

  select m.role into v_viewer_role
    from public.coaching_members m
   where m.session_id=p_session_id and m.user_id=v_user;
  if v_viewer_role is null then return false; end if;

  select m.role into v_target_role
    from public.coaching_members m
   where m.session_id=p_session_id and m.user_id=p_owner_id;
  select s.visibility_mode,s.status into v_visibility,v_status
    from public.coaching_sessions s where s.id=p_session_id;

  -- Le coach supervise toute l'équipe. Après clôture, le Replay devient commun.
  if v_viewer_role in ('coach','solo') or v_status='ended' then return true; end if;
  -- La position du coach reste visible comme point de sécurité commun.
  if v_target_role='coach' then return true; end if;
  -- En mode entièrement partagé, tous les membres voient toute l'équipe.
  return v_visibility='all';
end
$$;

revoke all on function private.can_read_coaching_live_point(uuid,uuid)
  from public,anon;
grant execute on function private.can_read_coaching_live_point(uuid,uuid)
  to authenticated;

drop policy if exists "coaching_points_read" on public.coaching_live_points;
create policy "coaching_points_read"
on public.coaching_live_points
for select
to authenticated
using (private.can_read_coaching_live_point(session_id,owner_id));

drop policy if exists "coaching_trace_points_read" on public.coaching_trace_points;
create policy "coaching_trace_points_read"
on public.coaching_trace_points
for select
to authenticated
using (private.can_read_coaching_live_point(session_id,owner_id));

drop policy if exists "coaching_points_driver_insert" on public.coaching_live_points;
drop policy if exists "coaching_points_team_insert" on public.coaching_live_points;
create policy "coaching_points_team_insert"
on public.coaching_live_points
for insert
to authenticated
with check (
  owner_id=(select auth.uid())
  and private.coaching_role(session_id) in ('driver','coach','solo')
  and exists (
    select 1 from public.coaching_sessions s
     where s.id=session_id and s.status='live'
  )
);

drop policy if exists "coaching_trace_points_insert" on public.coaching_trace_points;
create policy "coaching_trace_points_insert"
on public.coaching_trace_points
for insert
to authenticated
with check (
  owner_id=(select auth.uid())
  and private.coaching_role(session_id)='traceur'
  and exists (
    select 1 from public.coaching_sessions s
     where s.id=session_id and s.status='live'
  )
);

-- Un coach, un conducteur, un traceur ou un utilisateur Solo peut annoncer
-- le départ sans recevoir un droit UPDATE général sur la session.
create or replace function private.start_coaching_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Authentification requise'; end if;
  if not exists (
    select 1 from public.coaching_members m
     where m.session_id=p_session_id
       and m.user_id=v_user
       and m.role in ('driver','coach','traceur','solo')
  ) then
    raise exception 'Rôle terrain requis';
  end if;

  update public.coaching_sessions
     set status='live',started_at=coalesce(started_at,now())
   where id=p_session_id and status='waiting';
  return found or exists(
    select 1 from public.coaching_sessions s
     where s.id=p_session_id and s.status='live'
  );
end
$$;

revoke all on function private.start_coaching_session(uuid)
  from public,anon,authenticated;
grant execute on function private.start_coaching_session(uuid)
  to authenticated;

create or replace function public.start_coaching_session(p_session_id uuid)
returns boolean
language sql
security invoker
set search_path=''
as $$
  select private.start_coaching_session(p_session_id)
$$;

revoke all on function public.start_coaching_session(uuid)
  from public,anon;
grant execute on function public.start_coaching_session(uuid)
  to authenticated;

comment on function private.can_read_coaching_live_point(uuid,uuid) is
  'Autorisation RLS des positions Coaching V10.30, incluant le double aveugle.';

commit;

-- Vérifications en lecture seule : les deux résultats doivent contenir une ligne.
select policyname,cmd
from pg_policies
where schemaname='public'
  and tablename='coaching_live_points'
  and policyname in ('coaching_points_read','coaching_points_team_insert')
order by policyname;

select routine_schema,routine_name
from information_schema.routines
where routine_schema in ('public','private')
  and routine_name in ('start_coaching_session','can_read_coaching_live_point')
order by routine_schema,routine_name;
