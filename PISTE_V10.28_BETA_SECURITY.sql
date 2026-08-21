begin;

-- V10.28 — passage du verrou mono-utilisateur a une isolation multicomptes.
-- Toutes les ecritures restent liees a auth.uid().

drop policy if exists owner_only_profiles on public.profiles;
drop policy if exists owner_only_dogs on public.dogs;
drop policy if exists owner_only_pistes on public.pistes;
drop policy if exists owner_only_entrainements on public.entrainements;
drop policy if exists owner_only_goals on public.goals;
drop policy if exists owner_only_training_routes on public.training_routes;
drop policy if exists owner_only_friendships on public.friendships;
drop policy if exists owner_only_activity_likes on public.activity_likes;
drop policy if exists owner_only_activity_comments on public.activity_comments;

-- Profil : le compte voit le sien et l'identite publique minimale des relations
-- auxquelles il participe. Aucune adresse e-mail n'est stockee dans cette table.
create policy profiles_select_related on public.profiles
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.friendships f
    where ((f.requester = (select auth.uid()) and f.addressee = profiles.user_id)
       or  (f.addressee = (select auth.uid()) and f.requester = profiles.user_id))
  )
);
create policy profiles_insert_own on public.profiles
for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy profiles_delete_own on public.profiles
for delete to authenticated using (user_id = (select auth.uid()));

create policy dogs_owner_all on public.dogs
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy pistes_owner_all on public.pistes
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy entrainements_owner_all on public.entrainements
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy goals_owner_all on public.goals
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy training_routes_owner_all on public.training_routes
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy friendships_select_participant on public.friendships
for select to authenticated
using ((select auth.uid()) in (requester, addressee));
create policy friendships_insert_requester on public.friendships
for insert to authenticated
with check (
  requester = (select auth.uid())
  and addressee <> (select auth.uid())
  and status = 'pending'
);
create policy friendships_update_recipient on public.friendships
for update to authenticated
using (addressee = (select auth.uid()) and status = 'pending')
with check (addressee = (select auth.uid()) and status in ('accepted','rejected'));
create policy friendships_delete_participant on public.friendships
for delete to authenticated
using ((select auth.uid()) in (requester, addressee));

create policy activity_likes_select_visible on public.activity_likes
for select to authenticated
using (private.can_view_friend_activity(activity_type, activity_id, (select auth.uid())));
create policy activity_likes_insert_own on public.activity_likes
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_view_friend_activity(activity_type, activity_id, (select auth.uid()))
);
create policy activity_likes_delete_own on public.activity_likes
for delete to authenticated using (user_id = (select auth.uid()));

create policy activity_comments_select_visible on public.activity_comments
for select to authenticated
using (private.can_view_friend_activity(activity_type, activity_id, (select auth.uid())));
create policy activity_comments_insert_own on public.activity_comments
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_view_friend_activity(activity_type, activity_id, (select auth.uid()))
);
create policy activity_comments_update_own on public.activity_comments
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy activity_comments_delete_own on public.activity_comments
for delete to authenticated using (user_id = (select auth.uid()));

-- Retire les droits directs inutiles aux visiteurs non connectes.
revoke all on table public.profiles, public.dogs, public.pistes,
  public.entrainements, public.goals, public.training_routes,
  public.friendships, public.activity_likes, public.activity_comments from anon;

-- Les RPC sociales ne sont utilisables que par une session authentifiee.
revoke execute on function public.invite_friend(text) from public, anon;
revoke execute on function public.accept_friend(uuid) from public, anon;
revoke execute on function public.reject_friend(uuid) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;
revoke execute on function public.get_friends() from public, anon;
revoke execute on function public.get_activity_social(text,uuid) from public, anon;
revoke execute on function public.get_activity_comments(text,uuid) from public, anon;
grant execute on function public.invite_friend(text) to authenticated;
grant execute on function public.accept_friend(uuid) to authenticated;
grant execute on function public.reject_friend(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.get_friends() to authenticated;
grant execute on function public.get_activity_social(text,uuid) to authenticated;
grant execute on function public.get_activity_comments(text,uuid) to authenticated;

create index if not exists dogs_owner_id_idx on public.dogs(owner_id);
create index if not exists activity_comments_user_id_idx on public.activity_comments(user_id);
create index if not exists entrainements_training_route_id_idx on public.entrainements(training_route_id);
create index if not exists friendships_requester_idx on public.friendships(requester);
create index if not exists friendships_addressee_idx on public.friendships(addressee);

-- L'ancien helper contenait un UUID personnel. Il n'est plus utilise.
drop function if exists public.piste_owner_only();

commit;
