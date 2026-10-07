export function buildJumolfProgress(discovery,events=[]){
 const sessions=events.filter(item=>item.type==='targeted_session_completed'&&item.discovery_id===discovery?.id),reviews=events.filter(item=>item.type==='hypothesis_reviewed'&&item.discovery_id===discovery?.id),targetedCount=sessions.length,measurement=sessions.find(item=>Number.isFinite(item.before_value)&&Number.isFinite(item.after_value));
 const supporting=reviews.filter(item=>item.outcome==='concordant').length,contradictory=reviews.filter(item=>item.outcome==='contradictory').length,latest=reviews.at(-1),reviewTrend={improving:'Tendance en amélioration',stable:'Tendance stable',degraded:'Tendance dégradée',fluctuation:'Fluctuation ponctuelle'}[latest?.outcome]||null;
 const status=measurement?classifyJumolfHypothesis({comparableCount:measurement.comparable_sample_count||0,supportingCount:measurement.supporting_count||0,contradictoryCount:measurement.contradictory_count||0,trend:measurement.trend||null}):classifyJumolfHypothesis({comparableCount:reviews.length,supportingCount:supporting,contradictoryCount:contradictory,trend:reviewTrend});
 return {discovery_id:discovery?.id||null,targeted_sessions:targetedCount,before_after:measurement?{status:'Disponible · mesure synthétique liée',before:measurement.before_value,after:measurement.after_value,explanation:'Valeurs fournies avec les séances ciblées comparables.'}:{status:'Données insuffisantes',before:null,after:null,explanation:'Aucune mesure avant / après comparable n’est disponible dans le dataset.'},trend:measurement?.trend||'Données insuffisantes',status,latest_outcome:latest?.outcome||'',review_count:reviews.length,confidence:discovery?.confidence??null,synthetic:true};
}
export function classifyJumolfProgress({before=null,after=null,sampleCount=0}={}){
 if(!Number.isFinite(before)||!Number.isFinite(after)||sampleCount<3)return 'Données insuffisantes';
 if(after<before)return 'Tendance en amélioration';
 if(after>before)return 'Tendance dégradée';
 return 'Tendance stable';
}
export function classifyJumolfHypothesis({comparableCount=0,supportingCount=0,contradictoryCount=0,trend=null}={}){
 if(comparableCount<3)return 'Données insuffisantes';
 if(contradictoryCount>=2&&supportingCount===0)return 'Hypothèse non confirmée';
 if(supportingCount>=3&&contradictoryCount===0)return 'Hypothèse renforcée';
 if(['Tendance en amélioration','Tendance stable','Tendance dégradée'].includes(trend))return trend;
 return 'Fluctuation ponctuelle';
}
