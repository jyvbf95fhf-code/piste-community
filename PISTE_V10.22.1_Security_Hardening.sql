-- PISTE Community V10.22.1 — Durcissement Supabase
-- À exécuter sur le projet cobekrttsojzwoetyaad après sauvegarde V10.22.
-- Correctifs : propriétaire privé, RPC coaching protégées et RLS débrief non ambiguë.

begin;

-- L'application privée est verrouillée sur l'identifiant Supabase du propriétaire.
-- Cette fonction ne nécessite aucun privilège élevé et respecte le rôle appelant.
create or replace function public.piste_owner_only()
returns boolean
language sql
stable
security invoker
set search_path=''
as $$
  select (select auth.uid()) = 'c6d96d45-d4d9-4a83-8886-1b15ea058313'::uuid
$$;

revoke all on function public.piste_owner_only() from public, anon;
grant execute on function public.piste_owner_only() to authenticated;

-- L'implémentation privilégiée reste hors du schéma public exposé par l'API.
create or replace function private.join_coaching_session(
  p_invite_code text,
  p_role text default 'coach'
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_id uuid;
  v_user uuid := (select auth.uid());
  v_code text := upper(trim(coalesce(p_invite_code, '')));
begin
  if v_user is null then
    raise exception 'Authentification requise';
  end if;
  if char_length(v_code) < 4 or char_length(v_code) > 32 then
    raise exception 'Code invalide ou expiré';
  end if;
  if p_role not in ('coach','traceur','observer') then
    raise exception 'Rôle invalide';
  end if;

  select s.id
    into v_id
    from public.coaching_sessions s
   where upper(s.invite_code) = v_code
     and s.status in ('waiting','live')
     and (s.expires_at is null or s.expires_at > now())
   limit 1;

  if v_id is null then
    raise exception 'Code invalide ou expiré';
  end if;

  insert into public.coaching_members(session_id,user_id,role)
  values(v_id,v_user,p_role)
  on conflict(session_id,user_id) do nothing;

  return v_id;
end
$$;

revoke all on function private.join_coaching_session(text,text)
  from public, anon, authenticated;
grant execute on function private.join_coaching_session(text,text)
  to authenticated;

-- Façade RPC publique : aucun contournement RLS dans le schéma exposé.
create or replace function public.join_coaching_session(
  p_invite_code text,
  p_role text default 'coach'
)
returns uuid
language sql
security invoker
set search_path=''
as $$
  select private.join_coaching_session(p_invite_code,p_role)
$$;

revoke all on function public.join_coaching_session(text,text)
  from public, anon;
grant execute on function public.join_coaching_session(text,text)
  to authenticated;

create or replace function private.finish_coaching_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Authentification requise';
  end if;

  if not exists(
    select 1
      from public.coaching_members m
     where m.session_id = p_session_id
       and m.user_id = v_user
       and m.role in ('driver','coach')
  ) then
    raise exception 'Rôle conducteur ou coach requis';
  end if;

  update public.coaching_sessions
     set status = 'ended', ended_at = now()
   where id = p_session_id
     and status <> 'cancelled';

  return found;
end
$$;

revoke all on function private.finish_coaching_session(uuid)
  from public, anon, authenticated;
grant execute on function private.finish_coaching_session(uuid)
  to authenticated;

create or replace function public.finish_coaching_session(p_session_id uuid)
returns boolean
language sql
security invoker
set search_path=''
as $$
  select private.finish_coaching_session(p_session_id)
$$;

revoke all on function public.finish_coaching_session(uuid)
  from public, anon;
grant execute on function public.finish_coaching_session(uuid)
  to authenticated;

-- Le nom de la table extérieure est volontairement qualifié.
-- Sans cette qualification, owner_id pouvait être interprété comme s.owner_id,
-- donnant la condition toujours vraie s.owner_id = s.owner_id.
drop policy if exists "coaching_debriefs_insert"
  on public.coaching_debriefs;
create policy "coaching_debriefs_insert"
on public.coaching_debriefs
for insert
to authenticated
with check (
  private.coaching_role(session_id) in ('driver','coach')
  and exists (
    select 1
      from public.coaching_sessions s
     where s.id = coaching_debriefs.session_id
       and s.owner_id = coaching_debriefs.owner_id
  )
);

drop policy if exists "coaching_debriefs_update"
  on public.coaching_debriefs;
create policy "coaching_debriefs_update"
on public.coaching_debriefs
for update
to authenticated
using (private.coaching_role(session_id) in ('driver','coach'))
with check (
  private.coaching_role(session_id) in ('driver','coach')
  and exists (
    select 1
      from public.coaching_sessions s
     where s.id = coaching_debriefs.session_id
       and s.owner_id = coaching_debriefs.owner_id
  )
);

commit;

-- Vérification en lecture seule après application :
select
  n.nspname as schema_name,
  p.proname,
  p.prosecdef as security_definer,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'piste_owner_only',
    'join_coaching_session',
    'finish_coaching_session'
  )
order by p.proname;
