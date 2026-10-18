-- RETOUR ARRIÈRE LOGIQUE UNIQUEMENT — nécessite une autorisation distincte.
-- 1. Désactiver le fournisseur de contacts dans l’Edge préparée (teamContactsProvider=null).
-- 2. Ce script expire les invitations nominatives non acceptées sans effacer leur historique.
-- 3. Conserver recipient_id, la contrainte et le trigger ; ne pas revenir à une ancienne
--    Edge qui ignore les réservations tant que ces sessions sont encore en préparation.
begin;
update public.coaching_remote_invites
 set expires_at=least(expires_at,now())
 where recipient_id is not null and consumed_by is null;
commit;
