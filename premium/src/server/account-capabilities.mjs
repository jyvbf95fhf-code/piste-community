// Called only after auth.getUser(token) and the existing enabled-account check.
// user_metadata and request-body permissions are deliberately ignored.
const none=()=>({entitlement:'none',source:null,source_id:null,granted_at:null,expires_at:null,revoked_at:null});
const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function projectVerifiedCapabilities(user,profile,now=Date.now()){
 const denied={permissions:{research:false,admin:false},jumolf_entitlement:none()};
 if(!user?.id||user.id!==profile?.id||profile.enabled!==true)return denied;
 const meta=user.app_metadata||{},p=meta.permissions||{},r=meta.jumolf_entitlement;
 const research=p.research===true&&!p.research_revoked_at&&(!p.research_expires_at||date(p.research_expires_at)&&Date.parse(p.research_expires_at)>now);
 const valid=r&&['premium','admin_grant','access_code'].includes(r.entitlement)&&r.source===r.entitlement&&date(r.granted_at)&&Date.parse(r.granted_at)<=now&&!r.revoked_at&&!['expired','revoked','inactive'].includes(r.status)&&(!r.expires_at||date(r.expires_at)&&Date.parse(r.expires_at)>now);
 return {permissions:{research,admin:false},jumolf_entitlement:valid?{entitlement:r.entitlement,source:r.source,source_id:typeof r.source_id==='string'?r.source_id:null,granted_at:r.granted_at,expires_at:r.expires_at||null,revoked_at:null}:none()};
}
