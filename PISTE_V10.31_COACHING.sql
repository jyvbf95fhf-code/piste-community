-- PISTE Community V10.31 — salle d'attente et double aveugle réel
-- À exécuter dans le SQL Editor Supabase avant de tester la Preview.

begin;

-- Dans la salle d'attente, tous les membres voient les positions de présence.
-- Dès le départ, les règles de confidentialité du mode choisi s'appliquent.
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

  if v_status in ('waiting','ended') then return true; end if;
  if v_viewer_role in ('coach','solo') then return true; end if;
  if v_target_role='coach' then return true; end if;
  return v_visibility='all';
end
$$;

-- Les membres peuvent publier leur position de présence avant le départ.
drop policy if exists "coaching_points_team_insert" on public.coaching_live_points;
create policy "coaching_points_team_insert"
on public.coaching_live_points
for insert
to authenticated
with check (
  owner_id=(select auth.uid())
  and private.coaching_role(session_id) in ('driver','coach','traceur','observer','solo')
  and exists (
    select 1 from public.coaching_sessions s
     where s.id=session_id and s.status in ('waiting','live')
  )
);

-- Une session est renvoyée sans son tracé ni ses indices au conducteur
-- lorsqu'elle est en double aveugle. Ils sont révélés après clôture.
create or replace function public.get_my_coaching_sessions(p_session_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(jsonb_agg(
    (to_jsonb(s)
      || jsonb_build_object(
        'planned_route', case
          when s.status <> 'ended'
           and s.visibility_mode = 'coach'
           and me.role = 'driver' then '[]'::jsonb
          else coalesce(to_jsonb(s.planned_route),'[]'::jsonb)
        end,
        'planned_markers', case
          when s.status <> 'ended'
           and s.visibility_mode = 'coach'
           and me.role = 'driver' then '[]'::jsonb
          else coalesce(to_jsonb(s.planned_markers),'[]'::jsonb)
        end,
        'odor_model', case
          when s.status <> 'ended'
           and s.visibility_mode = 'coach'
           and me.role = 'driver' then '{}'::jsonb
          else coalesce(to_jsonb(s.odor_model),'{}'::jsonb)
        end,
        'coaching_members', coalesce((
          select jsonb_agg(jsonb_build_object('role',m.role,'user_id',m.user_id))
          from public.coaching_members m where m.session_id=s.id
        ),'[]'::jsonb)
      )
    ) order by s.created_at desc
  ),'[]'::jsonb)
  from public.coaching_sessions s
  join public.coaching_members me
    on me.session_id=s.id and me.user_id=(select auth.uid())
  where p_session_id is null or s.id=p_session_id
$$;

revoke all on function public.get_my_coaching_sessions(uuid) from public,anon;
grant execute on function public.get_my_coaching_sessions(uuid) to authenticated;

comment on function public.get_my_coaching_sessions(uuid) is
  'Sessions Coaching filtrées V10.31 : le conducteur ne reçoit pas les données cachées avant la clôture.';

commit;

-- Vérifications en lecture seule.
select policyname,cmd
from pg_policies
where schemaname='public' and tablename='coaching_live_points'
  and policyname='coaching_points_team_insert';

select routine_schema,routine_name
from information_schema.routines
where routine_schema='public' and routine_name='get_my_coaching_sessions';
