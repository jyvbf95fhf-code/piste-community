import test from 'node:test';
import assert from 'node:assert/strict';
import {isJumolfEligible, createAccessCode, redeemAccessCode, resolveJumolfAccess} from '../src/jumolf-entitlement.mjs';
import {jumolfConsentKeys, setJumolfConsent} from '../src/jumolf-consent.mjs';
import {createJumolfStore} from '../src/jumolf-store.mjs';
import {jumolfOnboardingSteps} from '../src/jumolf-onboarding.mjs';

test('premium, admin grant and access code are eligible while none is locked',()=>{
 for(const entitlement of ['premium','admin_grant','access_code'])assert.equal(isJumolfEligible(entitlement),true);
 assert.equal(isJumolfEligible('none'),false);
});

test('access resolver distinguishes entitlement validity, activation, onboarding, expiry and revocation',()=>{
 const common={jumolf_enabled:false,onboarding_completed:false,now:'2026-10-07T10:00:00.000Z'};
 assert.deepEqual(resolveJumolfAccess({...common,entitlement:'none'}),{entitlement_valid:false,entitlement:'none',entitlement_source:null,origin_label:'Aucun accès',expires_at:null,jumolf_enabled:false,needs_onboarding:false,locked_reason:'none'});
 const code=resolveJumolfAccess({...common,entitlement:'access_code',entitlement_record:{entitlement:'access_code',source:'access_code',granted_at:'2026-10-01T00:00:00.000Z',expires_at:null,revoked_at:null}});
 assert.equal(code.entitlement_valid,true);assert.equal(code.origin_label,'Accès via code');assert.equal(code.needs_onboarding,true);
 assert.equal(resolveJumolfAccess({...common,entitlement:'premium',entitlement_record:{entitlement:'premium',source:'premium',expires_at:'2026-10-07T09:59:59.000Z'},now:common.now}).locked_reason,'expired');
 assert.equal(resolveJumolfAccess({...common,entitlement:'admin_grant',entitlement_record:{entitlement:'admin_grant',source:'admin_grant',revoked_at:'2026-10-07T09:00:00.000Z'}}).locked_reason,'revoked');
});

test('entitlement does not activate JUMOLF and activation has an explicit timestamp',()=>{
 const store=createJumolfStore({entitlement:'premium',clock:()=> '2026-10-07T08:00:00.000Z'});
 assert.equal(store.snapshot().jumolf_enabled,false);
 store.activate();
 assert.equal(store.snapshot().jumolf_enabled,true);
 assert.equal(store.snapshot().jumolf_enabled_at,'2026-10-07T08:00:00.000Z');
});

test('consent keys remain independent and reject unknown keys',()=>{
 assert.deepEqual(jumolfConsentKeys,['gps','weather','dog_history','ai_analysis','session_comparison']);
 const initial={};
 const next=setJumolfConsent(initial,'weather',true);
 assert.equal(next.weather,true);
 assert.equal(next.gps,false);
 assert.throws(()=>setJumolfConsent(next,'all',true),/consentement/i);
});

test('mock access profiles change only entitlement and activation, preserving analyses and consents',()=>{
 const store=createJumolfStore({entitlement:'none',clock:()=> '2026-10-07T08:00:00.000Z'});
 store.setConsent('weather',true);store.addAnalysis({id:'kept-analysis'});
 store.applyDemoProfile('PREMIUM_NON_ACTIVE');
 assert.equal(store.snapshot().jumolf_entitlement,'premium');assert.equal(store.snapshot().jumolf_enabled,false);
 assert.equal(store.snapshot().consents.weather,true);assert.equal(store.snapshot().analysis_runs.length,1);
 store.applyDemoProfile('ADMIN');assert.equal(store.snapshot().jumolf_entitlement,'admin_grant');
 assert.equal(store.snapshot().entitlement_record.source,'admin_grant');
});

test('valid demo code creates a sourced entitlement without activating JUMOLF',()=>{
 const codes=[createAccessCode({id:'code-a',code:'DEMO',created_by:'admin-demo',created_at:'2026-10-01T00:00:00.000Z',grant_type:'temporary',entitlement_duration_days:30})];
 const store=createJumolfStore({entitlement:'none',clock:()=> '2026-10-07T08:00:00.000Z',accessCodes:codes});
 const result=store.redeemCode('demo');
 assert.equal(result.ok,true);assert.equal(store.snapshot().jumolf_enabled,false);
 assert.equal(store.snapshot().entitlement_record.source,'access_code');assert.equal(store.snapshot().entitlement_record.source_id,'code-a');
 assert.equal(store.snapshot().entitlement_record.expires_at,'2026-11-06T08:00:00.000Z');
});

test('onboarding is four short stages and can be replayed after completion',()=>{
 assert.equal(jumolfOnboardingSteps.length,4);
 const store=createJumolfStore();
 store.completeOnboarding();
 assert.equal(store.snapshot().jumolf_onboarding_completed,true);
 store.resetOnboarding();
 assert.equal(store.snapshot().jumolf_onboarding_completed,false);
});

test('deactivation suspends JUMOLF but preserves appended analyses',()=>{
 const store=createJumolfStore({entitlement:'premium'});
 store.activate();
 store.addAnalysis({id:'analysis-1',engineVersion:'mock-v1'});
 store.deactivate();
 assert.equal(store.snapshot().jumolf_enabled,false);
 assert.equal(store.snapshot().analysis_runs.length,1);
});

test('access codes enforce expiry, revocation and use limits',()=>{
 const valid=createAccessCode({code:'FIELD-7',created_by:'admin-demo',created_at:'2026-10-01T00:00:00.000Z',max_uses:1,grant_type:'permanent'});
 const redeemed=redeemAccessCode(valid,'FIELD-7','2026-10-07T00:00:00.000Z');
 assert.equal(redeemed.ok,true);
 assert.equal(redeemed.code.uses_count,1);
 assert.equal(redeemAccessCode(redeemed.code,'FIELD-7','2026-10-07T00:00:00.000Z').ok,false);
 assert.equal(redeemAccessCode({...valid,expires_at:'2026-10-02T00:00:00.000Z'},'FIELD-7','2026-10-07T00:00:00.000Z').reason,'expired');
 assert.equal(redeemAccessCode({...valid,revoked_at:'2026-10-03T00:00:00.000Z'},'FIELD-7','2026-10-07T00:00:00.000Z').reason,'revoked');
});

test('access resolver locks expired entitlements but preserves stored analysis history',()=>{
 const store=createJumolfStore({entitlement:'premium',clock:()=> '2026-10-07T10:00:00.000Z'});
 store.activate();store.completeOnboarding();store.addAnalysis({id:'historic'});
 store.setEntitlementRecord({entitlement:'access_code',source:'access_code',granted_at:'2026-10-01T00:00:00.000Z',expires_at:'2026-10-02T00:00:00.000Z',revoked_at:null});
 assert.equal(resolveJumolfAccess({...store.snapshot(),now:'2026-10-07T10:00:00.000Z'}).locked_reason,'expired');
 assert.equal(store.snapshot().analysis_runs.length,1);assert.equal(store.snapshot().jumolf_enabled,true);
});

test('store rejects activation when not entitled and does not partially mutate',()=>{
 const store=createJumolfStore({entitlement:'none'});
 assert.throws(()=>store.activate(),/premium/i);
 assert.equal(store.snapshot().jumolf_enabled,false);
});
