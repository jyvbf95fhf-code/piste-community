import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333',s='44444444-4444-4444-8444-444444444444';
async function setup(){const db=new PGlite();try{await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select null::uuid$$;create schema realtime;create table realtime.messages(extension text);create function realtime.topic() returns text language sql as $$select ''::text$$;create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$select$$;grant usage on schema realtime to service_role;`);await db.exec(await readFile(new URL('../supabase/migrations/20261015054625_coaching_remote_core.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../docs/community-friendships/01-friendships-final.proposed.sql',import.meta.url),'utf8'));for(const id of [a,b,c]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into coaching_remote_users values($1,$2,true,true)',[id,id]);}return db;}catch(e){await db.close();throw e;}}
async function rpc(db,name,args){return (await db.query(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value;}
const command=(db,actor,peer,action,version,enabled=null,id=crypto.randomUUID())=>rpc(db,'community_friendship_command',[actor,peer,action,id,version,enabled]);
const snapshot=(db,actor)=>rpc(db,'community_friendship_snapshot',[actor]);
const contacts=(db,actor)=>rpc(db,'community_coaching_contacts',[actor]);
const enable=db=>db.exec('update private.community_friendship_control set enabled=true');
async function friends(db){await command(db,a,b,'contact-request',-1);await command(db,b,a,'accept-contact',0);await command(db,a,b,'set-contact-permission',1,true);}
test('targeted revocation removes only excess grants, preserves RPC operation, data, RLS and inactive state',async()=>{
 const db=await setup();try{
 await db.exec('grant truncate,trigger,references,maintain on public.community_friendships,public.community_friendship_events to service_role');
 const metadata=async()=> (await db.query(`select jsonb_build_object(
 'functions',(select md5(string_agg(pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')||p.proowner::text,'' order by p.oid)) from pg_proc p where pronamespace in ('public'::regnamespace,'private'::regnamespace) and prokind='f'),
 'tables',(select jsonb_agg(jsonb_build_object('name',oid::regclass::text,'owner',relowner,'rls',relrowsecurity,'force',relforcerowsecurity) order by oid) from pg_class where oid in ('public.community_friendships'::regclass,'public.community_friendship_events'::regclass)),
 'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by policyname),'[]') from pg_policies p where tablename in ('community_friendships','community_friendship_events')),
 'users',(select jsonb_agg(to_jsonb(t) order by id) from coaching_remote_users t),
 'enabled',(select enabled from private.community_friendship_control)
 ) value`)).rows[0].value;
 const privileges=async()=> (await db.query(`select tab,role,priv,has_table_privilege(role,tab,priv) allowed from unnest(array['public.community_friendships','public.community_friendship_events']) tab cross join unnest(array['service_role','anon','authenticated']) role cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES','MAINTAIN']) priv order by tab,role,priv`)).rows;
 const before=await metadata(),rights=await privileges();
 const sql=await readFile(new URL('../docs/community-friendships/04-service-role-privileges.sql',import.meta.url),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
 if(sql)await db.exec(sql);
 const after=await privileges();
 for(let i=0;i<rights.length;i++)assert.deepEqual(after[i],{...rights[i],allowed:rights[i].role==='service_role'&&['TRUNCATE','TRIGGER','REFERENCES'].includes(rights[i].priv)?false:rights[i].allowed});
 assert.deepEqual(await metadata(),before);assert.equal(before.enabled,false);
 await db.exec(sql);assert.deepEqual(await privileges(),after);
 await db.exec('set role service_role');await assert.rejects(snapshot(db,a),/disabled/);await db.exec('reset role');
 // Enable only the disposable local fixture to exercise the unchanged service RPCs.
 await enable(db);await db.exec('set role service_role');await friends(db);assert.equal((await contacts(db,a))[0].id,b);
 assert.equal((await db.query('select count(*)::int n from community_friendship_events')).rows[0].n,3);
 await assert.rejects(db.exec('truncate community_friendship_events'),/permission denied/);
 await assert.rejects(db.exec('update community_friendship_events set action=action'),/permission denied/);
 await db.exec('reset role');
 }finally{await db.close();}
});
