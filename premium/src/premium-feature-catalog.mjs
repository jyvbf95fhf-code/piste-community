// V2 product catalog. Labels are informational: never use this module as server authorization.
export const PREMIUM_FEATURES=Object.freeze({
 smart_routing:{label:'Tracé intelligent',tier:'premium',status:'enforced'},
 jumolf:{label:'JUMOLF',tier:'premium',status:'enforced'},
 live_ops_advanced:{label:'Live OPS avancé',tier:'premium',status:'candidate'},
 coaching_advanced:{label:'Coaching avancé',tier:'premium',status:'candidate'},
 analytics_advanced:{label:'Analyses et replay avancés',tier:'premium',status:'candidate'},
 export_advanced:{label:'Exports avancés',tier:'premium',status:'candidate'},
 teams_advanced:{label:'Gestion avancée des équipes',tier:'premium',status:'planned'}
});
export const premiumFeature=(key)=>PREMIUM_FEATURES[key]||null;
export function premiumFeatureBadge(key){
 const feature=premiumFeature(key);
 return feature?.tier==='premium'&&feature.status==='enforced'?'<span class="premium-feature-badge" aria-label="Fonction Premium">✦ Premium</span>':'';
}

// Candidate badges are intentionally not padlocks: server-side authorization is not yet active.
export function premiumRoadmapBadge(key){
 const feature=premiumFeature(key);
 return feature?.tier==='premium'&&feature.status==='candidate'?'<span class="premium-feature-badge" aria-label="Fonction Premium envisagée, accès actuel inchangé">✦ Premium prévu</span>':'';
}
