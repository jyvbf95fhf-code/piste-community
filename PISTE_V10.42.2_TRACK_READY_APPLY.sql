-- V10.42.2 : autorise live/laying -> waiting_ready.
-- Exécution manuelle uniquement après validation du DRY RUN.
begin;

create or replace function public.mark_coaching_track_ready(p_session_id uuid)
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
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if coalesce(r.workflow_version,1)<>2 then raise exception 'Session legacy : workflow V10.42 indisponible'; end if;
  select m.role into role_name from public.coaching_members m
    where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
  if not ((r.owner_id=uid and r.laying_mode='coach') or (role_name='traceur' and r.laying_mode='traceur')) then
    raise exception 'Rôle non autorisé pour déclarer la piste prête';
  end if;
  if r.status='waiting' and r.phase='waiting_ready' then return r; end if;
  if r.status<>'live' or r.phase<>'laying' then raise exception 'Transition vers piste prête invalide'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions
    set status='waiting', phase='waiting_ready', track_finished_at=coalesce(track_finished_at,now())
    where id=r.id returning * into r;
  return r;
end
$$;

revoke execute on function public.mark_coaching_track_ready(uuid) from public, anon;
grant execute on function public.mark_coaching_track_ready(uuid) to authenticated;

commit;
