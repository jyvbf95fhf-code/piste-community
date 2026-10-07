import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminStore} from '../src/admin-store.mjs';

const owner={user_id:'owner-sebastien'};
const admin={user_id:'admin-demo-01'};
const standard={user_id:'member-standard-01'};
const tick=()=> '2026-10-07T10:00:00.000Z';

test('single store exposes members, codes, scientific roles and append-only audit',()=>{
 const store=createAdminStore({clock:tick});
 const before=store.snapshot(owner);
 assert.ok(before.members.some(row=>row.user_id==='owner-sebastien'));
 assert.ok(before.codes.some(row=>row.code==='PISTE-DEMO-2026'));
 assert.ok(Array.isArray(before.scientific_roles));
 assert.deepEqual(before.audit,[]);
 store.setAccountStatus(owner,'member-free-01','suspended',{confirmed:true,reason:'Test'});
 const after=store.snapshot(owner);
 assert.equal(after.audit.length,1);
 assert.equal(after.audit[0].action,'account_suspended');
 assert.equal(before.audit.length,0);
});

test('store rechecks RBAC and denied commands leave all state untouched',()=>{
 const store=createAdminStore({clock:tick});
 const before=store.snapshot(owner);
 assert.throws(()=>store.setAccountStatus(standard,'member-free-01','suspended',{confirmed:true}),/not_admin/);
 assert.throws(()=>store.setAccountStatus(admin,'owner-sebastien','suspended',{confirmed:true}),/owner_protected/);
 assert.deepEqual(store.snapshot(owner),before);
});

test('Admin can never set or reactivate scientific consent',()=>{
 const store=createAdminStore({clock:tick});
 const before=store.snapshot(owner);
 assert.throws(()=>store.setScientificConsent(owner,'member-contributor-01',{status:'active'}),/consent_owner_only/);
 assert.deepEqual(store.snapshot(owner),before);
});

test('mock suspension blocks the account without deleting its member data',()=>{
 const store=createAdminStore({clock:tick});
 const before=store.getMember(owner,'member-standard-01');
 assert.equal(store.accountIsActive('member-standard-01'),true);
 store.setAccountStatus(owner,'member-standard-01','suspended',{confirmed:true,reason:'Mock test'});
 assert.equal(store.accountIsActive('member-standard-01'),false);
 const after=store.getMember(owner,'member-standard-01');
 assert.equal(after.account_status,'suspended');
 assert.equal(after.user_id,before.user_id);
 assert.equal(after.dog_count,before.dog_count);
});
