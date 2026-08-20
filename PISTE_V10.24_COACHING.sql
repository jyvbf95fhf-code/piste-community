-- PISTE Community V10.24 — rôles Coach / Conducteur / Traceur / Observateur / Solo
begin;
alter table public.coaching_members drop constraint if exists coaching_members_role_check;
alter table public.coaching_members add constraint coaching_members_role_check check(role in('driver','coach','traceur','observer','solo'));

create or replace function private.join_coaching_session(p_invite_code text,p_role text default 'driver')
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_user uuid:=(select auth.uid());v_code text:=upper(trim(coalesce(p_invite_code,'')));
begin
 if v_user is null then raise exception 'Authentification requise';end if;
 if p_role not in('driver','coach','traceur','observer') then raise exception 'Rôle invalide';end if;
 select s.id into v_id from public.coaching_sessions s where upper(s.invite_code)=v_code and s.status in('waiting','live') and(s.expires_at is null or s.expires_at>now()) limit 1;
 if v_id is null then raise exception 'Code invalide ou expiré';end if;
 insert into public.coaching_members(session_id,user_id,role) values(v_id,v_user,p_role) on conflict(session_id,user_id) do update set role=excluded.role;
 return v_id;
end$$;

drop policy if exists "coaching_points_driver_insert" on public.coaching_live_points;
create policy "coaching_points_driver_insert" on public.coaching_live_points for insert to authenticated with check(owner_id=(select auth.uid()) and private.coaching_role(session_id) in('driver','solo'));
drop policy if exists "coaching_markers_insert" on public.coaching_markers;
create policy "coaching_markers_insert" on public.coaching_markers for insert to authenticated with check(author_id=(select auth.uid()) and private.coaching_role(session_id) in('driver','coach','solo'));
drop policy if exists "coaching_debriefs_insert" on public.coaching_debriefs;
create policy "coaching_debriefs_insert" on public.coaching_debriefs for insert to authenticated with check(private.coaching_role(session_id) in('driver','coach','solo') and exists(select 1 from public.coaching_sessions s where s.id=coaching_debriefs.session_id and s.owner_id=coaching_debriefs.owner_id));
drop policy if exists "coaching_debriefs_update" on public.coaching_debriefs;
create policy "coaching_debriefs_update" on public.coaching_debriefs for update to authenticated using(private.coaching_role(session_id) in('driver','coach','solo')) with check(private.coaching_role(session_id) in('driver','coach','solo') and exists(select 1 from public.coaching_sessions s where s.id=coaching_debriefs.session_id and s.owner_id=coaching_debriefs.owner_id));

create or replace function private.finish_coaching_session(p_session_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());
begin
 if v_user is null then raise exception 'Authentification requise';end if;
 if not exists(select 1 from public.coaching_members m where m.session_id=p_session_id and m.user_id=v_user and m.role in('driver','coach','solo')) then raise exception 'Rôle conducteur, coach ou solo requis';end if;
 update public.coaching_sessions set status='ended',ended_at=now() where id=p_session_id and status<>'cancelled';
 return found;
end$$;
commit;
