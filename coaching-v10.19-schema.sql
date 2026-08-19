-- PISTE Community V10.19 — Traceur, annotations live et débrief automatique
alter table public.coaching_members drop constraint if exists coaching_members_role_check;
alter table public.coaching_members add constraint coaching_members_role_check check(role in('driver','coach','traceur','observer'));
alter table public.coaching_debriefs add column if not exists auto_metrics jsonb not null default '{}'::jsonb check(jsonb_typeof(auto_metrics)='object');

create table if not exists public.coaching_trace_points(
  id bigint generated always as identity primary key,
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null check(lat between -90 and 90),
  lon double precision not null check(lon between -180 and 180),
  accuracy_m double precision check(accuracy_m is null or accuracy_m>=0),
  recorded_at timestamptz not null default now()
);
create index if not exists coaching_trace_points_owner_idx on public.coaching_trace_points(owner_id);
create index if not exists coaching_trace_points_session_time_idx on public.coaching_trace_points(session_id,recorded_at);
alter table public.coaching_trace_points enable row level security;
create policy "coaching_trace_points_read" on public.coaching_trace_points for select to authenticated using(private.coaching_role(session_id) in('coach','traceur') or exists(select 1 from public.coaching_sessions s where s.id=session_id and s.status='ended' and private.is_coaching_member(s.id)));
create policy "coaching_trace_points_insert" on public.coaching_trace_points for insert to authenticated with check(owner_id=(select auth.uid()) and private.coaching_role(session_id)='traceur');
grant select,insert on public.coaching_trace_points to authenticated;
grant usage,select on sequence public.coaching_trace_points_id_seq to authenticated;

drop policy if exists "coaching_markers_insert" on public.coaching_markers;
create policy "coaching_markers_insert" on public.coaching_markers for insert to authenticated with check(author_id=(select auth.uid()) and private.coaching_role(session_id) in('driver','coach'));
drop policy if exists "coaching_debriefs_insert" on public.coaching_debriefs;
drop policy if exists "coaching_debriefs_update" on public.coaching_debriefs;
create policy "coaching_debriefs_insert" on public.coaching_debriefs for insert to authenticated with check(private.coaching_role(session_id) in('driver','coach') and exists(select 1 from public.coaching_sessions s where s.id=session_id and s.owner_id=owner_id));
create policy "coaching_debriefs_update" on public.coaching_debriefs for update to authenticated using(private.coaching_role(session_id) in('driver','coach')) with check(private.coaching_role(session_id) in('driver','coach') and exists(select 1 from public.coaching_sessions s where s.id=session_id and s.owner_id=owner_id));

drop function if exists public.join_coaching_session(text);
create function public.join_coaching_session(p_invite_code text,p_role text default 'coach') returns uuid language plpgsql security definer set search_path='' as $$declare v_id uuid;begin if(select auth.uid()) is null then raise exception 'Authentification requise';end if;if p_role not in('coach','traceur','observer') then raise exception 'Rôle invalide';end if;select s.id into v_id from public.coaching_sessions s where upper(s.invite_code)=upper(trim(p_invite_code)) and s.status in('waiting','live') and(s.expires_at is null or s.expires_at>now());if v_id is null then raise exception 'Code invalide ou expiré';end if;insert into public.coaching_members(session_id,user_id,role) values(v_id,(select auth.uid()),p_role) on conflict(session_id,user_id) do update set role=excluded.role;return v_id;end$$;
revoke all on function public.join_coaching_session(text,text) from public,anon;
grant execute on function public.join_coaching_session(text,text) to authenticated;

create or replace function public.finish_coaching_session(p_session_id uuid) returns boolean language plpgsql security definer set search_path='' as $$begin if(select auth.uid()) is null then raise exception 'Authentification requise';end if;if not exists(select 1 from public.coaching_members m where m.session_id=p_session_id and m.user_id=(select auth.uid()) and m.role in('driver','coach')) then raise exception 'Rôle conducteur ou coach requis';end if;update public.coaching_sessions set status='ended',ended_at=now() where id=p_session_id and status<>'cancelled';return found;end$$;
revoke all on function public.finish_coaching_session(uuid) from public,anon;
grant execute on function public.finish_coaching_session(uuid) to authenticated;

do $$begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='coaching_trace_points') then alter publication supabase_realtime add table public.coaching_trace_points;end if;if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='coaching_markers') then alter publication supabase_realtime add table public.coaching_markers;end if;end$$;
