-- V10.40 ciblé : dry-run transactionnel, aucune modification persistante.
begin;

create or replace function public.start_coaching_laying(p_session_id uuid)
returns public.coaching_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.coaching_sessions;
  role_name text;
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  select * into r from public.coaching_sessions where id = p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  select cm.role into role_name from public.coaching_members cm
  where cm.session_id = r.id and cm.user_id = uid
    and cm.invitation_status in ('accepted','active');
  if coalesce(r.workflow_version,1) <> 2 then
    raise exception 'Session legacy : workflow V10.40 indisponible';
  end if;
  if not ((r.owner_id = uid and r.laying_mode = 'coach') or role_name = 'traceur') then
    raise exception 'Rôle non autorisé pour la pose';
  end if;
  if r.status = 'live' and coalesce(r.phase,'preparation') = 'laying' then return r; end if;
  if r.status <> 'waiting' or coalesce(r.phase,'preparation') <> 'preparation' then
    raise exception 'Transition waiting/preparation -> laying invalide';
  end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set status='live', phase='laying', laying_started_at=coalesce(laying_started_at,now())
  where id=r.id returning * into r;
  return r;
end
$$;

select routine_schema, routine_name, data_type
from information_schema.routines
where routine_schema = 'public' and routine_name = 'start_coaching_laying';

rollback;
