import {JUMOLF_ENTITLEMENTS,cloneJumolf} from './jumolf-model.mjs';

export function isJumolfEligible(entitlement){return ['premium','admin_grant','access_code'].includes(entitlement);}

export function resolveJumolfAccess(input={},now=new Date().toISOString()){
 const record=input.entitlement_record||input.entitlementRecord||{};
 const entitlement=normalizeEntitlement(input.entitlement??input.jumolf_entitlement??record.entitlement);
 const revokedAt=record.revoked_at||null,expiresAt=record.expires_at||null;
 const lockedReason=!isJumolfEligible(entitlement)?'none':revokedAt||record.status==='revoked'?'revoked':record.status==='expired'||expiresAt&&Date.parse(now)>=Date.parse(expiresAt)?'expired':null;
 const entitlementValid=lockedReason===null,enabled=entitlementValid&&Boolean(input.jumolf_enabled);
 const source=record.source||(entitlement==='none'?null:entitlement);
 const originLabel={premium:'Inclus avec Premium',premium_simulation:'Premium · simulation mock',admin_grant:'Accès accordé par l’administrateur',access_code:'Accès via code'}[source]||null;
 return {entitlement_valid:entitlementValid,entitlement,entitlement_source:source,origin_label:originLabel||'Aucun accès',expires_at:expiresAt,jumolf_enabled:enabled,needs_onboarding:entitlementValid&&!Boolean(input.jumolf_onboarding_completed??input.onboarding_completed),locked_reason:lockedReason};
}

export function createAccessCode({id=null,code,created_by,created_at,expires_at=null,max_uses=null,grant_type='permanent',entitlement_duration_days=null,note_admin='',revoked_at=null,uses_count=0}){
 if(!String(code||'').trim())throw new Error('Code d’accès requis.');
 if(!created_by||!created_at)throw new Error('Origine et date de création requises.');
 if(!['temporary','permanent'].includes(grant_type))throw new Error('Type d’accès inconnu.');
 return {id:id||`code-${String(code).trim().toLocaleLowerCase()}`,code:String(code).trim(),status:revoked_at?'revoked':'active',created_by,created_at,expires_at,max_uses,uses_count,grant_type,entitlement_duration_days,revoked_at,note_admin};
}

export function redeemAccessCode(record,input,now=new Date().toISOString()){
 const code=cloneJumolf(record);
 if(!code||String(input||'').trim().toLocaleUpperCase()!==String(code.code).toLocaleUpperCase())return {ok:false,reason:'invalid',code};
 if(code.revoked_at||code.status==='revoked')return {ok:false,reason:'revoked',code};
 if(code.status==='inactive')return {ok:false,reason:'inactive',code};
 if(code.status==='expired'||code.expires_at&&Date.parse(now)>=Date.parse(code.expires_at))return {ok:false,reason:'expired',code};
 if(Number.isFinite(code.max_uses)&&code.uses_count>=code.max_uses)return {ok:false,reason:'exhausted',code};
 code.uses_count+=1;
 const grantExpiry=Number.isFinite(code.entitlement_duration_days)?new Date(Date.parse(now)+code.entitlement_duration_days*86400000).toISOString():null;
 return {ok:true,reason:null,code,entitlement:'access_code',entitlement_record:{entitlement:'access_code',granted_at:now,expires_at:grantExpiry,source:'access_code',source_id:code.id,revoked_at:null,note:code.note_admin||''}};
}

export const normalizeEntitlement=value=>JUMOLF_ENTITLEMENTS.includes(value)?value:'none';
