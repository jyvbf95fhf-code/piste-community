export function buildJumolfRecommendation(discovery){if(!discovery?.recommendation||discovery.priority==='Données insuffisantes')return null;return {id:`recommendation-${discovery.id}`,discovery_id:discovery.id,priority:discovery.priority,title:`${discovery.priority} — ${discovery.conditions}`,summary:discovery.recommendation.summary,justification:discovery.observation,synthetic:true};}

// Account recommendations are descriptive rules, never synthetic discoveries.
export function buildAccountJumolfRecommendation({dogId,key,title,objective,evidence=[],protocol,limits=[],personalized=true}={}){
 return {id:`account:${dogId}:${key}`,dogId,key,title,objective,evidence:structuredClone(evidence),protocol:structuredClone(protocol),limits:[...limits],personalized,dataOrigin:'account',synthetic:false,status:'suggested',linkedSessions:[]};
}
