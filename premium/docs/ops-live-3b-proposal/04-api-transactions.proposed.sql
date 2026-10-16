-- PROPOSITION LOCALE. Aucune application Supabase. Tous les droits SQL sont
-- reserves au backend; p_actor vient exclusivement du JWT verifie par l'API.
begin;
create function public.ops_live_authorized(p_id uuid,p_actor uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.ops_live_publications p
 where p.id=p_id and p.purged_at is null and p.sharing and coalesce(p.purge_at,p.active_deadline)>statement_timestamp()
 and (p.owner_id=p_actor or exists(select 1 from public.ops_live_access a
 where a.publication_id=p.id and a.generation=p.generation and a.user_id=p_actor and a.revoked_at is null
 and (a.source_access_id is null or exists(select 1 from public.ops_live_access h
 where h.id=a.source_access_id and h.scope='habitual' and h.revoked_at is null)))));
$$;

create function public.ops_live_validate_metadata(p jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare e jsonb; q jsonb;
begin
 if p is null or jsonb_typeof(p)<>'object' or p-array['state','dogName','handlerName','trackingSeconds','trackAge','events']<>'{}'::jsonb
 or octet_length(p::text)>65536 then return false; end if;
 if p ? 'state' and p->>'state' not in ('Prêt','En cours','Pause','Fin de piste') then return false; end if;
 if p ? 'trackingSeconds' and p->'trackingSeconds'<>'null'::jsonb and
 (jsonb_typeof(p->'trackingSeconds')<>'number' or (p->>'trackingSeconds')::numeric<0 or trunc((p->>'trackingSeconds')::numeric)<>(p->>'trackingSeconds')::numeric) then return false; end if;
 foreach q in array array[p->'dogName',p->'handlerName',p->'trackAge'] loop
 if q is not null and q<>'null'::jsonb and (jsonb_typeof(q)<>'string' or length(q#>>'{}')>160) then return false; end if; end loop;
 if p ? 'events' then
  if jsonb_typeof(p->'events')<>'array' or jsonb_array_length(p->'events')>500 then return false; end if;
  for e in select value from jsonb_array_elements(p->'events') loop
   if jsonb_typeof(e)<>'object' or e-array['id','type','elapsedMs','point']<>'{}'::jsonb
    or e->>'type' is null or e->>'type' not in ('Départ','Rupture','Reprise','Indice','Objet trouvé','Zone particulière','Changement notable','Fin de piste') then return false; end if;
   if e ? 'id' and (jsonb_typeof(e->'id')<>'string' or length(e->>'id')>160) then return false; end if;
   if e ? 'elapsedMs' and (jsonb_typeof(e->'elapsedMs')<>'number' or (e->>'elapsedMs')::numeric<0) then return false; end if;
   if e ? 'point' then q=e->'point';
    if jsonb_typeof(q)<>'object' or q-array['latitude','longitude','space']<>'{}'::jsonb
      or jsonb_typeof(q->'latitude') is distinct from 'number' or jsonb_typeof(q->'longitude') is distinct from 'number'
      or (q->>'latitude')::numeric not between -90 and 90 or (q->>'longitude')::numeric not between -180 and 180
      or q->>'space' is distinct from 'wgs84' then return false; end if;
   end if;
  end loop;
 end if;
 return true;
exception when others then return false;
end $$;

create function public.ops_live_commit(p_id uuid,p_actor uuid,p_command uuid,p_expected bigint,p_type text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.ops_live_publications; old_command public.ops_live_commands;
 hash text; v_now timestamptz=statement_timestamp(); i public.ops_live_invites;
 point jsonb; previous public.ops_live_points; seq bigint; stamp timestamptz;
 lat double precision; lon double precision; acc double precision; seg text; d double precision;
 options jsonb; key text; metadata jsonb; beneficiary uuid;
begin
 if p_actor is null or p_command is null or p_id is null or p_expected is null or p_payload is null or jsonb_typeof(p_payload)<>'object'
 or octet_length(p_payload::text)>200000 then raise exception 'invalid_request' using errcode='22023'; end if;
 if p_type not in ('publish','invite','join','revoke','gps-batch','update','stop-sharing','close','retention','mark-notification-read') then raise exception 'unknown_command' using errcode='22023'; end if;
 hash=encode(sha256(convert_to(jsonb_build_object('actor',p_actor,'type',p_type,'payload',p_payload)::text,'UTF8')),'hex');
 -- Serialize even initial creation without inserting an unvalidated placeholder.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into p from public.ops_live_publications where id=p_id for update;
 if not found then
  if p_type<>'publish' or p_expected<>-1 or p_payload->>'creationPurpose' is distinct from 'create' or (p_payload->>'creationExpectedVersion')::bigint is distinct from -1 then raise exception 'not_available' using errcode='42501'; end if;
  if p_payload-array['localMissionId','options','notifyObservers','metadata','captureStartedAt','creationExpiresAt','creationPurpose','creationExpectedVersion']<>'{}'::jsonb or not public.ops_live_validate_metadata(coalesce(p_payload->'metadata','{}'::jsonb)) then raise exception 'invalid_publication' using errcode='22023'; end if;
  if p_payload->'metadata'->>'state'='Fin de piste' then raise exception 'mission_finished' using errcode='22023'; end if;
  if (p_payload->>'creationExpiresAt')::timestamptz is null or (p_payload->>'creationExpiresAt')::timestamptz<=v_now or (p_payload->>'creationExpiresAt')::timestamptz>v_now+interval '5 minutes' then raise exception 'creation_expired' using errcode='22023'; end if;
  options=coalesce(p_payload->'options','{"showDog":true,"showHandler":true,"showEvents":true,"showTrackAge":true,"showCorridor":true}'::jsonb);
  if jsonb_typeof(options)<>'object' or options-array['showDog','showHandler','showEvents','showTrackAge','showCorridor']<>'{}'::jsonb then raise exception 'invalid_options' using errcode='22023'; end if;
  for key in select jsonb_object_keys(options) loop if jsonb_typeof(options->key)<>'boolean' then raise exception 'invalid_option' using errcode='22023'; end if; end loop;
  if p_payload ? 'notifyObservers' and jsonb_typeof(p_payload->'notifyObservers')<>'boolean' then raise exception 'invalid_notify' using errcode='22023'; end if;
  insert into public.ops_live_publications(id,owner_id,local_mission_id,sharing,projection_options,notify_observers,projection_metadata,capture_started_at,creation_expires_at)
  values(p_id,p_actor,p_payload->>'localMissionId',true,options,coalesce((p_payload->>'notifyObservers')::boolean,true),coalesce(p_payload->'metadata','{}'::jsonb),coalesce((p_payload->>'captureStartedAt')::timestamptz,v_now),(p_payload->>'creationExpiresAt')::timestamptz) returning * into p;
  if p.capture_started_at>v_now+interval '5 seconds' or p.capture_started_at<v_now-interval '24 hours' then raise exception 'invalid_capture_start' using errcode='22023'; end if;
  -- Habitual observers keep their existing one-time authorization; no per-mission invitation.
  insert into public.ops_live_access(owner_id,scope,publication_id,generation,user_id,source_access_id,notification_version)
  select p.owner_id,'publication',p.id,p.generation,h.user_id,h.id,case when p.notify_observers then 0 else null end
  from public.ops_live_access h where h.scope='habitual' and h.owner_id=p.owner_id and h.revoked_at is null;
  insert into public.ops_live_commands values(p_id,p_command,p_actor,p.generation,hash,'publish',0,v_now);
  return jsonb_build_object('id',p.id,'version',0,'generation',p.generation,'acknowledged',true);
 end if;
 if not exists(select 1 from public.ops_live_publications where id=p_id and purged_at is null and coalesce(purge_at,active_deadline)>v_now) then raise exception 'expired' using errcode='42501'; end if;
 -- Revalidate actor before returning an existing acknowledgement.
 if p_type='join' then
  if p_payload-array['tokenHash']<>'{}'::jsonb then raise exception 'invalid_invite' using errcode='22023'; end if;
  select * into i from public.ops_live_invites where token_hash=p_payload->>'tokenHash' and publication_id=p_id and generation=p.generation and recipient_id=p_actor;
  if not found or i.revoked_at is not null or i.expires_at<=v_now then raise exception 'invalid_invite' using errcode='42501'; end if;
 elsif p_type='mark-notification-read' then
  if not public.ops_live_authorized(p_id,p_actor) then raise exception 'access_denied' using errcode='42501'; end if;
 elsif p.owner_id<>p_actor then raise exception 'access_denied' using errcode='42501'; end if;
 select * into old_command from public.ops_live_commands where publication_id=p_id and command_id=p_command;
 if found then
  if old_command.actor_id<>p_actor or old_command.fingerprint<>hash then raise exception 'command_reused' using errcode='22023'; end if;
  return jsonb_build_object('id',p_id,'version',p.version,'generation',p.generation,'acceptedVersion',old_command.accepted_version,'acknowledged',true);
 end if;
 if p_expected<>p.version then raise exception 'version_conflict' using errcode='40001'; end if;
 if p.closed_at is not null and p_type not in ('revoke','stop-sharing','retention','mark-notification-read') then raise exception 'publication_closed' using errcode='22023'; end if;
 if not p.sharing and p_type not in ('revoke','retention','stop-sharing','publish') then raise exception 'sharing_stopped' using errcode='42501'; end if;
 if p_type='publish' then
  if p_payload->>'creationPurpose' is distinct from 'republish' or (p_payload->>'creationExpectedVersion')::bigint is distinct from p_expected then raise exception 'invalid_republish_ticket' using errcode='22023'; end if;
  if p.sharing then raise exception 'existing_publication' using errcode='22023'; end if;
  if p_payload-array['localMissionId','options','notifyObservers','metadata','captureStartedAt','creationExpiresAt','creationPurpose','creationExpectedVersion']<>'{}'::jsonb
  or p_payload->>'localMissionId' is distinct from p.local_mission_id or not public.ops_live_validate_metadata(coalesce(p_payload->'metadata','{}'::jsonb))
  or p_payload->'metadata'->>'state'='Fin de piste' then raise exception 'invalid_republication' using errcode='22023'; end if;
  if (p_payload->>'creationExpiresAt')::timestamptz is null or (p_payload->>'creationExpiresAt')::timestamptz<=v_now or (p_payload->>'creationExpiresAt')::timestamptz>v_now+interval '5 minutes' then raise exception 'creation_expired' using errcode='22023'; end if;
  p.creation_expires_at=(p_payload->>'creationExpiresAt')::timestamptz;
  if p_payload ? 'options' then
   options=p_payload->'options';if jsonb_typeof(options)<>'object' or options-array['showDog','showHandler','showEvents','showTrackAge','showCorridor']<>'{}'::jsonb then raise exception 'invalid_options' using errcode='22023'; end if;
   for key in select jsonb_object_keys(options) loop if jsonb_typeof(options->key)<>'boolean' then raise exception 'invalid_option' using errcode='22023'; end if; end loop;
   p.projection_options=p.projection_options||options;
  end if;
  if p_payload ? 'notifyObservers' then if jsonb_typeof(p_payload->'notifyObservers')<>'boolean' then raise exception 'invalid_notify' using errcode='22023'; end if;p.notify_observers=(p_payload->>'notifyObservers')::boolean; end if;

  p.generation=p.generation+1;p.last_sequence=0;p.distance_m=0;p.last_position_at=null;p.sharing=true;p.stopped_at=null;p.purge_at=null;p.channel_epoch=gen_random_uuid();
  -- Explicit fresh sharing action can reuse options but never old mission grants.
  p.projection_metadata=coalesce(p_payload->'metadata',p.projection_metadata);
  insert into public.ops_live_access(owner_id,scope,publication_id,generation,user_id,source_access_id,notification_version)
  select p.owner_id,'publication',p.id,p.generation,h.user_id,h.id,case when p.notify_observers then p.version+1 else null end
  from public.ops_live_access h where h.scope='habitual' and h.owner_id=p.owner_id and h.revoked_at is null;

 elsif p_type='invite' then
  if p_payload-array['recipientId','tokenHash','expiresAt']<>'{}'::jsonb then raise exception 'invalid_invite' using errcode='22023'; end if;
  beneficiary=(p_payload->>'recipientId')::uuid;
  if beneficiary=p.owner_id then raise exception 'invalid_recipient' using errcode='22023'; end if;
  insert into public.ops_live_invites(token_hash,owner_id,scope,publication_id,generation,recipient_id,expires_at)
  values(p_payload->>'tokenHash',p.owner_id,'publication',p_id,p.generation,beneficiary,(p_payload->>'expiresAt')::timestamptz);
 elsif p_type='join' then
  if i.consumed_at is not null then raise exception 'invite_consumed' using errcode='42501'; end if;
  update public.ops_live_invites set consumed_at=v_now where token_hash=i.token_hash;
  insert into public.ops_live_access(owner_id,scope,publication_id,generation,user_id)
  values(p.owner_id,'publication',p_id,p.generation,p_actor)
  on conflict (publication_id,generation,user_id) where scope='publication'
  do update set revoked_at=null,source_access_id=null,granted_at=v_now;
 elsif p_type='revoke' then
  if p_payload-array['userId']<>'{}'::jsonb then raise exception 'invalid_revoke' using errcode='22023'; end if;
  beneficiary=(p_payload->>'userId')::uuid;
  update public.ops_live_access set revoked_at=v_now where publication_id=p_id and user_id=beneficiary;
  update public.ops_live_invites set revoked_at=v_now where publication_id=p_id and recipient_id=beneficiary;
  p.channel_epoch=gen_random_uuid();
 elsif p_type='gps-batch' then
  if p_payload-array['generation','points']<>'{}'::jsonb or (p_payload->>'generation')::bigint is distinct from p.generation
  or jsonb_typeof(p_payload->'points') is distinct from 'array' then raise exception 'invalid_batch' using errcode='22023'; end if;
  if jsonb_array_length(p_payload->'points') not between 1 and 60 then raise exception 'invalid_batch_size' using errcode='22023'; end if;
  select * into previous from public.ops_live_points where publication_id=p_id and generation=p.generation order by sequence desc limit 1;
  for point in select value from jsonb_array_elements(p_payload->'points') loop
   if jsonb_typeof(point)<>'object' or point-array['sequence','segmentId','latitude','longitude','accuracy','capturedAt']<>'{}'::jsonb
   or not (point ?& array['sequence','segmentId','latitude','longitude','accuracy','capturedAt']) then raise exception 'invalid_point' using errcode='22023'; end if;
   seq=(point->>'sequence')::bigint;seg=point->>'segmentId';lat=(point->>'latitude')::double precision;lon=(point->>'longitude')::double precision;acc=(point->>'accuracy')::double precision;stamp=(point->>'capturedAt')::timestamptz;
   if seq<>p.last_sequence+1 or stamp>v_now+interval '5 seconds' or stamp<p.capture_started_at or stamp<v_now-interval '24 hours'
    or (previous.sequence is not null and stamp<=previous.captured_at) then raise exception 'sequence_or_time_invalid' using errcode='22023'; end if;
   if previous.sequence is not null and seg=previous.segment_id and stamp-previous.captured_at<=interval '15 seconds' then
    d=power(sin(radians(lat-previous.latitude)/2),2)+cos(radians(previous.latitude))*cos(radians(lat))*power(sin(radians(lon-previous.longitude)/2),2);
    p.distance_m=p.distance_m+6371000*2*atan2(sqrt(least(1.0,d)),sqrt(greatest(0.0,1-d)));
   elsif previous.sequence is not null and seg=previous.segment_id then raise exception 'gap_requires_new_segment' using errcode='22023'; end if;
   insert into public.ops_live_points values(p_id,p.generation,seq,seg,p_command,lat,lon,acc,stamp,v_now) returning * into previous;
   p.last_sequence=seq;p.last_position_at=stamp;
  end loop;
 elsif p_type='update' then
  if p_payload-array['metadata','options','notifyObservers']<>'{}'::jsonb then raise exception 'invalid_update' using errcode='22023'; end if;
  if p_payload ? 'metadata' then
   metadata=p_payload->'metadata';if not public.ops_live_validate_metadata(metadata) then raise exception 'invalid_metadata' using errcode='22023'; end if;
   if p.projection_metadata->>'trackingSeconds' is not null and (metadata->>'trackingSeconds' is null or (metadata->>'trackingSeconds')::numeric < (p.projection_metadata->>'trackingSeconds')::numeric) then raise exception 'duration_regression' using errcode='22023'; end if;
   p.projection_metadata=metadata;
   if metadata->>'state'='Fin de piste' then p.closed_at=v_now;p.purge_at=v_now+make_interval(secs=>p.retention_seconds); end if;
  end if;
  if p_payload ? 'options' then
   options=p_payload->'options';if jsonb_typeof(options)<>'object' or options-array['showDog','showHandler','showEvents','showTrackAge','showCorridor']<>'{}'::jsonb then raise exception 'invalid_options' using errcode='22023'; end if;
   for key in select jsonb_object_keys(options) loop if jsonb_typeof(options->key)<>'boolean' then raise exception 'invalid_option' using errcode='22023'; end if; end loop;
   p.projection_options=p.projection_options||options;
  end if;
  if p_payload ? 'notifyObservers' then if jsonb_typeof(p_payload->'notifyObservers')<>'boolean' then raise exception 'invalid_notify' using errcode='22023'; end if;p.notify_observers=(p_payload->>'notifyObservers')::boolean; end if;
 elsif p_type='stop-sharing' then
  if p_payload<>'{}'::jsonb then raise exception 'invalid_stop' using errcode='22023'; end if;
  p.sharing=false;p.stopped_at=coalesce(p.stopped_at,v_now);p.channel_epoch=gen_random_uuid();
  p.purge_at=least(coalesce(p.purge_at,v_now+make_interval(secs=>p.retention_seconds)),v_now+make_interval(secs=>p.retention_seconds));
  update public.ops_live_access set revoked_at=v_now where publication_id=p_id;
  update public.ops_live_invites set revoked_at=v_now where publication_id=p_id;
 elsif p_type='close' then
  if p_payload<>'{}'::jsonb then raise exception 'invalid_close' using errcode='22023'; end if;
  p.closed_at=v_now;p.purge_at=v_now+make_interval(secs=>p.retention_seconds);
  p.projection_metadata=jsonb_set(p.projection_metadata,'{state}','"Fin de piste"'::jsonb);
 elsif p_type='retention' then
  if p_payload-array['seconds']<>'{}'::jsonb then raise exception 'invalid_retention' using errcode='22023'; end if;
  p.retention_seconds=(p_payload->>'seconds')::integer;
  if p.closed_at is not null or p.stopped_at is not null then p.purge_at=coalesce(p.closed_at,p.stopped_at)+make_interval(secs=>p.retention_seconds); end if;
 elsif p_type='mark-notification-read' then
  if p_payload<>'{}'::jsonb then raise exception 'invalid_notification' using errcode='22023'; end if;
  update public.ops_live_access set notification_read=true where publication_id=p_id and generation=p.generation and user_id=p_actor;
 end if;
 if p.closed_at is not null then update public.ops_live_invites set revoked_at=v_now where publication_id=p_id and consumed_at is null; end if;
 p.version=p.version+1;
 update public.ops_live_publications set creation_expires_at=p.creation_expires_at,version=p.version,generation=p.generation,last_sequence=p.last_sequence,sharing=p.sharing,
 closed_at=p.closed_at,stopped_at=p.stopped_at,channel_epoch=p.channel_epoch,projection_options=p.projection_options,
 projection_metadata=p.projection_metadata,notify_observers=p.notify_observers,distance_m=p.distance_m,
 last_position_at=p.last_position_at,retention_seconds=p.retention_seconds,purge_at=p.purge_at,updated_at=v_now where id=p_id;
 insert into public.ops_live_commands values(p_id,p_command,p_actor,p.generation,hash,p_type,p.version,v_now);
 return jsonb_build_object('id',p_id,'version',p.version,'generation',p.generation,'acknowledged',true);
end $$;

-- Owner-scoped permissions preserve habitual observers; no per-mission acceptance.
-- Existing mock contacts must first be matched explicitly to real UUIDs.
create function public.ops_live_habitual(p_actor uuid,p_owner uuid,p_user uuid,p_enabled boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
declare p public.ops_live_publications; h uuid; t timestamptz=statement_timestamp();
begin
 if p_actor is null or p_actor<>p_owner or p_user is null or p_user=p_owner or p_enabled is null then raise exception 'access_denied' using errcode='42501'; end if;
 -- Lock publications before grant to keep read/revoke order consistent.
 for p in select * from public.ops_live_publications where owner_id=p_owner order by id for update loop
  update public.ops_live_publications set channel_epoch=gen_random_uuid(),version=version+1 where id=p.id;
 end loop;
 insert into public.ops_live_access(owner_id,scope,user_id,revoked_at)
 values(p_owner,'habitual',p_user,case when p_enabled then null else t end)
 on conflict (owner_id,user_id) where scope='habitual'
 do update set revoked_at=case when p_enabled then null else t end returning id into h;
 -- Revoking the persistent permission revokes current access too. Enabling only
 -- affects future publications; reopening a current session requires explicit action.
 if not p_enabled then
  update public.ops_live_access set revoked_at=t where owner_id=p_owner and scope='publication' and user_id=p_user;
  update public.ops_live_invites set revoked_at=t where owner_id=p_owner and recipient_id=p_user;
 end if;
 return true;
end $$;

create function public.ops_live_read(p_id uuid,p_actor uuid,p_after bigint default 0,p_version bigint default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.ops_live_publications; metadata jsonb; points jsonb;
begin
 select * into p from public.ops_live_publications where id=p_id for share;
 if not found or not public.ops_live_authorized(p_id,p_actor) then raise exception 'access_denied' using errcode='42501'; end if;
 if p_after is null or p_after<0 then raise exception 'invalid_cursor' using errcode='22023'; end if;
 if p_after>0 and p_version is distinct from p.version then raise exception 'version_conflict' using errcode='40001'; end if;
 metadata=p.projection_metadata;
 if coalesce(p.projection_options->>'showDog','false')<>'true' then metadata=metadata-'dogName'; end if;
 if coalesce(p.projection_options->>'showHandler','false')<>'true' then metadata=metadata-'handlerName'; end if;
 if coalesce(p.projection_options->>'showTrackAge','false')<>'true' then metadata=metadata-'trackAge'; end if;
 if coalesce(p.projection_options->>'showEvents','false')<>'true' then metadata=metadata-'events'; end if;
 select coalesce(jsonb_agg(q.value order by q.sequence),'[]'::jsonb) into points from
 (select sequence,jsonb_build_object('sequence',sequence,'segmentId',segment_id,'latitude',latitude,'longitude',longitude,'accuracy',accuracy_m,'capturedAt',captured_at) value
  from public.ops_live_points where publication_id=p_id and generation=p.generation and sequence>p_after order by sequence limit 500) q;
 return jsonb_build_object('id',p.id,'version',p.version,'generation',p.generation,'epoch',p.channel_epoch,
 'closed',p.closed_at is not null,'metadata',metadata,'points',points,'lastSequence',p.last_sequence,
 'distanceM',p.distance_m,'lastPositionAt',p.last_position_at,'readOnly',true,'corridor',null);
end $$;

create function public.ops_live_list(p_actor uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'version',p.version,'generation',p.generation,'closed',p.closed_at is not null) order by p.updated_at desc,p.id),'[]'::jsonb)
 from (select p.* from public.ops_live_publications p where public.ops_live_authorized(p.id,p_actor) order by p.updated_at desc,p.id limit 100) p;
$$;

create function public.ops_live_delete(p_id uuid,p_actor uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare p public.ops_live_publications; t timestamptz=statement_timestamp();
begin
 select * into p from public.ops_live_publications where id=p_id and owner_id=p_actor for update;
 if not found then raise exception 'access_denied' using errcode='42501'; end if;
 delete from public.ops_live_points where publication_id=p_id;
 delete from public.ops_live_invites where publication_id=p_id;
 delete from public.ops_live_access where publication_id=p_id;
 delete from public.ops_live_commands where publication_id=p_id;
 -- Brief anti-replay tombstone until the original creation ticket expires.
 -- No points, names, local mission identifier, events, notes or receipts retained.
 update public.ops_live_publications set sharing=false,local_mission_id='deleted:'||id::text,projection_metadata='{}'::jsonb,
 projection_options='{}'::jsonb,purged_at=t,purge_at=t,channel_epoch=gen_random_uuid(),distance_m=0,last_position_at=null
 where id=p_id;
 if p.creation_expires_at<=t then delete from public.ops_live_publications where id=p_id; end if;
 return true;
end $$;

create function public.ops_live_prepare(p_id uuid,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.ops_live_publications where id=p_id and owner_id=p_actor
 and purged_at is null and closed_at is null and not sharing and active_deadline>statement_timestamp()
 and coalesce(purge_at,active_deadline)>statement_timestamp()) then raise exception 'access_denied' using errcode='42501'; end if;
 return (select jsonb_build_object('version',version,'generation',generation) from public.ops_live_publications where id=p_id);
end $$;
revoke all on function public.ops_live_prepare(uuid,uuid) from public,anon,authenticated;
grant execute on function public.ops_live_prepare(uuid,uuid) to service_role;

create function public.ops_live_notifications(p_actor uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id::text||':'||p.generation::text||':'||p_actor::text,
 'type','live_session_started','session_id',p.id,'session_type','ops','owner_user_id',p.owner_id,
 'recipient_user_id',p_actor,'owner_display_name','Un membre',
 'dog_name',case when p.projection_options->>'showDog'='true' then p.projection_metadata->>'dogName' else null end,
 'route','/live/ops/'||p.id::text,'observer_role','ops_trace_observer','read',a.notification_read,
 'channels',jsonb_build_object('inApp',true,'email',false,'push',false)) order by p.created_at desc),'[]'::jsonb)
 from public.ops_live_publications p join public.ops_live_access a on a.publication_id=p.id and a.generation=p.generation
 where a.user_id=p_actor and a.revoked_at is null and a.notification_version is not null
 and public.ops_live_authorized(p.id,p_actor);
$$;
create function public.ops_live_signal_targets(p_id uuid,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.ops_live_publications; users jsonb;
begin
 select * into p from public.ops_live_publications where id=p_id and owner_id=p_actor;
 if not found then raise exception 'access_denied' using errcode='42501'; end if;
 if not p.sharing or p.purged_at is not null or coalesce(p.purge_at,p.active_deadline)<=statement_timestamp() then return null; end if;
 select jsonb_agg(u.id) into users from
 (select p.owner_id id union select a.user_id from public.ops_live_access a where a.publication_id=p.id
 and a.generation=p.generation and a.revoked_at is null and public.ops_live_authorized(p.id,a.user_id)) u;
 return jsonb_build_object('id',p.id,'generation',p.generation,'version',p.version,'epoch',p.channel_epoch,'users',users);
end $$;
revoke all on function public.ops_live_notifications(uuid),public.ops_live_signal_targets(uuid,uuid) from public,anon,authenticated;
grant execute on function public.ops_live_notifications(uuid),public.ops_live_signal_targets(uuid,uuid) to service_role;

revoke all on function public.ops_live_authorized(uuid,uuid),public.ops_live_validate_metadata(jsonb),public.ops_live_commit(uuid,uuid,uuid,bigint,text,jsonb),public.ops_live_habitual(uuid,uuid,uuid,boolean),public.ops_live_read(uuid,uuid,bigint,bigint),public.ops_live_list(uuid),public.ops_live_delete(uuid,uuid) from public,anon,authenticated;
grant execute on function public.ops_live_authorized(uuid,uuid),public.ops_live_validate_metadata(jsonb),public.ops_live_commit(uuid,uuid,uuid,bigint,text,jsonb),public.ops_live_habitual(uuid,uuid,uuid,boolean),public.ops_live_read(uuid,uuid,bigint,bigint),public.ops_live_list(uuid),public.ops_live_delete(uuid,uuid) to service_role;
commit;
