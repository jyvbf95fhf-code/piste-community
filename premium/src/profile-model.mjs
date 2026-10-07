const enabledCount=object=>Object.values(object||{}).filter(Boolean).length;
export function buildProfileSummary({user={},dogs=[],primaryDogId=null,jumolfAccess={},jumolfState={},consent={},scientificAccess={},adminAccess={},communityProfile=null}={}){
 const dogList=Array.isArray(dogs)?dogs:[],primaryDog=dogList.find(dog=>dog.id===primaryDogId)||null;
 const categories=consent.categories||{},opsCategories=consent.opsCategories||{},enabled=enabledCount(categories),total=Object.keys(categories).length;
 const participation=consent.participationEnabled===true;
 return {
  userId:user.user_id||null,displayName:communityProfile?.displayName||user.name||'Utilisateur',avatar:'initials',role:user.role||'Membre',
  initials:user.initials||String(user.name||'U').slice(0,1),email:user.email||'compte.mock@piste-community.local',
  dogs:dogList,dogCount:dogList.length,primaryDog,
  jumolf:{valid:jumolfAccess.entitlement_valid===true,entitlement:jumolfAccess.entitlement||'none',source:jumolfAccess.origin_label||'Aucun accès',expiresAt:jumolfAccess.expires_at||null,enabled:jumolfAccess.jumolf_enabled===true,onboardingComplete:jumolfState.jumolf_onboarding_completed===true,consents:jumolfState.consents||{}},
  premium:{active:jumolfAccess.entitlement_valid===true&&jumolfAccess.entitlement==='premium',source:jumolfAccess.entitlement==='premium'?jumolfAccess.origin_label||'Inclus avec Premium':null,expiresAt:jumolfAccess.entitlement==='premium'?jumolfAccess.expires_at||null:null},
  research:{enabled:participation,status:!participation?'Désactivée':enabled===total&&total?'Active':'Partielle',enabledCategories:enabled,totalCategories:total,categories,opsCategories,opsShared:enabledCount(opsCategories)>0,eligibleSessions:consent.eligibleSessionCount??null,excludedSessions:consent.excludedSessionCount??null,consentVersion:consent.consentVersion||null},
  scientific:{allowed:scientificAccess.authorized===true,role:scientificAccess.role||null},admin:{allowed:adminAccess.allowed===true}
 };
}
