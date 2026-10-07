import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminStore} from '../src/admin-store.mjs';
import {createJumolfStore} from '../src/jumolf-store.mjs';
const owner={user_id:'owner-sebastien'};

test('Admin-created codes are redeemed through the same catalog consumed by JUMOLF',()=>{
 const admin=createAdminStore({clock:()=> '2026-10-07T10:00:00.000Z'});
 const catalog=admin.codeCatalog();
 const record=admin.createCode(owner,{code:'FIELD-ALPHA',max_uses:2,grant_type:'temporary',entitlement_duration_days:30});
 const jumolf=createJumolfStore({entitlement:'none',clock:()=> '2026-10-07T10:00:00.000Z',accessCodeCatalog:catalog,currentUserId:'member-free-01'});
 assert.ok(jumolf.snapshot().access_codes.some(item=>item.id===record.id));
 const result=jumolf.redeemCode('field-alpha');
 assert.equal(result.ok,true);
 assert.equal(admin.snapshot(owner).codes.find(item=>item.id===record.id).uses_count,1);
 assert.equal(admin.getMember(owner,'member-free-01').jumolf_entitlement.source,'access_code');
 assert.equal(jumolf.snapshot().jumolf_enabled,false);
 assert.equal(jumolf.snapshot().jumolf_onboarding_completed,false);
});

test('revoking an Admin code is immediately respected by the JUMOLF redemption flow',()=>{
 const admin=createAdminStore({clock:()=> '2026-10-07T10:00:00.000Z'});
 const record=admin.createCode(owner,{code:'FIELD-BETA',max_uses:1});
 admin.updateCode(owner,record.id,'revoked',{}, {confirmed:true,reason:'Retrait mock'});
 const jumolf=createJumolfStore({accessCodeCatalog:admin.codeCatalog()});
 assert.equal(jumolf.redeemCode('FIELD-BETA').reason,'revoked');
});
