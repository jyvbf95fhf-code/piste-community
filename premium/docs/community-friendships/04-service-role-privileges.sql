-- Autorisé uniquement sur V2 shnwqdkiapgcftbnhilh après vérification des ACL.
-- Aucun changement des droits par défaut, rôles, propriétaires, RLS ou activation.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
revoke truncate, trigger, references
 on table public.community_friendships, public.community_friendship_events
 from service_role;
commit;
