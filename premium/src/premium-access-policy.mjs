// V2 shared Premium decision model. Feed this ONLY with trusted server-fetched grants.
// UI consumers may use the result for display; API authorization must fetch fresh grants.
const ACTIVE=new Set(['active','actif']);
export function resolvePremiumAccess({adminRole=null,grants=[],premiumEntitlement=null}={},now=new Date().toISOString()){
 const instant=Date.parse(now);
 if(!Number.isFinite(instant))throw new TypeError('Invalid evaluation date');
 if(adminRole==='owner_admin')return {premium:true,source:'owner_admin',reason:null};
 const candidates=[...grants];
 if(premiumEntitlement&&typeof premiumEntitlement==='object')candidates.push(premiumEntitlement);
 const accepted=candidates.find(g=>{
  if(!g||typeof g!=='object')return false;
  if(g.revoked_at||g.revokedAt)return false;
  if(g.status&&!ACTIVE.has(String(g.status).toLowerCase()))return false;
  const start=g.granted_at||g.starts_at;
  if(start&&(!Number.isFinite(Date.parse(start))||Date.parse(start)>instant))return false;
  const end=g.expires_at;
  if(end&&(!Number.isFinite(Date.parse(end))||Date.parse(end)<=instant))return false;
  return Boolean(g.source&&['premium','gift','admin_grant','access_code','paid'].includes(g.source));
 });
 return accepted?{premium:true,source:accepted.source,reason:null}:{premium:false,source:null,reason:'premium_required'};
}
export function canUsePremiumFeature(featureKey,access){
 const protectedFeatures=new Set(['smart_routing','live_ops_advanced','coaching_advanced','analytics_advanced','export_advanced','teams_advanced']);
 if(!protectedFeatures.has(featureKey))return {allowed:false,reason:'unknown_or_separately_managed'};
 return access?.premium===true?{allowed:true,reason:null}:{allowed:false,reason:'premium_required'};
}
