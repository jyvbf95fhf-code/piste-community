import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveAdminRoute} from '../src/admin-routes.mjs';
import {createAdminController} from '../src/admin-controller.mjs';
import {createAdminStore} from '../src/admin-store.mjs';
import {AdminScreen} from '../src/admin-screen.mjs';
const owner={user_id:'owner-sebastien'},standard={user_id:'member-standard-01'},readonly={user_id:'readonly-demo-01'};

test('all admin paths resolve through one route parser and unknown admin paths stay gated',()=>{
 assert.equal(resolveAdminRoute('/admin/member/member-free-01').type,'member');
 assert.equal(resolveAdminRoute('/admin/errors').type,'errors');
 assert.equal(resolveAdminRoute('/admin/not-a-route').type,'unknown');
 assert.equal(resolveAdminRoute('/admin/member/%E0%A4%A').type,'unknown');
 assert.equal(resolveAdminRoute('/community'),null);
});

test('controller denies standard users and returns a restricted screen without admin data',()=>{
 const controller=createAdminController({store:createAdminStore(),actor:()=>standard});
 const result=controller.view('/admin');
 assert.equal(result.access.allowed,false);
 assert.match(controller.screen('/admin'),/Accès restreint/);
 assert.doesNotMatch(controller.screen('/admin'),/Membres inscrits/);
});

test('controller independently enforces RBAC and store also rejects unauthorized mutation',()=>{
 const store=createAdminStore({clock:()=> '2026-10-07T10:00:00.000Z'});
 const controller=createAdminController({store,actor:()=>readonly});
 assert.throws(()=>controller.perform('suspend-account',{targetId:'member-free-01',confirmed:true,reason:'test'}),/forbidden_action/);
 assert.equal(store.getMember(owner,'member-free-01').account_status,'active');
});

test('read-only and support screens omit controls outside their RBAC grants',()=>{
 const store=createAdminStore();
 const readOnly=createAdminController({store,actor:()=>readonly});
 const admin=createAdminController({store,actor:()=>({user_id:'support-demo-01'})});
 assert.doesNotMatch(readOnly.screen('/admin/codes'),/data-admin-form="create-code"/);
 assert.doesNotMatch(readOnly.screen('/admin/member/member-free-01'),/data-admin-form="grant-premium"|data-admin-form="suspend-account"/);
 assert.match(admin.screen('/admin/member/member-free-01'),/data-admin-form="suspend-account"/);
 assert.doesNotMatch(admin.screen('/admin/member/member-free-01'),/data-admin-form="grant-premium"/);
});

test('only owner mock can render Admin-role controls',()=>{
 const store=createAdminStore();
 const ownerController=createAdminController({store,actor:()=>owner});
 const adminController=createAdminController({store,actor:()=>({user_id:'admin-demo-01'})});
 assert.match(ownerController.screen('/admin/member/member-free-01'),/data-admin-form="set-admin-role"/);
 assert.doesNotMatch(adminController.screen('/admin/member/member-free-01'),/data-admin-form="set-admin-role"/);
});

test('Admin screen exposes every route domain and labels simulated readonly data',()=>{
 const controller=createAdminController({store:createAdminStore(),actor:()=>owner});
 for(const path of ['/admin','/admin/members','/admin/member/member-free-01','/admin/premium','/admin/codes','/admin/scientific','/admin/services','/admin/deployments','/admin/errors','/admin/audit']){
  const screen=AdminScreen({route:resolveAdminRoute(path),model:controller.view(path)});
  assert.match(screen,/Simulation Admin/);
 }
});
