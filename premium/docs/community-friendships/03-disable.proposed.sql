-- RETOUR ARRIÈRE LOGIQUE DISTINCT : accord explicite nécessaire.
-- Préserve relations, historique, sessions et membres déjà acceptés.
begin;
update private.community_friendship_control set enabled=false where singleton;
update public.coaching_remote_invites set expires_at=least(expires_at,now())
 where recipient_id is not null and consumed_by is null;
commit;
