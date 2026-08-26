-- PISTE Community V10.32.1 — quitter une session sans la supprimer
-- À examiner puis exécuter manuellement dans Supabase. Ce fichier n'est pas exécuté par l'application.

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

comment on policy "coaching_members_self_delete" on public.coaching_members is
  'Permet à un participant de quitter une session sans autoriser la suppression de la session ou du membre organisateur.';

