-- PROPOSITION NON APPLIQUÉE : validation explicite requise.
-- Projet exclusif : shnwqdkiapgcftbnhilh.
-- Préserve les refus de versions obsolètes, l'idempotence, les ACL et toutes les données.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $patch$
declare original text; corrected text;
begin
 original:=pg_get_functiondef('public.coaching_commit(uuid,uuid,uuid,text,bigint,jsonb,text,jsonb)'::regprocedure);
 if md5(original)<>'7211a1c77f74eb0f99c77c213c7f2db4' then
  raise exception 'coaching_commit_definition_changed_review_required';
 end if;
 corrected:=replace(original,
  'raise exception ''version_conflict'' using errcode=''40001''',
  'raise exception ''version_conflict'' using errcode=''PT409''');
 corrected:=replace(corrected,
  'raise exception ''session_exists'' using errcode=''40001''',
  'raise exception ''session_exists'' using errcode=''PT409''');
 if corrected=original or corrected like '%errcode=''40001''%' then
  raise exception 'unexpected_conflict_raise_definition';
 end if;
 execute corrected;
end $patch$;
commit;
