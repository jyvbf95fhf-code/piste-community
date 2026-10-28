-- Development database only, requires three existing enabled pilot profiles. All writes roll back.
begin;
create temporary table social_qa_accounts as select id from public.coaching_remote_users where enabled order by id limit 3;
grant select on social_qa_accounts to service_role;
set local role service_role;
do $$ declare ids uuid[];a uuid;b uuid;r jsonb;v bigint;begin
 select array_agg(id order by id) into ids from social_qa_accounts;
 if cardinality(ids)<>3 then raise exception 'three existing profiles required';end if;
 a:=ids[1];b:=ids[2];
 select version into v from public.community_friendships where user_low=least(a,b) and user_high=greatest(a,b);
 perform public.community_social_command(a,b,'follow',gen_random_uuid(),coalesce(v,-1));
 r:=public.community_social_snapshot(a);
 if not (r->'following' @> jsonb_build_array(b)) then raise exception 'follow persistence';end if;
 perform public.community_social_command(a,b,'unfollow',gen_random_uuid(),coalesce(v,-1));
 if public.community_social_snapshot(a)->'following' @> jsonb_build_array(b) then raise exception 'unfollow persistence';end if;
 if has_table_privilege('authenticated','public.community_social_edges','SELECT') or has_function_privilege('authenticated','public.community_live_sessions(uuid,uuid)','EXECUTE') then raise exception 'raw access exposed';end if;
 if exists(select 1 from jsonb_array_elements(public.community_live_sessions(ids[3])) s where (s->>'owner_id')::uuid<>ids[3] and not exists(select 1 from public.community_friendships f where f.status='accepted' and f.user_low=least(ids[3],(s->>'owner_id')::uuid) and f.user_high=greatest(ids[3],(s->>'owner_id')::uuid))) then raise exception 'stranger session';end if;
end $$;
rollback;
