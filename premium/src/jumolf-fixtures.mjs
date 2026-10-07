export const JUMOLF_DEMO_CODES=Object.freeze([
 Object.freeze({id:'code-demo-permanent',code:'PISTE-DEMO-2026',status:'active',created_by:'admin-demo',created_at:'2026-10-01T00:00:00.000Z',expires_at:'2027-01-01T00:00:00.000Z',max_uses:20,uses_count:0,grant_type:'permanent',entitlement_duration_days:null,revoked_at:null,note_admin:'Code fictif de démonstration'}),
 Object.freeze({id:'code-demo-30-days',code:'JUMOLF-30DAYS',status:'active',created_by:'admin-demo',created_at:'2026-10-07T00:00:00.000Z',expires_at:'2026-11-06T00:00:00.000Z',max_uses:20,uses_count:0,grant_type:'temporary',entitlement_duration_days:30,revoked_at:null,note_admin:'Accès temporaire fictif'}),
 Object.freeze({id:'code-demo-expired',code:'JUMOLF-EXPIRED',status:'expired',created_by:'admin-demo',created_at:'2026-09-01T00:00:00.000Z',expires_at:'2026-10-06T00:00:00.000Z',max_uses:20,uses_count:0,grant_type:'temporary',entitlement_duration_days:30,revoked_at:null,note_admin:'Fixture expirée'}),
 Object.freeze({id:'code-demo-revoked',code:'JUMOLF-REVOKED',status:'revoked',created_by:'admin-demo',created_at:'2026-10-01T00:00:00.000Z',expires_at:'2027-01-01T00:00:00.000Z',max_uses:20,uses_count:0,grant_type:'permanent',entitlement_duration_days:null,revoked_at:'2026-10-06T00:00:00.000Z',note_admin:'Fixture révoquée'}),
 Object.freeze({id:'code-demo-limit',code:'JUMOLF-LIMIT',status:'active',created_by:'admin-demo',created_at:'2026-10-01T00:00:00.000Z',expires_at:'2027-01-01T00:00:00.000Z',max_uses:1,uses_count:1,grant_type:'permanent',entitlement_duration_days:null,revoked_at:null,note_admin:'Fixture de quota atteint'})
]);
const accessProfile=(entitlement,source,enabled=false,{expires_at=null,source_id=null}={})=>Object.freeze({entitlement,entitlement_record:Object.freeze({entitlement,granted_at:entitlement==='none'?null:'2026-10-07T00:00:00.000Z',expires_at,source,source_id,revoked_at:null,note:'Profil de démonstration'}),jumolf_enabled:enabled,jumolf_onboarding_completed:enabled});
export const JUMOLF_ACCESS_PROFILES=Object.freeze({
 FREE:accessProfile('none',null),
 PREMIUM:accessProfile('premium','premium',true,{source_id:'premium-demo'}),
 CODE:accessProfile('access_code','access_code',true,{source_id:'code-demo-permanent'}),
 ADMIN:accessProfile('admin_grant','admin_grant',false,{source_id:'admin-grant-demo'}),
 PREMIUM_NON_ACTIVE:accessProfile('premium','premium_simulation',false,{source_id:'premium-demo'}),
 EXPIRED:Object.freeze({...accessProfile('access_code','access_code',true,{source_id:'expired-code-demo',expires_at:'2026-10-06T00:00:00.000Z'}),jumolf_onboarding_completed:true})
});
export const JUMOLF_ENGINE_VERSION='jumolf-mock-1.0.0';
export const JUMOLF_ANALYSIS_VERSION='analysis-mock-1';
