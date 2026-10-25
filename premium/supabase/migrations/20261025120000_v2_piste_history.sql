-- Additive V2-only history maintenance. Existing table ACLs and policies unchanged.
create schema if not exists private;
create table public.v2_history_hidden (
 owner_id uuid not null references auth.users(id),
 item_key text not null check(length(item_key) between 3 and 240),
 hidden_at timestamptz not null default now(), primary key(owner_id,item_key)
);
alter table public.v2_history_hidden enable row level security;
revoke all on public.v2_history_hidden from public,anon,authenticated;
grant select,insert,delete on public.v2_history_hidden to service_role;
create table private.v2_history_backups (
 id bigint generated always as identity primary key,
 owner_id uuid not null, item_key text not null, snapshot jsonb not null,
 saved_at timestamptz not null default now()
);
alter table private.v2_history_backups enable row level security;
revoke all on private.v2_history_backups from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert on private.v2_history_backups to service_role;
grant usage,select on sequence private.v2_history_backups_id_seq to service_role;

create function public.v2_history_action(p_actor uuid,p_key text,p_action text,p_expected bigint,p_force boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
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
   if p_expected is null or p_expected<>s.version then raise exception 'Session modifiée : actualisez avant de réessayer.' using errcode='40001';end if;
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
   if p_expected is null or p_expected<>r.revision then raise exception 'Dossier modifié : actualisez avant de réessayer.' using errcode='40001';end if;
   insert into private.v2_history_backups(owner_id,item_key,snapshot) values(p_actor,p_key,jsonb_build_object('record',to_jsonb(r),'commands',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.v2_personal_commands x where owner_id=p_actor and accepted_record->>'kind'=domain and accepted_record->>'id'=target)));
   delete from public.v2_personal_commands where owner_id=p_actor and accepted_record->>'kind'=domain and accepted_record->>'id'=target;
   delete from public.v2_personal_records where owner_id=p_actor and kind=domain and id=target_id;
  end if;
 end if;
 insert into public.v2_history_hidden(owner_id,item_key) values(p_actor,p_key) on conflict do nothing;
 return jsonb_build_object('status',case when p_action='hide' then 'hidden' else 'deleted' end,'key',p_key,'forced',p_force);
end;
$$;
revoke all on function public.v2_history_action(uuid,text,text,bigint,boolean) from public,anon,authenticated;
grant execute on function public.v2_history_action(uuid,text,text,bigint,boolean) to service_role;
-- Personal record DELETE was previously unused; confined to the trusted invoker above.
grant delete on public.v2_personal_records, public.v2_personal_commands to service_role;

-- Tombstones are the restricted backup keys. Serialize creation with deletion so
-- a lost-ack/offline create retry cannot recreate an ID after permanent deletion.
create function private.v2_history_prevent_resurrection() returns trigger
language plpgsql security invoker set search_path='' as $$
declare domain text; key text; lock_key text;
begin
 if tg_table_name='coaching_remote_sessions' then
  domain:='coaching';key:='coaching:'||new.id::text;lock_key:='v2-history:'||key;
 else
  domain:=new.kind;
  if domain not in ('ops','track','session-dog-link') then return new;end if;
  if domain='session-dog-link' then
   perform pg_advisory_xact_lock(hashtextextended('v2-history:coaching:'||(new.payload->>'sessionId'),0));
   if exists(select 1 from private.v2_history_backups where item_key='coaching:'||(new.payload->>'sessionId')) then raise exception 'Session définitivement supprimée.' using errcode='40001';end if;
   return new;
  end if;
  key:=domain||':'||new.id::text;lock_key:='v2-history:'||new.owner_id::text||':'||key;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(lock_key,0));
 if exists(select 1 from private.v2_history_backups where item_key=key and (domain='coaching' or owner_id=new.owner_id)) then raise exception 'Dossier définitivement supprimé : ancien envoi refusé.' using errcode='40001';end if;
 return new;
end;
$$;
revoke all on function private.v2_history_prevent_resurrection() from public,anon,authenticated;
grant execute on function private.v2_history_prevent_resurrection() to service_role;
create trigger v2_history_session_no_resurrection before insert on public.coaching_remote_sessions for each row execute function private.v2_history_prevent_resurrection();
create trigger v2_history_record_no_resurrection before insert on public.v2_personal_records for each row execute function private.v2_history_prevent_resurrection();
