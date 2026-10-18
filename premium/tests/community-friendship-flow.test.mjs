import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333',s='44444444-4444-4444-8444-444444444444';
async function setup(){const db=new PGlite();try{await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select null::uuid$$;create schema realtime;create table realtime.messages(extension text);create function realtime.topic() returns text language sql as $$select ''::text$$;create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$select$$;grant usage on schema realtime to service_role;`);await db.exec(await readFile(new URL('../supabase/migrations/20261015054625_coaching_remote_core.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../docs/community-friendships/01-friendships-final.proposed.sql',import.meta.url),'utf8'));for(const id of [a,b,c]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into coaching_remote_users values($1,$2,true,true)',[id,id]);}await db.exec(await readFile(new URL('../docs/community-friendships/04-service-role-privileges.sql',import.meta.url),'utf8'));return db;}catch(e){await db.close();throw e;}}
import {createCoachingHandler} from '../src/server/coaching-http.mjs';
import {createCommunityFriendshipService} from '../src/server/community-friendship-service.mjs';
import {createCommunityFriendships} from '../src/community-friendships.mjs';
import {createCommunityStore} from '../src/community-store.mjs';
import {createSharedCoachingWizard} from '../src/coaching-shared-wizard.mjs';
import {loadCoachingTeamCatalogue} from '../src/coaching-team.mjs';
// Disposable PostgreSQL and real application/HTTP/RPC adapters, not external Auth accounts.
test('two local accounts confirm friendship, prepare roles and accept a bound Coaching invitation',async()=>{
 const db=await setup();let actor=a;try{
 const result=async fn=>{try{return {data:await fn()};}catch(e){return {error:{code:e.code,message:e.message}};}};
 const admin={rpc:(name,args)=>result(async()=>{await db.exec('set role service_role');try{return (await db.query(`select public.${name}(${Object.keys(args).map((k,i)=>k+'=> $'+(i+1)).join(',')}) value`,Object.values(args))).rows[0].value;}finally{await db.exec('reset role');}}),from(table){
  assert.ok(['coaching_remote_users','coaching_remote_sessions','coaching_remote_commands','coaching_remote_invites'].includes(table));const filters=[];let columns='*';
  return {select(c){columns=c;return this;},eq(k,v){filters.push([k,v]);return this;},maybeSingle(){return result(async()=>{return (await db.query(`select ${columns} from public.${table} where ${filters.map(([k],i)=>k+'=$'+(i+1)).join(' and ')}`,filters.map(([,v])=>v))).rows[0]||null;});},insert(row){return result(async()=>{const keys=Object.keys(row);await db.query(`insert into public.${table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(row));return null;});}};
 }};
 const friendships=createCommunityFriendshipService(admin),handler=createCoachingHandler({admin,authClient:{auth:{getUser:async()=>({data:{user:{id:actor}}})}},friendshipsEnabled:true,teamContactsProvider:id=>friendships.contacts(id)});
 const call=async body=>{const response=await handler(new Request('https://qa.invalid',{method:'POST',headers:{Authorization:'Bearer local-qa'},body:JSON.stringify(body)}));const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error),{status:response.status});return value;};
 const local=id=>createCommunityStore({viewerId:id,profiles:[{id,displayName:'QA'}],posts:[],contacts:[],contactRequests:[],follows:[],notifications:[]});
 const ca=createCommunityFriendships({ownerId:a,baseStore:local(a),call,getOwnerId:()=>actor}),cb=createCommunityFriendships({ownerId:b,baseStore:local(b),call,getOwnerId:()=>actor});
 await assert.rejects(ca.refresh(),e=>e.status===503);
 await db.exec('update private.community_friendship_control set enabled=true'); // LOCAL fixture only.
 await ca.refresh();await ca.store.sendContactRequest(b);assert.equal(ca.store.getContacts().length,0);
 actor=b;await cb.refresh();const received=cb.store.getContactRequests().received;assert.equal(received.length,1);await cb.store.acceptContactRequest(received[0].id);assert.equal(cb.store.getContacts().length,1);
 actor=a;await ca.refresh();await ca.store.setContactPermission(b,'quick_coaching_invite_authorized',true);
 const catalogue=await loadCoachingTeamCatalogue(call);assert.equal(catalogue.contacts[0].id,b);
 const wizard=createSharedCoachingWizard({profile:{id:a,name:'QA',coaching_team_version:1},dogs:[{id:'n',name:'Nox'}]});wizard.setTeamCatalogue(catalogue);wizard.dispatch({field:'mode',value:'normal'});wizard.dispatch({field:'traceType',value:'direct'});wizard.dispatch({field:'teamRole',value:{role:'traceur',person:b}});
 const created=await call({operation:'create',sessionId:s,commandId:crypto.randomUUID(),payload:wizard.dispatch({action:'create'}).payload});assert.equal(created.projection.pendingTeam[0].status,'pending');
 actor=b;await assert.rejects(call({operation:'read',sessionId:s}),e=>e.status===403);
 actor=a;const invite=await call({operation:'invite',sessionId:s,role:'traceur',recipientId:b});
 actor=c;await assert.rejects(call({operation:'join',sessionId:s,token:invite.token,commandId:crypto.randomUUID()}),e=>e.status===403);
 actor=b;const joined=await call({operation:'join',sessionId:s,token:invite.token,commandId:crypto.randomUUID()});assert.equal(joined.projection.pendingTeam,undefined);assert.equal(joined.projection.role,'traceur');actor=a;assert.equal((await call({operation:'read',sessionId:s})).projection.pendingTeam[0].status,'accepted');
 assert.equal((await db.query('select state from coaching_remote_sessions where id=$1',[s])).rows[0].state.members.length,2);
 }finally{await db.close();}
});
