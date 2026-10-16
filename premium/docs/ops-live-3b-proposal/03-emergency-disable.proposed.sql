-- PROPOSITION DE RETRAIT NON DESTRUCTIF, A AUTORISER SEPAREMENT.
-- Premiere etape obligatoire : desactiver l'API OPS Live et son worker de purge.
-- Ne touche aucune table, donnee, policy ou fonction Coaching/Bloc 2.
begin;
revoke all on table public.ops_live_publications, public.ops_live_access,
 public.ops_live_invites, public.ops_live_commands, public.ops_live_points from service_role;
revoke execute on function public.ops_live_purge_expired(integer) from service_role;
revoke execute on function public.ops_live_authorized(uuid,uuid),public.ops_live_validate_metadata(jsonb),
 public.ops_live_commit(uuid,uuid,uuid,bigint,text,jsonb),public.ops_live_habitual(uuid,uuid,uuid,boolean),
 public.ops_live_read(uuid,uuid,bigint,bigint),public.ops_live_list(uuid),public.ops_live_delete(uuid,uuid),
 public.ops_live_prepare(uuid,uuid),public.ops_live_notifications(uuid),public.ops_live_signal_targets(uuid,uuid)
 from service_role;
drop policy if exists ops_live_private_version_signals on realtime.messages;
revoke execute on function private.ops_live_can_listen(text) from authenticated;
commit;
-- Les anciens canaux peuvent rester connectes mais l'API/worker ne doit plus
-- emettre. Aucun contenu GPS n'est diffuse dans les signaux.
-- Pas de DROP TABLE/CASCADE. Une suppression physique est une autre operation.
