alter table public.ops_live_publications
 add column mission_finished boolean not null default false,
 add column live_outcome text check (live_outcome in ('positive','assisted_positive','oriented_not_found','negative','interrupted','no_target'));

create function public.ops_live_finish_observer(p_id uuid,p_actor uuid,p_seconds bigint,p_outcome text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_seconds<0 or (p_outcome is not null and p_outcome not in ('positive','assisted_positive','oriented_not_found','negative','interrupted','no_target')) then
  raise exception 'invalid_final_outcome' using errcode='22023';
 end if;
 perform 1 from public.ops_live_publications
 where id=p_id and owner_id=p_actor and closed_at is not null
 and public.ops_live_authorized(p_id,p_actor) for update;
 if not found then raise exception 'access_denied' using errcode='42501'; end if;
 update public.ops_live_publications
 set mission_finished=true,live_outcome=coalesce(p_outcome,live_outcome),
  projection_metadata=case when p_seconds is null then projection_metadata else
   jsonb_set(projection_metadata,'{trackingSeconds}',to_jsonb(greatest(p_seconds,coalesce((projection_metadata->>'trackingSeconds')::bigint,0)))) end,
  version=version+1,updated_at=statement_timestamp()
 where id=p_id and (not mission_finished or (p_outcome is not null and live_outcome is distinct from p_outcome)
  or p_seconds>coalesce((projection_metadata->>'trackingSeconds')::bigint,-1));
 return true;
end $$;

revoke all on function public.ops_live_finish_observer(uuid,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.ops_live_finish_observer(uuid,uuid,bigint,text) to service_role;

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
 'closed',p.closed_at is not null,'missionFinished',p.mission_finished,'outcome',p.live_outcome,'metadata',metadata,'points',points,'lastSequence',p.last_sequence,
 'distanceM',p.distance_m,'lastPositionAt',p.last_position_at,'readOnly',true,'corridor',null);
end $function$;
