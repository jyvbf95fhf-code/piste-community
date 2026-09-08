-- V10.42.3 : clôture normale Conducteur via la RPC existante.
-- MANUEL UNIQUEMENT, après V10.40 RLS et V10.42.3 VISIBILITY.
-- Ne modifie ni les policies, ni la visibilité, ni les traces/débriefs.
begin;
do $$ begin
  if to_regprocedure('private.finish_coaching_session(uuid)') is null
     or to_regprocedure('public.finish_coaching_session(uuid)') is null then
    raise exception 'Prérequis absent : finish_coaching_session V10.40';
  end if;
end $$;

create or replace function private.finish_coaching_session(p_session_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare r public.coaching_sessions; uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  -- Le créateur conserve son secours ; seul le Conducteur actif V10.42.3 est ajouté.
  if r.owner_id is distinct from uid then
    if r.visibility_version is distinct from 3 or coalesce(r.workflow_version,1)<2 then
      raise exception 'Seul le créateur peut clôturer cette session historique';
    end if;
    perform 1 from public.coaching_members
      where session_id=r.id and user_id=uid and role='driver'
        and invitation_status in ('accepted','active') for share;
    if not found then raise exception 'Conducteur actif ou créateur requis'; end if;
  end if;
  if coalesce(r.workflow_version,1)>=2 and r.phase is distinct from 'completed' then
    raise exception 'La fin normale exige la phase completed';
  end if;
  -- Relance après réponse réseau perdue : ne pas modifier l'heure de clôture.
  if r.status='ended' then return true; end if;
  if r.status is distinct from 'live' then raise exception 'Session non active'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set status='ended',
    phase=case when coalesce(r.workflow_version,1)>=2 then 'completed' else phase end,
    ended_at=coalesce(ended_at,now()) where id=r.id;
  return true;
end $$;

create or replace function public.finish_coaching_session(p_session_id uuid)
returns boolean language sql security definer set search_path=''
as $$ select private.finish_coaching_session(p_session_id) $$;
revoke all on function private.finish_coaching_session(uuid) from public,anon,authenticated;
revoke all on function public.finish_coaching_session(uuid) from public,anon;
grant execute on function public.finish_coaching_session(uuid) to authenticated;
commit;
