-- ACTIVATION DISTINCTE : accord explicite nécessaire, après SQL + Edge + raccordement UI validés.
-- Cible V2 shnwqdkiapgcftbnhilh uniquement.
begin;
update private.community_friendship_control set enabled=true where singleton;
commit;
