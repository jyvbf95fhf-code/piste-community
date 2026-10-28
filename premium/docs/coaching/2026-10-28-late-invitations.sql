-- Retain role, recipient and friendship checks. Only joinable phases change.
create or replace function private.community_check_targeted_invite() returns trigger
language plpgsql security invoker set search_path='' as $$
declare s public.coaching_remote_sessions;begin
 if new.recipient_id is not null and (tg_op='INSERT' or (old.consumed_by is null and new.consumed_by is not null)) then
  select * into s from public.coaching_remote_sessions where id=new.session_id;
  if s.id is null or coalesce(s.state->'search'->>'phase','') not in ('PREPARATION','LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING','SEARCH_FINISHED','DEBRIEF','ARCHIVED')
   or not exists(select 1 from jsonb_array_elements(coalesce(s.state->'pendingTeam','[]'::jsonb)) a where a->>'recipientId'=new.recipient_id::text and a->>'role'=new.role and a->>'status'='pending')
  then raise exception 'targeted_invite_denied' using errcode='42501';end if;
  perform private.community_assert_coaching_contact(s.owner_id,new.recipient_id);
 end if;
 return new;
end $$;
