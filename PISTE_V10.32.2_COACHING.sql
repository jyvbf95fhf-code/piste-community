-- PISTE Community V10.32.2 — Coaching simplifié, invitations et débrief fiable
-- À examiner puis exécuter manuellement dans le SQL Editor Supabase.
-- L'application n'exécute jamais ce fichier automatiquement.

begin;

alter table public.coaching_sessions
  alter column visibility_mode set default 'all',
  add column if not exists archived_at timestamptz;

alter table public.coaching_members
  add column if not exists invitation_status text not null default 'accepted',
  add column if not exists ready_at timestamptz;

alter table public.coaching_members drop constraint if exists coaching_members_invitation_status_check;
alter table public.coaching_members add constraint coaching_members_invitation_status_check
  check (invitation_status in ('invited','accepted','declined'));

alter table public.coaching_live_points
  add column if not exists heading_deg double precision,
  add column if not exists speed_mps double precision;

alter table public.coaching_live_points drop constraint if exists coaching_live_points_heading_check;
alter table public.coaching_live_points add constraint coaching_live_points_heading_check
  check (heading_deg is null or heading_deg between 0 and 360);
alter table public.coaching_live_points drop constraint if exists coaching_live_points_speed_check;
alter table public.coaching_live_points add constraint coaching_live_points_speed_check
  check (speed_mps is null or speed_mps between 0 and 40);

alter table public.coaching_markers
  add column if not exists visibility text not null default 'all';
alter table public.coaching_markers drop constraint if exists coaching_markers_visibility_check;
alter table public.coaching_markers add constraint coaching_markers_visibility_check
  check (visibility in ('all','coach','proximity','manual'));

alter table public.coaching_debriefs
  add column if not exists statistics_notes text,
  add column if not exists publication_status text not null default 'draft',
  add column if not exists published_at timestamptz,
  add column if not exists last_editor_id uuid references auth.users(id) on delete set null,
  add column if not exists revision integer not null default 1;

alter table public.coaching_debriefs drop constraint if exists coaching_debriefs_statistics_notes_length;
alter table public.coaching_debriefs add constraint coaching_debriefs_statistics_notes_length
  check (statistics_notes is null or char_length(statistics_notes) <= 2500);
alter table public.coaching_debriefs drop constraint if exists coaching_debriefs_publication_status_check;
alter table public.coaching_debriefs add constraint coaching_debriefs_publication_status_check
  check (publication_status in ('draft','published'));

create or replace function private.bump_coaching_debrief_revision()
returns trigger language plpgsql set search_path='' as $$
begin
  new.revision=old.revision+1;
  new.updated_at=now();
  return new;
end
$$;
drop trigger if exists coaching_debrief_revision on public.coaching_debriefs;
create trigger coaching_debrief_revision before update on public.coaching_debriefs
for each row execute function private.bump_coaching_debrief_revision();

create or replace function public.invite_coaching_friend(
  p_session_id uuid,
  p_friend_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Authentification requise'; end if;
  if p_role not in ('driver','traceur','coach','observer') then raise exception 'Rôle invalide'; end if;
  if not exists (
    select 1 from public.coaching_sessions s
    where s.id=p_session_id and s.owner_id=v_user and s.status='waiting'
  ) then raise exception 'Seul l organisateur peut inviter avant le départ'; end if;
  if not exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and ((f.requester=v_user and f.addressee=p_friend_id)
        or (f.addressee=v_user and f.requester=p_friend_id))
  ) then raise exception 'Cette personne ne fait pas partie de vos amis'; end if;

  insert into public.coaching_members(session_id,user_id,role,invitation_status)
  values (p_session_id,p_friend_id,p_role,'invited')
  on conflict (session_id,user_id) do update
    set role=excluded.role, invitation_status='invited', ready_at=null;
end
$$;

create or replace function public.respond_coaching_invitation(
  p_session_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
begin
  update public.coaching_members
     set invitation_status=case when p_accept then 'accepted' else 'declined' end,
         ready_at=case when p_accept then now() else null end
   where session_id=p_session_id
     and user_id=(select auth.uid())
     and invitation_status='invited';
  if not found then raise exception 'Invitation introuvable'; end if;
end
$$;

revoke all on function public.invite_coaching_friend(uuid,uuid,text) from public,anon;
revoke all on function public.respond_coaching_invitation(uuid,boolean) from public,anon;
grant execute on function public.invite_coaching_friend(uuid,uuid,text) to authenticated;
grant execute on function public.respond_coaching_invitation(uuid,boolean) to authenticated;

drop policy if exists "coaching_members_self_update_invitation" on public.coaching_members;
create policy "coaching_members_self_update_invitation"
on public.coaching_members for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

-- Aucun nouveau point, message ou repère après la clôture.
drop policy if exists "coaching_points_team_insert" on public.coaching_live_points;
create policy "coaching_points_team_insert"
on public.coaching_live_points for insert to authenticated
with check (
  owner_id=(select auth.uid())
  and private.coaching_role(session_id) in ('driver','coach','traceur','observer','solo')
  and exists (select 1 from public.coaching_sessions s where s.id=session_id and s.status in ('waiting','live'))
);

drop policy if exists "coaching_messages_insert" on public.coaching_messages;
create policy "coaching_messages_insert"
on public.coaching_messages for insert to authenticated
with check (
  author_id=(select auth.uid()) and private.is_coaching_member(session_id)
  and exists (select 1 from public.coaching_sessions s where s.id=session_id and s.status in ('waiting','live'))
);

drop policy if exists "coaching_markers_insert" on public.coaching_markers;
create policy "coaching_markers_insert"
on public.coaching_markers for insert to authenticated
with check (
  author_id=(select auth.uid()) and private.coaching_role(session_id) in ('coach','driver','solo')
  and exists (select 1 from public.coaching_sessions s where s.id=session_id and s.status='live')
);

drop policy if exists "coaching_debriefs_insert" on public.coaching_debriefs;
drop policy if exists "coaching_debriefs_update" on public.coaching_debriefs;
drop policy if exists "coaching_debriefs_read" on public.coaching_debriefs;
create policy "coaching_debriefs_read"
on public.coaching_debriefs for select to authenticated
using (
  publication_status='published'
  or exists (select 1 from public.coaching_sessions s where s.id=session_id and s.owner_id=(select auth.uid()))
  or private.coaching_role(session_id)='coach'
);
create policy "coaching_debriefs_insert"
on public.coaching_debriefs for insert to authenticated
with check (
  exists (select 1 from public.coaching_sessions s where s.id=session_id and s.owner_id=(select auth.uid()))
  or private.coaching_role(session_id)='coach'
);
create policy "coaching_debriefs_update"
on public.coaching_debriefs for update to authenticated
using (
  exists (select 1 from public.coaching_sessions s where s.id=session_id and s.owner_id=(select auth.uid()))
  or private.coaching_role(session_id)='coach'
)
with check (
  exists (select 1 from public.coaching_sessions s where s.id=session_id and s.owner_id=(select auth.uid()))
  or private.coaching_role(session_id)='coach'
);

-- En double aveugle le conducteur ne reçoit jamais la position des autres rôles.
create or replace function private.can_read_coaching_live_point(p_session_id uuid,p_owner_id uuid)
returns boolean language plpgsql stable security definer set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_viewer_role text;
  v_visibility text;
  v_status text;
begin
  if v_user is null then return false; end if;
  if v_user=p_owner_id then return true; end if;
  select m.role into v_viewer_role from public.coaching_members m
   where m.session_id=p_session_id and m.user_id=v_user and m.invitation_status='accepted';
  if v_viewer_role is null then return false; end if;
  select s.visibility_mode,s.status into v_visibility,v_status from public.coaching_sessions s where s.id=p_session_id;
  if v_status in ('waiting','ended') then return true; end if;
  if v_viewer_role in ('coach','solo') then return true; end if;
  if v_viewer_role='driver' and v_visibility='coach' then return false; end if;
  return v_visibility='all';
end
$$;

create or replace function public.get_my_coaching_sessions(p_session_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(jsonb_agg(
    to_jsonb(s) || jsonb_build_object(
      'planned_route',case when s.status<>'ended' and s.visibility_mode='coach' and me.role='driver' then '[]'::jsonb else coalesce(to_jsonb(s.planned_route),'[]'::jsonb) end,
      'planned_markers',case when s.status<>'ended' and s.visibility_mode='coach' and me.role='driver' then '[]'::jsonb else coalesce(to_jsonb(s.planned_markers),'[]'::jsonb) end,
      'odor_model',case when s.status<>'ended' and s.visibility_mode='coach' and me.role='driver' then '{}'::jsonb else coalesce(to_jsonb(s.odor_model),'{}'::jsonb) end,
      'coaching_members',coalesce((
        select jsonb_agg(jsonb_build_object(
          'role',m.role,'user_id',m.user_id,'invitation_status',m.invitation_status,'ready_at',m.ready_at
        )) from public.coaching_members m where m.session_id=s.id
      ),'[]'::jsonb)
    ) order by s.created_at desc
  ),'[]'::jsonb)
  from public.coaching_sessions s
  join public.coaching_members me on me.session_id=s.id and me.user_id=(select auth.uid())
  where (p_session_id is null or s.id=p_session_id)
    and me.invitation_status<>'declined'
$$;

revoke all on function public.get_my_coaching_sessions(uuid) from public,anon;
grant execute on function public.get_my_coaching_sessions(uuid) to authenticated;

-- Les changements de statut sont diffusés pour arrêter toute l'équipe en temps réel.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='coaching_sessions'
  ) then alter publication supabase_realtime add table public.coaching_sessions; end if;
end
$$;

commit;

-- Vérifications en lecture seule.
select table_name,column_name,data_type
from information_schema.columns
where table_schema='public'
  and ((table_name='coaching_live_points' and column_name in ('heading_deg','speed_mps'))
    or (table_name='coaching_members' and column_name in ('invitation_status','ready_at'))
    or (table_name='coaching_debriefs' and column_name in ('statistics_notes','publication_status','published_at','last_editor_id','revision')))
order by table_name,column_name;
