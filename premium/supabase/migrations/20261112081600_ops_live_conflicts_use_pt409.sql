-- Business conflicts must not trigger PostgREST 14 serialization retries.
CREATE OR REPLACE FUNCTION public.ops_live_commit(p_id uuid, p_actor uuid, p_command uuid, p_expected bigint, p_type text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p public.ops_live_publications; old_command public.ops_live_commands;
 hash text; v_now timestamptz=statement_timestamp(); i public.ops_live_invites;
 point jsonb; previous public.ops_live_points; seq bigint; stamp timestamptz;
 lat double precision; lon double precision; acc double precision; seg text; d double precision;
 options jsonb; key text; metadata jsonb; beneficiary uuid;
begin
 if p_type not in ('stop-sharing','close','revoke','retention','mark-notification-read') and not private.live_has_premium(p_actor) then raise exception 'premium_required' using errcode='42501';end if;
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
 if p_expected<>p.version then raise exception 'version_conflict' using errcode='PT409'; end if;
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
end $function$
;
CREATE OR REPLACE FUNCTION public.ops_live_read(p_id uuid, p_actor uuid, p_after bigint DEFAULT 0, p_version bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p public.ops_live_publications; metadata jsonb; points jsonb;
begin
 select * into p from public.ops_live_publications where id=p_id for share;
 if not found or not public.ops_live_authorized(p_id,p_actor) then raise exception 'access_denied' using errcode='42501'; end if;
 if p_after is null or p_after<0 then raise exception 'invalid_cursor' using errcode='22023'; end if;
 if p_after>0 and p_version is distinct from p.version then raise exception 'version_conflict' using errcode='PT409'; end if;
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
end $function$
;
