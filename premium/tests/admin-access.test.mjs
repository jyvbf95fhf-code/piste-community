import test from 'node:test';
import assert from 'node:assert/strict';
import {adminActorFor,adminAccessFor,canAdminAct,assertAdminAction} from '../src/admin-access.mjs';

test('owner role is resolved only from the stable mock user id',()=>{
 const actor={user_id:'owner-sebastien',name:'Renamed',email:'other@example.test',role:'Member'};
 assert.equal(adminActorFor(actor).role,'owner_admin');
 assert.equal(adminAccessFor(actor).allowed,true);
 assert.equal(adminActorFor({...actor,user_id:'member-standard-01'}).role,null);
});

test('unknown actors and standard members are denied regardless of display fields',()=>{
 for(const actor of [{user_id:'member-standard-01',name:'Sébastien',permissions:{admin:true}},{name:'Owner',email:'owner@example.test',permissions:{admin:true}}]){
  assert.equal(adminAccessFor(actor).allowed,false);
 }
});

test('RBAC separates read-only, support, admin, and owner actions',()=>{
 assert.equal(canAdminAct({user_id:'admin-demo-01'},'grant_jumolf').allowed,true);
 assert.equal(canAdminAct({user_id:'support-demo-01'},'grant_jumolf').allowed,false);
 assert.equal(canAdminAct({user_id:'readonly-demo-01'},'read').allowed,true);
 assert.equal(canAdminAct({user_id:'readonly-demo-01'},'suspend_account').allowed,false);
 assert.equal(canAdminAct({user_id:'admin-demo-01'},'manage_admin_roles').allowed,false);
 assert.equal(canAdminAct({user_id:'owner-sebastien'},'manage_admin_roles').allowed,true);
});

test('lower roles cannot mutate or downgrade owner_admin',()=>{
 for(const action of ['suspend_account','delete_account','change_admin_role','grant_premium']){
  assert.equal(canAdminAct({user_id:'admin-demo-01'},action,{targetId:'owner-sebastien'}).allowed,false);
 }
 assert.throws(()=>assertAdminAction({user_id:'support-demo-01'},'change_admin_role',{targetId:'owner-sebastien'}),/owner_protected/);
});

test('mock auth attaches stable internal ids to expert and standard profiles',async()=>{
 const {createMockAuth}=await import('../src/mock-auth.mjs');
 const auth=createMockAuth();
 assert.equal(auth.signIn().user.user_id,'owner-sebastien');
 auth.signOut();
 assert.equal(auth.signUp({firstName:'Sébastien'}).user.user_id,'member-standard-01');
});
