begin;

-- Lecture des seules activites explicitement partagees avec un ami accepte.
drop policy if exists pistes_friends_select on public.pistes;
create policy pistes_friends_select on public.pistes
for select to authenticated
using (
  visibility = 'friends'
  and private.are_friends((select auth.uid()), owner_id)
);

drop policy if exists entrainements_friends_select on public.entrainements;
create policy entrainements_friends_select on public.entrainements
for select to authenticated
using (
  visibility = 'friends'
  and private.are_friends((select auth.uid()), owner_id)
);

-- La fiche chien complete reste privee. Cette RPC ne renvoie que les champs
-- necessaires au fil d'activite et seulement pour une activite partagee.
create or replace function private.friend_dog_cards(dog_ids uuid[])
returns table(id uuid, owner_id uuid, alias text, photo_path text)
language sql
stable
security definer
set search_path = ''
as $function$
  select d.id, d.owner_id, d.alias, d.photo_path
  from public.dogs d
  where auth.uid() is not null
    and d.id = any(coalesce(dog_ids, array[]::uuid[]))
    and private.are_friends(auth.uid(), d.owner_id)
    and (
      exists (
        select 1 from public.pistes p
        where p.dog_id=d.id and p.owner_id=d.owner_id and p.visibility='friends'
      )
      or exists (
        select 1 from public.entrainements e
        where e.dog_id=d.id and e.owner_id=d.owner_id and e.visibility='friends'
      )
    );
$function$;

create or replace function public.get_friend_dog_cards(dog_ids uuid[])
returns table(id uuid, owner_id uuid, alias text, photo_path text)
language sql
stable
set search_path = ''
as $function$
  select * from private.friend_dog_cards(dog_ids);
$function$;

revoke execute on function public.get_friend_dog_cards(uuid[]) from public, anon;
grant execute on function public.get_friend_dog_cards(uuid[]) to authenticated;
revoke execute on function private.friend_dog_cards(uuid[]) from public, anon;
grant execute on function private.friend_dog_cards(uuid[]) to authenticated;

commit;
