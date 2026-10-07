import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminStore} from '../src/admin-store.mjs';
import {searchAdminMembers,requestMemberDeletion} from '../src/admin-members.mjs';
import {buildAdminEntitlement,grantAdminEntitlement,revokeAdminEntitlement} from '../src/admin-entitlements.mjs';
import {createAdminCode,changeAdminCode,createAdminCodeBatch} from '../src/admin-codes.mjs';
import {scientificGovernanceSummary,trySetMemberResearchConsent,excludeScientificSession,assignScientificRole} from '../src/admin-scientific-governance.mjs';
import {getAdminServiceSummary,adminServices} from '../src/admin-services.mjs';
import {listAdminDeployments} from '../src/admin-deployments.mjs';
import {filterAdminErrors} from '../src/admin-errors.mjs';
const owner={user_id:'owner-sebastien'},admin={user_id:'admin-demo-01'},support={user_id:'support-demo-01'},readonly={user_id:'readonly-demo-01'};
const clock=()=> '2026-10-07T10:00:00.000Z';

test('member search filters mock members and deletion requests are distinct confirmed operations',()=>{
 const store=createAdminStore({clock});
 assert.equal(searchAdminMembers(store,owner,{query:'member-free-01'})[0].user_id,'member-free-01');
 assert.throws(()=>requestMemberDeletion(store,owner,'member-free-01','personal_data',{confirmed:false,reason:'test'}),/confirmation_required/);
 const request=requestMemberDeletion(store,owner,'member-free-01','personal_data',{confirmed:true,reason:'Requested in mock'});
 assert.equal(request.operation,'personal_data');
 assert.equal(store.getMember(owner,'member-free-01').account_status,'active');
});

test('entitlement helpers preserve origin and never activate JUMOLF',()=>{
 const store=createAdminStore({clock});
 const record=buildAdminEntitlement({kind:'jumolf',durationDays:30,source:'admin_grant',sourceId:'grant-test',now:clock()});
 grantAdminEntitlement(store,owner,'member-free-01','jumolf',record);
 const member=store.getMember(owner,'member-free-01');
 assert.equal(member.jumolf_entitlement.source,'admin_grant');
 assert.equal(member.jumolf_enabled,false);
 assert.equal(member.jumolf_entitlement.expires_at,'2026-11-06T10:00:00.000Z');
 assert.throws(()=>revokeAdminEntitlement(store,owner,'member-free-01','jumolf',{confirmed:false,reason:'test'}),/confirmation_required/);
});

test('Admin code domain supports creation, batch generation and revocation through one store',()=>{
 const store=createAdminStore({clock});
 const code=createAdminCode(store,owner,{code:'NEW-ONE',max_uses:2});
 assert.equal(store.codeCatalog().list().find(item=>item.id===code.id).code,'NEW-ONE');
 const batch=createAdminCodeBatch(store,owner,{prefix:'BETA',count:3,max_uses:5});
 assert.equal(batch.length,3);
 const revoked=changeAdminCode(store,owner,code.id,'revoked',{}, {confirmed:true,reason:'Test revoke'});
 assert.equal(revoked.status,'revoked');
 assert.throws(()=>createAdminCode(store,owner,{code:'TEMP-WITHOUT-DURATION',max_uses:1,grant_type:'temporary'}),/temporary_duration_required/);
 const temp=createAdminCode(store,owner,{code:'TEMP-OK',max_uses:1,grant_type:'temporary',entitlement_duration_days:7});
 assert.equal(temp.grant_type,'temporary');
});

test('scientific admin tools summarize but cannot change consent, and role grants are auditable',()=>{
 const store=createAdminStore({clock});
 assert.ok(scientificGovernanceSummary(store,owner).contributors>=1);
 assert.throws(()=>trySetMemberResearchConsent(store,owner,'member-contributor-01',{training_sessions:true}),/consent_owner_only/);
 assert.throws(()=>excludeScientificSession(store,support,'SCI-1',{confirmed:true,reason:'sensitive'}),/forbidden_action/);
 const role=assignScientificRole(store,admin,'member-free-01','researcher',{confirmed:true,reason:'Mock access'});
 assert.equal(role.role,'researcher');
 assert.equal(store.snapshot(owner).audit.at(-1).action,'scientific_role_granted');
 assert.equal(store.snapshot(owner).scientific_role_history.at(-1).action,'granted');
});

test('service, deployment and error views are local read-only Simulation Admin projections',()=>{
 assert.match(getAdminServiceSummary().label,/Simulation Admin/);
 assert.ok(adminServices.length>=8);
 assert.ok(listAdminDeployments().every(row=>row.read_only===true));
 assert.ok(filterAdminErrors({severity:'error'}).every(row=>row.severity==='error'));
 assert.equal(Object.hasOwn(adminServices[0],'mutate'),false);
 assert.equal(Object.hasOwn(readonly,'user_id'),true);
});
