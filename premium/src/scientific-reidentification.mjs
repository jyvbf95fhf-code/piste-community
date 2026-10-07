export const SCIENTIFIC_CROSS_DOG_MIN_SESSIONS=5;
export const SCIENTIFIC_CROSS_DOG_MIN_DOGS=3;
export const SCIENTIFIC_DOG_PROFILE_MIN_SESSIONS=5;

export function assessReidentificationRisk({sessionCount=0,dogCount=0,criterionPrecision='coarse',opsRarity=false,environmentUniqueness=false,timestampPrecision='coarse',locationPrecision='coarse',assessmentType='cross_dog'}={}) {
  const requiredSessions=assessmentType==='dog_profile'?SCIENTIFIC_DOG_PROFILE_MIN_SESSIONS:SCIENTIFIC_CROSS_DOG_MIN_SESSIONS;
  const insufficient=sessionCount<requiredSessions||(assessmentType!=='dog_profile'&&dogCount<SCIENTIFIC_CROSS_DOG_MIN_DOGS);
  if(insufficient)return {allowed:false,action:'suppress',reason:'Échantillon insuffisant pour afficher ce résultat.'};
  const highRisk=opsRarity||environmentUniqueness||timestampPrecision==='exact'||locationPrecision==='exact'||criterionPrecision==='exact';
  if(highRisk)return {allowed:false,action:'suppress',reason:'Résultat masqué : groupe trop petit'};
  const needsCoarsening=criterionPrecision==='medium'||timestampPrecision==='hour'||locationPrecision==='medium';
  return {allowed:true,action:needsCoarsening?'coarsen':'show',reason:needsCoarsening?'Critères regroupés pour limiter le risque de ré-identification.':'Seuils de démonstration satisfaits.'};
}
