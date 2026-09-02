-- V10.40 — Dry run du correctif de sécurité de la RPC historique de démarrage.
-- Inspection uniquement : la transaction est annulée.
begin;

create or replace function private.start_coaching_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_workflow_version integer;
begin
  if v_user is null then
    raise exception 'Authentification requise';
  end if;

  if not exists (
    select 1
      from public.coaching_members m
     where m.session_id = p_session_id
       and m.user_id = v_user
       and m.role in ('driver','coach','traceur','solo')
  ) then
    raise exception 'Rôle terrain requis';
  end if;

  select coalesce(s.workflow_version, 1)
    into v_workflow_version
    from public.coaching_sessions s
   where s.id = p_session_id;

  if coalesce(v_workflow_version, 1) >= 2 then
    raise exception 'Utiliser le workflow Coaching V10.40 pour démarrer cette session';
  end if;

  -- Contrat legacy inchangé : waiting -> live, avec started_at initialisé une fois.
  update public.coaching_sessions
     set status = 'live', started_at = coalesce(started_at, now())
   where id = p_session_id
     and status = 'waiting';

  return found or exists (
    select 1
      from public.coaching_sessions s
     where s.id = p_session_id
       and s.status = 'live'
  );
end
$function$;

-- Vérifications intégrées avant rollback (lecture seule).
select n.nspname as schema_name,
       p.proname as routine_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as returns
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where (n.nspname, p.proname) in
       (('private','start_coaching_session'), ('public','start_coaching_session'));

select 'legacy workflow_version < 2 remains delegated to historical waiting -> live path' as legacy_contract,
       'workflow_version >= 2 is rejected by private.start_coaching_session' as v1040_contract,
       'public wrapper is not recreated or changed by this patch' as wrapper_contract;

rollback;

