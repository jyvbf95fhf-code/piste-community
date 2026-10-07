const DAY=86400000;
export function buildAdminEntitlement({kind,durationDays=null,expiresAt=null,source='admin_grant',sourceId=null,now=new Date().toISOString(),note='',action='granted'}){
 if(!['premium','jumolf'].includes(kind))throw new Error('invalid_entitlement_kind');
 if(durationDays!==null&&(!Number.isFinite(durationDays)||durationDays<=0))throw new Error('invalid_duration');
 if(expiresAt&&(!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=Date.parse(now)))throw new Error('invalid_expiration');
 if(durationDays!==null&&expiresAt)throw new Error('conflicting_expiration');
 return {entitlement:kind==='premium'?'premium':'admin_grant',source,source_id:sourceId,granted_at:now,expires_at:expiresAt|| (durationDays===null?null:new Date(Date.parse(now)+durationDays*DAY).toISOString()),revoked_at:null,note:String(note),action};
}
export function premiumDurationDays(duration){const values={permanent:null,'7_days':7,'30_days':30,'1_year':365};if(Object.hasOwn(values,duration))return values[duration];if(duration==='custom')return 'custom';throw new Error('invalid_premium_duration');}
export function grantAdminEntitlement(store,actor,id,kind,record,options={}){return kind==='premium'?store.grantPremium(actor,id,record,options):store.grantJumolf(actor,id,record,options);}
export function revokeAdminEntitlement(store,actor,id,kind,options={}){return kind==='premium'?store.revokePremium(actor,id,options):store.revokeJumolf(actor,id,options);}
export function listAdminEntitlementHistory(store,actor){return store.snapshot(actor).entitlement_history;}
