-- V10.40 : dry-run transactionnel de la transition Je suis en place.
begin;

create or replace function public.set_coaching_ready(p_session_id uuid)
returns public.coaching_sessions
language plpgsql security definer set search_path = ''
as $$
declare r public.coaching_sessions; uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if coalesce(r.workflow_version,1)<>2 then raise exception 'Session legacy : workflow V10.40 indisponible'; end if;
  if r.owner_id<>uid then raise exception 'Seul le créateur peut se déclarer en place'; end if;
  if r.phase='coach_ready' then return r; end if;
  if (r.status='waiting' and coalesce(r.phase,'preparation')='preparation')
     or (r.status='live' and r.phase in ('laid','waiting_ready')) then
    perform set_config('piste.v1040_transition','on',true);
    update public.coaching_sessions set status='live',phase='coach_ready',coach_ready_at=coalesce(coach_ready_at,now())
    where id=r.id returning * into r;
    return r;
  end if;
  raise exception 'Transition vers coach_ready invalide';
end
$$;

select routine_schema,routine_name,data_type
from information_schema.routines
where routine_schema='public' and routine_name='set_coaching_ready';

rollback;
