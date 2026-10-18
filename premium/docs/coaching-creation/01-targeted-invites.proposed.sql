-- PROPOSITION UNIQUEMENT — ne pas appliquer sans accord explicite.
-- Cible exclusive : Supabase V2 shnwqdkiapgcftbnhilh.
-- Complément additif ; aucune modification de coaching_commit, Auth ou des politiques existantes.
begin;
do $$ begin
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='coaching_remote_invites' and c.relrowsecurity) then
  raise exception 'coaching_invites_RLS_required';
 end if;
 if has_table_privilege('anon','public.coaching_remote_invites','INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','public.coaching_remote_invites','INSERT,UPDATE,DELETE') then
  raise exception 'unexpected_client_write_grants';
 end if;
end $$;
alter table public.coaching_remote_invites
 add column recipient_id uuid references public.coaching_remote_users(id),
 add constraint coaching_invite_recipient_consumption check(recipient_id is null or consumed_by is null or consumed_by=recipient_id);
create index coaching_remote_invites_recipient on public.coaching_remote_invites(session_id,recipient_id) where recipient_id is not null and consumed_by is null;
create function private.coaching_keep_invite_recipient() returns trigger
 language plpgsql security invoker set search_path='' as $$
begin
 if old.recipient_id is not null and new.recipient_id is distinct from old.recipient_id then
  raise exception 'invite_recipient_immutable' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function private.coaching_keep_invite_recipient() from public,anon,authenticated;
create trigger coaching_keep_invite_recipient before update on public.coaching_remote_invites
 for each row execute function private.coaching_keep_invite_recipient();
commit;
