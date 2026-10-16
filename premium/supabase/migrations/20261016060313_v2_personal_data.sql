-- Additive private persistence, isolated V2 dev only. No existing object is altered.
create table public.v2_personal_records (
 owner_id uuid not null,
 kind text not null check (kind in ('profile','dog','track','ops','session-dog-link')),
 id uuid not null,
 schema_version integer not null default 1 check (schema_version = 1),
 revision bigint not null check (revision > 0),
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 200000),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz,
 primary key(owner_id,kind,id)
);
create table public.v2_personal_commands (
 owner_id uuid not null,
 command_id uuid not null,
 fingerprint text not null,
 accepted_record jsonb not null,
 created_at timestamptz not null default now(),
 primary key(owner_id,command_id)
);
alter table public.v2_personal_records enable row level security;
alter table public.v2_personal_commands enable row level security;
revoke all on public.v2_personal_records, public.v2_personal_commands from public, anon, authenticated;
grant select,insert,update on public.v2_personal_records, public.v2_personal_commands to service_role;

create function public.v2_personal_commit(p_owner uuid,p_kind text,p_id uuid,p_expected bigint,p_command uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
 prior public.v2_personal_commands%rowtype;
 current_record public.v2_personal_records%rowtype;
 fingerprint text;
 accepted jsonb;
 dog_ref uuid;
 dog_deleted timestamptz;
begin
 if p_owner is null or p_id is null or p_command is null or p_expected is null or p_expected < 0
 or p_kind is null or p_kind not in ('profile','dog','track','ops','session-dog-link')
 or p_operation is null or p_operation not in ('put','remove')
 or p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text)>200000 then
  raise exception 'Invalid persistence command' using errcode='22023';
 end if;
 if not exists (select 1 from public.coaching_remote_users where id=p_owner and enabled=true) then
  raise exception 'Pilot account not enabled' using errcode='42501';
 end if;
 fingerprint := encode(sha256(convert_to(jsonb_build_object('kind',p_kind,'id',p_id,'expected',p_expected,'operation',p_operation,'payload',p_payload)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('v2-command:'||p_owner::text||':'||p_command::text,0));
 select * into prior from public.v2_personal_commands where owner_id=p_owner and command_id=p_command;
 if found then
  if prior.fingerprint<>fingerprint then raise exception 'Command reused' using errcode='40001'; end if;
  return prior.accepted_record;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('v2-record:'||p_owner::text||':'||p_kind||':'||p_id::text,0));
 select * into current_record from public.v2_personal_records where owner_id=p_owner and kind=p_kind and id=p_id for update;
 if coalesce(current_record.revision,0)<>p_expected then raise exception 'Revision conflict' using errcode='40001'; end if;
 if p_operation='put' and p_kind in ('profile','track','ops','session-dog-link') then
  dog_ref := nullif(case when p_kind='profile' then p_payload->>'primary_dog_id' else p_payload->>'dogId' end,'')::uuid;
  if dog_ref is not null then
   select deleted_at into dog_deleted from public.v2_personal_records where owner_id=p_owner and kind='dog' and id=dog_ref for share;
   if not found or dog_deleted is not null then raise exception 'Dog unavailable' using errcode='40001'; end if;
  end if;
 end if;
 if p_operation='remove' and current_record.id is null then raise exception 'Record unavailable' using errcode='40001'; end if;
 insert into public.v2_personal_records(owner_id,kind,id,schema_version,revision,payload,updated_at,deleted_at)
 values(p_owner,p_kind,p_id,1,p_expected+1,case when p_operation='remove' then current_record.payload else p_payload end,clock_timestamp(),case when p_operation='remove' then clock_timestamp() else null end)
 on conflict(owner_id,kind,id) do update set revision=excluded.revision,payload=excluded.payload,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at
 returning * into current_record;
 accepted:=jsonb_build_object('schemaVersion',current_record.schema_version,'kind',current_record.kind,'id',current_record.id,'revision',current_record.revision,'payload',current_record.payload,'updatedAt',current_record.updated_at,'deletedAt',current_record.deleted_at);
 insert into public.v2_personal_commands(owner_id,command_id,fingerprint,accepted_record) values(p_owner,p_command,fingerprint,accepted);
 return accepted;
end;
$$;
revoke all on function public.v2_personal_commit(uuid,text,uuid,bigint,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.v2_personal_commit(uuid,text,uuid,bigint,uuid,text,jsonb) to service_role;
