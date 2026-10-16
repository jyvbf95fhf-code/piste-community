// Only protected app_metadata, after auth.getUser and the enabled-account check.
const none=()=>({entitlement:'none',source:null,source_id:null,granted_at:null,expires_at:null,revoked_at:null});
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const valid=(r,now)=>r&&date(r.granted_at)&&Date.parse(r.granted_at)<=now&&!r.revoked_at&&!['expired','revoked','inactive'].includes(r.status)&&(!r.expires_at||date(r.expires_at)&&Date.parse(r.expires_at)>now);
const project=r=>({entitlement:r.entitlement,source:r.source,source_id:typeof r.source_id==='string'?r.source_id:null,granted_at:r.granted_at,expires_at:r.expires_at||null,revoked_at:null});
export function projectVerifiedCapabilities(user,profile,now=Date.now()){
 const denied={permissions:{research:false,admin:false,premium:false},admin_role:null,premium_entitlement:null,jumolf_entitlement:none(),subscription:{payment_enabled:false,provider:null,status:'not_configured'}};
 if(!user?.id||user.id!==profile?.id||profile.enabled!==true)return denied;
 const meta=user.app_metadata||{},p=meta.permissions||{},r=meta.jumolf_entitlement;
 const role=['owner_admin','admin','support_admin','readonly_admin'].includes(meta.admin_role)?meta.admin_role:null,owner=role==='owner_admin';
 const paid=meta.premium_entitlement?.entitlement==='premium'&&['premium','admin_grant','access_code'].includes(meta.premium_entitlement.source)&&valid(meta.premium_entitlement,now)?meta.premium_entitlement:null;
 const gift=meta.premium_gift?.entitlement==='premium'&&meta.premium_gift.source==='gift'&&valid(meta.premium_gift,now)?meta.premium_gift:null;
 const best=paid&&gift?(!paid.expires_at||gift.expires_at&&Date.parse(paid.expires_at)>=Date.parse(gift.expires_at)?paid:gift):paid||gift;
 const premium=owner||Boolean(best);
 const research=owner||p.research===true&&!p.research_revoked_at&&(!p.research_expires_at||date(p.research_expires_at)&&Date.parse(p.research_expires_at)>now);
 const premiumRecord=owner?{entitlement:'premium',source:'admin_grant',source_id:'owner_admin',granted_at:date(user.created_at)?user.created_at:new Date(now).toISOString(),expires_at:null,revoked_at:null}:premium?project(best):null;
 const jumolf=premium?{...premiumRecord,source:'premium'}:r&&['premium','admin_grant','access_code'].includes(r.entitlement)&&r.source===r.entitlement&&valid(r,now)?project(r):none();
 return {...denied,permissions:{research,admin:role!==null,premium:Boolean(premium)},admin_role:role,premium_entitlement:premiumRecord,jumolf_entitlement:jumolf};
}
