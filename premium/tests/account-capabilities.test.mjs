import test from 'node:test';import assert from 'node:assert/strict';
import {createPisteAccount} from '../src/piste-account-auth.mjs';
import {scientificAccessFor} from '../src/scientific-access.mjs';
const now=Date.parse('2026-10-16T13:00:00Z'),id='11111111-1111-4111-8111-111111111111';
const grant={entitlement:'admin_grant',source:'admin_grant',source_id:'v2-development',granted_at:'2026-10-16T12:00:00Z',expires_at:null,revoked_at:null};
test('verified profile permissions reach the real account without a name-based gate',async()=>{
 const client={supabaseUrl:'https://shnwqdkiapgcftbnhilh.supabase.co',auth:{getUser:async()=>({data:{user:{id,user_metadata:{research:true}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
 const auth=createPisteAccount({client,loadProfile:async()=>({id,name:'Compte autorisé',permissions:{research:true,admin:true},jumolf_entitlement:grant})});await auth.initialize();const u=auth.getSession().user;
 assert.equal(u.permissions.research,true);assert.equal(u.permissions.admin,false);assert.equal(u.jumolf_entitlement.entitlement,'admin_grant');assert.equal(scientificAccessFor(u).authorized,true);
});
test('server uses protected app metadata only, gated by the existing enabled account',async()=>{
 const {projectVerifiedCapabilities}=await import('../src/server/account-capabilities.mjs');
 const profile={id,enabled:true};const actor={id,app_metadata:{permissions:{research:true},jumolf_entitlement:grant},user_metadata:{permissions:{research:true}}};
 assert.equal(projectVerifiedCapabilities(actor,profile,now).permissions.research,true);
 for(const user of [{id,user_metadata:actor.user_metadata},{...actor,id:'another'},{id,app_metadata:{permissions:{research:'true'}}}])assert.equal(projectVerifiedCapabilities(user,profile,now).permissions.research,false);
 assert.equal(projectVerifiedCapabilities(actor,{...profile,enabled:false},now).jumolf_entitlement.entitlement,'none');
 for(const record of [{...grant,revoked_at:'2026-10-16T12:30:00Z'},{...grant,expires_at:'2026-10-16T12:30:00Z'},{...grant,expires_at:'invalid'},{...grant,granted_at:'2099-01-01T00:00:00Z'}])assert.equal(projectVerifiedCapabilities({...actor,app_metadata:{jumolf_entitlement:record}},profile,now).jumolf_entitlement.entitlement,'none');
});
test('HTTP profile verifies token and enabled row, ignores body claims and separates identities',async()=>{
 const {createCoachingHandler}=await import('../src/server/coaching-http.mjs');
 const handler=(actor,enabled=true)=>createCoachingHandler({clock:()=>now,authClient:{auth:{getUser:async()=>({data:{user:actor}})}},admin:{from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:enabled?{id:actor?.id,display_name:'QA',qa:true,enabled:true}:null})})}});
 const request=(body={},auth=true)=>new Request('https://local.invalid',{method:'POST',headers:{...(auth?{authorization:'Bearer qa'}:{}),'content-type':'application/json'},body:JSON.stringify({operation:'profile',permissions:{research:true},...body})});
 const owner={id,app_metadata:{permissions:{research:true},jumolf_entitlement:grant}};const real=await(await handler(owner)(request())).json();assert.equal(real.permissions.research,true);assert.equal(real.jumolf_entitlement.entitlement,'admin_grant');
 const standard=await(await handler({id:'other',user_metadata:owner.app_metadata})(request())).json();assert.equal(standard.permissions.research,false);assert.equal(standard.jumolf_entitlement.entitlement,'none');assert.equal(standard.id,'other');
 assert.equal((await handler(owner,false)(request())).status,403);assert.equal((await handler(owner)(request({},false))).status,401);
});
test('server entitlement overrides local simulation and honors revocation/expiry',async()=>{
 const {createJumolfStore}=await import('../src/jumolf-store.mjs'),{createJumolfController}=await import('../src/jumolf-controller.mjs');let verified={entitlement:'none'};
 const store=createJumolfStore({entitlement:'premium'});store.activate();store.completeOnboarding();
 const c=createJumolfController({store,demoMode:false,getVerifiedEntitlement:()=>verified,clock:()=>new Date(now).toISOString(),getRawSources:()=>({sessions:[{id:'s',trace:null}]})});
 assert.equal(c.access().entitlement_valid,false);assert.throws(()=>c.analyze('s'),/accès/);store.applyDemoProfile('PREMIUM_NON_ACTIVE');assert.equal(c.access().entitlement_valid,false);assert.throws(()=>c.redeemCode('mock'),/serveur/);
 verified=grant;assert.equal(c.access().entitlement_valid,true);verified={...grant,revoked_at:'2026-10-16T12:30:00Z'};assert.equal(c.access().locked_reason,'revoked');verified={...grant,expires_at:'2026-10-16T12:30:00Z'};assert.equal(c.access().locked_reason,'expired');
});
