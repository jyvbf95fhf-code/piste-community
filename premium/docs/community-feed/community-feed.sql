begin;
set local lock_timeout='5s';
create or replace function public.community_member_search(p_actor uuid,p_query text) returns jsonb language plpgsql security invoker set search_path='' as $$
begin perform private.community_require_actor(p_actor);
 if p_query is null or length(trim(p_query))<2 or length(p_query)>100 then raise exception 'query_invalid' using errcode='22023';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'displayName',q.display_name)) from (select u.id,u.display_name from public.coaching_remote_users u join auth.users a on a.id=u.id where u.enabled and u.id<>p_actor and (strpos(lower(u.display_name),lower(trim(p_query)))>0 or (a.email_confirmed_at is not null and lower(a.email)=lower(trim(p_query)))) order by u.display_name,u.id limit 30) q),'[]'::jsonb);end $$;
grant select(id,email,email_confirmed_at) on auth.users to service_role;
alter function public.community_contact_command(uuid,uuid,text,uuid,bigint,boolean,boolean) rename to community_contact_command_v1;
create function public.community_contact_command(p_actor uuid,p_peer uuid,p_action text,p_command_id uuid,p_expected bigint,p_live boolean default true,p_coaching boolean default true) returns jsonb language plpgsql security invoker set search_path='' as $$
declare answer jsonb;withdrawn_actor boolean;withdrawn_peer boolean;replayed boolean;begin
 perform private.community_require_actor(p_actor);perform pg_advisory_xact_lock(hashtextextended('community-actor:'||p_actor::text,0));perform private.community_lock_pair(p_actor,p_peer);
 select exists(select 1 from public.community_social_commands where command_id=p_command_id) into replayed;
 select exists(select 1 from public.ops_live_access where owner_id=p_actor and user_id=p_peer and scope='habitual' and revoked_at is not null) into withdrawn_actor;
 select exists(select 1 from public.ops_live_access where owner_id=p_peer and user_id=p_actor and scope='habitual' and revoked_at is not null) into withdrawn_peer;
 answer:=public.community_contact_command_v1(p_actor,p_peer,p_action,p_command_id,p_expected,p_live,p_coaching);
 if not replayed and p_action='accept-contact' and exists(select 1 from public.community_friendships where user_low=least(p_actor,p_peer) and user_high=greatest(p_actor,p_peer) and status='accepted') then
 update public.community_social_edges set following=true where (owner_id=p_actor and peer_id=p_peer) or (owner_id=p_peer and peer_id=p_actor);
 if withdrawn_actor then perform public.ops_live_habitual(p_actor,p_actor,p_peer,false);end if;
 if withdrawn_peer then perform public.ops_live_habitual(p_peer,p_peer,p_actor,false);end if;
 end if;return answer;end $$;
revoke all on function public.community_contact_command(uuid,uuid,text,uuid,bigint,boolean,boolean) from public,anon,authenticated;
grant execute on function public.community_contact_command(uuid,uuid,text,uuid,bigint,boolean,boolean) to service_role;
create table public.community_feed_posts(id uuid primary key,author_id uuid not null references public.coaching_remote_users(id) on delete cascade,publication jsonb not null,created_at timestamptz not null default now(),deleted boolean not null default false);
create table public.community_feed_likes(post_id uuid references public.community_feed_posts(id) on delete cascade,actor_id uuid references public.coaching_remote_users(id) on delete cascade,primary key(post_id,actor_id));
create table public.community_feed_comments(id uuid primary key,post_id uuid not null references public.community_feed_posts(id) on delete cascade,author_id uuid not null references public.coaching_remote_users(id) on delete cascade,text text not null check(length(text) between 1 and 600),created_at timestamptz not null default now());
create table public.community_feed_marks(post_id uuid references public.community_feed_posts(id) on delete cascade,actor_id uuid references public.coaching_remote_users(id) on delete cascade,kind text check(kind in ('hide-post','report-post')),primary key(post_id,actor_id,kind));
create table public.community_feed_commands(actor_id uuid references public.coaching_remote_users(id) on delete cascade,command_id uuid,fingerprint jsonb not null,primary key(actor_id,command_id));
create index community_feed_chronology on public.community_feed_posts(created_at desc,id);
create index community_feed_author on public.community_feed_posts(author_id,created_at desc);
create index community_feed_like_actor on public.community_feed_likes(actor_id);
create index community_feed_comment_post on public.community_feed_comments(post_id,created_at);
create index community_feed_comment_author on public.community_feed_comments(author_id);
create index community_feed_mark_actor on public.community_feed_marks(actor_id);
alter table public.community_feed_posts enable row level security;
alter table public.community_feed_likes enable row level security;
alter table public.community_feed_comments enable row level security;
alter table public.community_feed_marks enable row level security;
alter table public.community_feed_commands enable row level security;
revoke all on public.community_feed_posts,public.community_feed_likes,public.community_feed_comments,public.community_feed_marks,public.community_feed_commands from public,anon,authenticated;
grant select,insert,update on public.community_feed_posts to service_role;
grant select,insert,delete on public.community_feed_likes,public.community_feed_comments to service_role;
grant select,insert on public.community_feed_marks,public.community_feed_commands to service_role;
create function private.community_feed_visible(p_actor uuid,p_post uuid) returns boolean language sql security invoker set search_path='' as $$
 select exists(select 1 from public.community_feed_posts p join public.coaching_remote_users u on u.id=p.author_id and u.enabled where p.id=p_post and not p.deleted and (p.author_id=p_actor or p.publication->>'visibility'='community' or (p.publication->>'visibility'='contacts' and exists(select 1 from public.community_friendships f where f.user_low=least(p_actor,p.author_id) and f.user_high=greatest(p_actor,p.author_id) and f.status='accepted'))) and not exists(select 1 from public.community_feed_marks m where m.post_id=p.id and m.actor_id=p_actor and m.kind='hide-post')) $$;
create function public.community_feed_snapshot(p_actor uuid,p_post_id uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare posts jsonb;profiles jsonb;begin perform private.community_require_actor(p_actor);
 select coalesce(jsonb_agg(q.post order by q.created_at desc,q.id),'[]'::jsonb) into posts from (select p.id,p.created_at,p.publication||jsonb_build_object('id',p.id,'authorId',p.author_id,'createdAt',p.created_at,'likes',coalesce((select jsonb_agg(l.actor_id order by l.actor_id) from public.community_feed_likes l where l.post_id=p.id),'[]'::jsonb),'comments',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'authorId',c.author_id,'text',c.text,'createdAt',c.created_at) order by c.created_at,c.id) from public.community_feed_comments c where c.post_id=p.id),'[]'::jsonb)) post from public.community_feed_posts p where (p_post_id is null or p.id=p_post_id) and private.community_feed_visible(p_actor,p.id) order by p.created_at desc,p.id limit 100) q;
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'displayName',u.display_name,'dogIds','[]'::jsonb)),'[]'::jsonb) into profiles from public.coaching_remote_users u where u.enabled and (u.id=p_actor or u.id in(select (j->>'authorId')::uuid from jsonb_array_elements(posts) j union select (c->>'authorId')::uuid from jsonb_array_elements(posts) j cross join lateral jsonb_array_elements(j->'comments') c));
 return jsonb_build_object('version',1,'ownerId',p_actor,'posts',posts,'profiles',profiles);end $$;
create function public.community_feed_command(p_actor uuid,p_body jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare action text:=p_body->>'action';cid uuid:=(p_body->>'commandId')::uuid;pid uuid;prior jsonb;pub jsonb;answer jsonb;begin
 perform private.community_require_actor(p_actor);if cid is null or octet_length(p_body::text)>262144 then raise exception 'invalid_command' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('community-feed:'||p_actor::text,0));
 select fingerprint into prior from public.community_feed_commands where actor_id=p_actor and command_id=cid;
 if found then if prior<>p_body then raise exception 'command_reused' using errcode='22023';end if;answer:=public.community_feed_snapshot(p_actor);if action='create-post' then answer:=answer||jsonb_build_object('createdPostId',cid);end if;return answer;end if;
 if action='create-post' then
 pub:=p_body->'post';if pub is null or pub->>'visibility' not in ('private','contacts','community') or length(pub->>'text')>1200 or (coalesce(pub->>'text','')='' and coalesce(pub->'attachment','null'::jsonb)='null'::jsonb) or pub->>'type' not in ('text','session','track') then raise exception 'invalid_post' using errcode='22023';end if;
 if (select count(*) from public.community_feed_posts where author_id=p_actor and created_at>now()-interval '1 hour')>=60 then raise exception 'post_rate_limit' using errcode='54000';end if;
 insert into public.community_feed_posts values(cid,p_actor,pub,now(),false);
 elsif action='update-profile' then
 if length(trim(p_body->>'displayName')) not between 1 and 80 then raise exception 'invalid_name' using errcode='22023';end if;update public.coaching_remote_users set display_name=trim(p_body->>'displayName') where id=p_actor;
 else
 pid:=(p_body->>'postId')::uuid;perform 1 from public.community_feed_posts where id=pid for update;
 if not private.community_feed_visible(p_actor,pid) then raise exception 'post_denied' using errcode='42501';end if;
 case action
 when 'toggle-like' then if exists(select 1 from public.community_feed_likes where post_id=pid and actor_id=p_actor) then delete from public.community_feed_likes where post_id=pid and actor_id=p_actor;else insert into public.community_feed_likes values(pid,p_actor);end if;
 when 'add-comment' then if length(trim(p_body->>'text')) not between 1 and 600 then raise exception 'invalid_comment' using errcode='22023';end if;insert into public.community_feed_comments values(gen_random_uuid(),pid,p_actor,p_body->>'text',now());
 when 'delete-comment' then delete from public.community_feed_comments where id=(p_body->>'commentId')::uuid and post_id=pid and author_id=p_actor;if not found then raise exception 'comment_denied' using errcode='42501';end if;
 when 'delete-post' then update public.community_feed_posts set deleted=true where id=pid and author_id=p_actor;if not found then raise exception 'post_denied' using errcode='42501';end if;
 when 'hide-post','report-post' then insert into public.community_feed_marks values(pid,p_actor,action) on conflict do nothing;
 else raise exception 'invalid_action' using errcode='22023';end case;end if;
 insert into public.community_feed_commands values(p_actor,cid,p_body);answer:=public.community_feed_snapshot(p_actor);if action='create-post' then answer:=answer||jsonb_build_object('createdPostId',cid);end if;return answer;end $$;
revoke all on function private.community_feed_visible(uuid,uuid),public.community_feed_snapshot(uuid,uuid),public.community_feed_command(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.community_feed_visible(uuid,uuid),public.community_feed_snapshot(uuid,uuid),public.community_feed_command(uuid,jsonb) to service_role;
commit;
