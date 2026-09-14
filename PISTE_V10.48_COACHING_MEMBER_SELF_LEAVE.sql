-- PISTE Community V10.48 — participant quitte sa propre participation
-- Patch déjà appliqué manuellement dans Supabase et validé sur téléphone.
-- Archive du changement appliqué : NE PAS RÉEXÉCUTER pour la release.
-- La session, sa piste, ses messages, ses marqueurs et son débrief restent intacts.

drop policy if exists "coaching_members_self_delete" on public.coaching_members;

create policy "coaching_members_self_delete"
on public.coaching_members
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and not exists (
    select 1
    from public.coaching_sessions s
    where s.id = coaching_members.session_id
      and s.owner_id = (select auth.uid())
  )
);

-- Le trigger conserve ses protections INSERT/UPDATE et autorise seulement
-- l'effacement de la propre ligne d'un participant non-propriétaire.
create or replace function private.guard_people_member_v10423()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  sid uuid;
  version integer;
begin
  sid := case when tg_op = 'DELETE' then old.session_id else new.session_id end;
  select visibility_version into version
  from public.coaching_sessions
  where id = sid;

  if version = 3 then
    if tg_op = 'INSERT'
       and coalesce(current_setting('piste.people_creation', true), 'off') <> 'on' then
      raise exception 'Participants fixés à la création';
    end if;

    if tg_op = 'UPDATE'
       and (new.role is distinct from old.role
         or new.user_id is distinct from old.user_id
         or new.session_id is distinct from old.session_id) then
      raise exception 'Identité et rôle immuables';
    end if;

    if tg_op = 'DELETE'
       and old.role <> 'observer'
       and pg_trigger_depth() = 1 then
      if old.user_id is distinct from (select auth.uid()) then
        raise exception 'Un participant ne peut supprimer que sa propre participation';
      end if;
      if exists (
        select 1
        from public.coaching_sessions s
        where s.id = old.session_id
          and s.owner_id = (select auth.uid())
      ) then
        raise exception 'Le propriétaire doit terminer, annuler ou supprimer la session';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

revoke all on function private.guard_people_member_v10423() from public, anon, authenticated;

-- Le trigger coaching_people_member_guard_v10423 existant est conservé.
