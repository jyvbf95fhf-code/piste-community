CREATE OR REPLACE FUNCTION public.community_friendship_command(p_actor uuid, p_peer uuid, p_action text, p_command_id uuid, p_expected bigint, p_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare lo uuid:=least(p_actor,p_peer);hi uuid:=greatest(p_actor,p_peer);r public.community_friendships;
 previous public.community_friendship_events;answer jsonb;begin
 perform private.community_require_actor(p_actor);
 if p_peer is null or p_peer=p_actor or p_command_id is null or p_expected is null or p_expected< -1
 or p_action is null or p_action not in ('contact-request','accept-contact','refuse-contact','cancel-contact','remove-contact','set-contact-permission')
 or (p_action='set-contact-permission' and p_enabled is null) or (p_action<>'set-contact-permission' and p_enabled is not null)
 then raise exception 'invalid_command' using errcode='22023';end if;
 -- Actor lock serializes rate-limit and idempotency decisions across pairs; pair lock serializes both parties.
 perform pg_advisory_xact_lock(hashtextextended('community-actor:'||p_actor::text,0));
 select * into previous from public.community_friendship_events where command_id=p_command_id;
 if found then
  if previous.actor_id<>p_actor or previous.peer_id<>p_peer or previous.action<>p_action
   or previous.expected_version<>p_expected or previous.enabled_value is distinct from p_enabled
  then raise exception 'command_reused' using errcode='22023';end if;
  return previous.result;
 end if;
 perform private.community_lock_pair(p_actor,p_peer);
 select * into r from public.community_friendships where user_low=lo and user_high=hi for update;
 if coalesce(r.version,-1)<>p_expected then raise exception 'version_conflict' using errcode='PT409';end if;
 if p_action='contact-request' then
  if r.status in ('pending','accepted') then raise exception 'relation_exists' using errcode='22023';end if;
  if not exists(select 1 from public.coaching_remote_users where id=p_peer and enabled) then raise exception 'contact_unavailable' using errcode='42501';end if;
  if (select count(*) from public.community_friendship_events where actor_id=p_actor and action='contact-request' and created_at>now()-interval '1 hour')>=20 then
   raise exception 'request_rate_limit' using errcode='54000';end if;
  insert into public.community_friendships(user_low,user_high,requested_by)
   values(lo,hi,p_actor) on conflict(user_low,user_high) do update set requested_by=p_actor,status='pending',requested_at=now(),resolved_at=null,accepted_at=null,
    low_quick_coaching=false,high_quick_coaching=false,version=public.community_friendships.version+1,updated_at=now();
 else
  if r.id is null then raise exception 'relation_unavailable' using errcode='42501';end if;
  if p_action in ('accept-contact','refuse-contact') then
   if r.status<>'pending' or r.requested_by=p_actor then raise exception 'recipient_only' using errcode='42501';end if;
   if p_action='accept-contact' and not exists(select 1 from public.coaching_remote_users where id=p_peer and enabled) then raise exception 'contact_unavailable' using errcode='42501';end if;
   update public.community_friendships set status=case when p_action='accept-contact' then 'accepted' else 'refused' end,
    resolved_at=now(),accepted_at=case when p_action='accept-contact' then now() else null end,
    low_quick_coaching=false,high_quick_coaching=false,version=version+1,updated_at=now() where user_low=lo and user_high=hi;
  elsif p_action='cancel-contact' then
   if r.status<>'pending' or r.requested_by<>p_actor then raise exception 'requester_only' using errcode='42501';end if;
   update public.community_friendships set status='cancelled',resolved_at=now(),version=version+1,updated_at=now() where user_low=lo and user_high=hi;
  elsif p_action='remove-contact' then
   if r.status<>'accepted' then raise exception 'accepted_relation_required' using errcode='42501';end if;
   update public.community_friendships set status='removed',resolved_at=now(),low_quick_coaching=false,high_quick_coaching=false,version=version+1,updated_at=now() where user_low=lo and user_high=hi;
  elsif p_action='set-contact-permission' then
   if r.status<>'accepted' then raise exception 'accepted_relation_required' using errcode='42501';end if;
   if p_enabled and not exists(select 1 from public.coaching_remote_users where id=p_peer and enabled) then raise exception 'contact_unavailable' using errcode='42501';end if;
   update public.community_friendships set
    low_quick_coaching=case when p_actor=lo then p_enabled else low_quick_coaching end,
    high_quick_coaching=case when p_actor=hi then p_enabled else high_quick_coaching end,
    version=version+1,updated_at=now() where user_low=lo and user_high=hi;
  end if;
 end if;
 select * into r from public.community_friendships where user_low=lo and user_high=hi;
 answer:=jsonb_build_object('id',r.id,'peerId',p_peer,'status',r.status,'version',r.version);
 insert into public.community_friendship_events(command_id,actor_id,peer_id,action,expected_version,enabled_value,resulting_version,result)
  values(p_command_id,p_actor,p_peer,p_action,p_expected,p_enabled,r.version,answer);
 return answer;
end $function$
;
CREATE OR REPLACE FUNCTION public.community_social_command(p_actor uuid, p_peer uuid, p_action text, p_command_id uuid, p_expected bigint, p_enabled boolean DEFAULT NULL::boolean, p_permission text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare prior public.community_social_commands;finger jsonb;answer jsonb;r public.community_friendships;begin
 perform private.community_require_actor(p_actor);
 if p_actor=p_peer or p_peer is null or p_command_id is null or p_expected is null or p_expected< -1 then raise exception 'invalid_command' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('community-actor:'||p_actor::text,0));
 finger:=jsonb_build_array(p_peer,p_action,p_expected,p_enabled,p_permission);
 select * into prior from public.community_social_commands where command_id=p_command_id;
 if found then if prior.actor_id<>p_actor or prior.fingerprint<>finger then raise exception 'command_reused' using errcode='22023';end if;return prior.result;end if;
 perform private.community_lock_pair(p_actor,p_peer);
 if not exists(select 1 from public.coaching_remote_users where id=p_peer and enabled) then raise exception 'peer_denied' using errcode='42501';end if;
 select * into r from public.community_friendships where user_low=least(p_actor,p_peer) and user_high=greatest(p_actor,p_peer) for update;
 if p_action in ('follow','unfollow') then
  insert into public.community_social_edges(owner_id,peer_id,following,live_enabled) values(p_actor,p_peer,p_action='follow',not exists(select 1 from public.ops_live_access where owner_id=p_actor and user_id=p_peer and scope='habitual' and revoked_at is not null)) on conflict(owner_id,peer_id) do update set following=excluded.following;
  answer:=jsonb_build_object('peerId',p_peer,'following',p_action='follow','version',coalesce(r.version,-1));
 elsif p_action='set-contact-permission' and p_permission='live_access_authorized' then
  if r.status is distinct from 'accepted' then raise exception 'friend_required' using errcode='42501';end if;
  if r.version<>p_expected then raise exception 'version_conflict' using errcode='PT409';end if;
  if p_enabled is null then raise exception 'enabled_required' using errcode='22023';end if;
  update public.community_social_edges set live_enabled=p_enabled where owner_id=p_actor and peer_id=p_peer;
  perform public.ops_live_habitual(p_actor,p_actor,p_peer,p_enabled);
  update public.community_friendships set version=version+1,updated_at=now() where id=r.id returning * into r;
  answer:=jsonb_build_object('peerId',p_peer,'status',r.status,'version',r.version);
 else
  if p_action='set-contact-permission' and p_permission is distinct from 'quick_coaching_invite_authorized' then raise exception 'permission_invalid' using errcode='22023';end if;
  answer:=public.community_friendship_command(p_actor,p_peer,p_action,p_command_id,p_expected,p_enabled);
 end if;
 insert into public.community_social_commands values(p_command_id,p_actor,finger,answer);return answer;
end $function$
;
CREATE OR REPLACE FUNCTION public.v2_history_action(p_actor uuid, p_key text, p_action text, p_expected bigint, p_force boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 domain text; target text; target_id uuid; s public.coaching_remote_sessions%rowtype;
 r public.v2_personal_records%rowtype; snapshot jsonb; phase text;
begin
 if p_actor is null or not exists(select 1 from public.coaching_remote_users where id=p_actor and enabled) then raise exception 'Compte non autorisé.' using errcode='42501'; end if;
 if p_key is null or length(p_key)>240 or p_action is null or p_action not in ('hide','delete') or p_force is null then raise exception 'Commande invalide.' using errcode='22023'; end if;
 domain:=split_part(p_key,':',1);target:=substring(p_key from position(':' in p_key)+1);
 if domain not in ('coaching','ops','track','local-coaching','local-ops','local-track') or target='' then raise exception 'Référence invalide.' using errcode='22023'; end if;
 -- Stable 40 LOBO IDs are protected even when a client requests force or hide.
 if lower(btrim(target)) ~ '^10b00000-0000-4000-8000-00000000(10(0[1-9]|1[0-9]|20)|20(0[1-9]|1[0-9]|20))$' then raise exception 'Les 40 séances LOBO sont protégées.' using errcode='42501'; end if;
 if domain like 'local-%' then
  if p_action<>'hide' then raise exception 'Suppression locale requise.' using errcode='22023';end if;
  insert into public.v2_history_hidden(owner_id,item_key) values(p_actor,p_key) on conflict do nothing;
  return jsonb_build_object('status','hidden','key',p_key);
 end if;
 begin target_id:=target::uuid;exception when invalid_text_representation then raise exception 'Identifiant invalide.' using errcode='22023';end;
 target:=target_id::text;p_key:=domain||':'||target;
 if target ~ '^10b00000-0000-4000-8000-00000000(10(0[1-9]|1[0-9]|20)|20(0[1-9]|1[0-9]|20))$' then raise exception 'Les 40 séances LOBO sont protégées.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(case when domain='coaching' then 'v2-history:'||p_key else 'v2-history:'||p_actor::text||':'||p_key end,0));
 if domain='coaching' then
  select * into s from public.coaching_remote_sessions where id=target_id for update;
  if not found then
   if exists(select 1 from private.v2_history_backups where owner_id=p_actor and item_key=p_key) then return jsonb_build_object('status','already-deleted','key',p_key);end if;
   raise exception 'Session inaccessible.' using errcode='42501';
  end if;
  if s.owner_id<>p_actor and not s.state @> jsonb_build_object('members',jsonb_build_array(jsonb_build_object('id',p_actor))) then raise exception 'Session inaccessible.' using errcode='42501';end if;
  phase:=s.state#>>'{search,phase}';
  if phase is null or phase not in ('DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED') then raise exception 'Session active : arrêtez-la avant de nettoyer son historique.' using errcode='55000';end if;
  if p_action='delete' then
   if s.owner_id<>p_actor then raise exception 'Suppression réservée au propriétaire.' using errcode='42501';end if;
   if p_expected is null or p_expected<>s.version then raise exception 'Session modifiée : actualisez avant de réessayer.' using errcode='PT409';end if;
   if not p_force and s.state#>>'{session,id}' is distinct from target then raise exception 'Dossier ancien incohérent : suppression forcée requise.' using errcode='55001';end if;
   -- Lock parent first; FK inserts cannot race cleanup. Any failure rolls back backup AND deletes.
   snapshot:=jsonb_build_object('session',to_jsonb(s),
    'commands',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.coaching_remote_commands x where session_id=target_id),
    'invites',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.coaching_remote_invites x where session_id=target_id),
    'batches',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.coaching_remote_batches x where session_id=target_id),
    'points',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.coaching_remote_points x where session_id=target_id),
    'linkCommands',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.v2_personal_commands x where owner_id=p_actor and accepted_record->>'kind'='session-dog-link' and accepted_record#>>'{payload,sessionId}'=target),
    'links',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.v2_personal_records x where owner_id=p_actor and kind='session-dog-link' and payload->>'sessionId'=target));
   insert into private.v2_history_backups(owner_id,item_key,snapshot) values(p_actor,p_key,snapshot);
   delete from public.coaching_remote_points where session_id=target_id;
   delete from public.coaching_remote_batches where session_id=target_id;
   delete from public.coaching_remote_invites where session_id=target_id;
   delete from public.coaching_remote_commands where session_id=target_id;
   delete from public.v2_personal_commands where owner_id=p_actor and accepted_record->>'kind'='session-dog-link' and accepted_record#>>'{payload,sessionId}'=target;
   delete from public.v2_personal_records where owner_id=p_actor and kind='session-dog-link' and payload->>'sessionId'=target;
   delete from public.coaching_remote_sessions where id=target_id;
  end if;
 else
  select * into r from public.v2_personal_records where owner_id=p_actor and kind=domain and id=target_id for update;
  if not found then
   if exists(select 1 from private.v2_history_backups where owner_id=p_actor and item_key=p_key) then return jsonb_build_object('status','already-deleted','key',p_key);end if;
   raise exception 'Dossier inaccessible.' using errcode='42501';end if;
  if domain='ops' and exists(select 1 from public.ops_live_publications where owner_id=p_actor and local_mission_id=coalesce(r.payload->>'id',target) and closed_at is null and purged_at is null) then raise exception 'Publication Live OPS active : conservation obligatoire.' using errcode='55000';end if;
  if domain='ops' and (coalesce(r.payload->>'trackingState','') in ('active','paused') or coalesce(r.payload->>'status','') not in ('Terminée','Archivée','À compléter','Interrompue','Annulée')) then raise exception 'Mission active : arrêtez-la avant de nettoyer son historique.' using errcode='55000';end if;
  if p_action='delete' then
   if p_expected is null or p_expected<>r.revision then raise exception 'Dossier modifié : actualisez avant de réessayer.' using errcode='PT409';end if;
   insert into private.v2_history_backups(owner_id,item_key,snapshot) values(p_actor,p_key,jsonb_build_object('record',to_jsonb(r),'commands',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.v2_personal_commands x where owner_id=p_actor and accepted_record->>'kind'=domain and accepted_record->>'id'=target)));
   delete from public.v2_personal_commands where owner_id=p_actor and accepted_record->>'kind'=domain and accepted_record->>'id'=target;
   delete from public.v2_personal_records where owner_id=p_actor and kind=domain and id=target_id;
  end if;
 end if;
 insert into public.v2_history_hidden(owner_id,item_key) values(p_actor,p_key) on conflict do nothing;
 return jsonb_build_object('status',case when p_action='hide' then 'hidden' else 'deleted' end,'key',p_key,'forced',p_force);
end;
$function$
;
CREATE OR REPLACE FUNCTION private.v2_history_prevent_resurrection()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare domain text; key text; lock_key text;
begin
 if tg_table_name='coaching_remote_sessions' then
  domain:='coaching';key:='coaching:'||new.id::text;lock_key:='v2-history:'||key;
 else
  domain:=new.kind;
  if domain not in ('ops','track','session-dog-link') then return new;end if;
  if domain='session-dog-link' then
   perform pg_advisory_xact_lock(hashtextextended('v2-history:coaching:'||(new.payload->>'sessionId'),0));
   if exists(select 1 from private.v2_history_backups where item_key='coaching:'||(new.payload->>'sessionId')) then raise exception 'Session définitivement supprimée.' using errcode='PT409';end if;
   return new;
  end if;
  key:=domain||':'||new.id::text;lock_key:='v2-history:'||new.owner_id::text||':'||key;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(lock_key,0));
 if exists(select 1 from private.v2_history_backups where item_key=key and (domain='coaching' or owner_id=new.owner_id)) then raise exception 'Dossier définitivement supprimé : ancien envoi refusé.' using errcode='PT409';end if;
 return new;
end;
$function$
;

