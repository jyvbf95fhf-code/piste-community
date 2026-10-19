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

// Real progression never uses the synthetic improving/degraded classifier above.
export function summarizeAccountJumolfProgress(trends=[]){
 const comparable=trends.filter(t=>t.status==='descriptive'&&t.comparison.status==='comparable');
 return {comparable,stable:comparable.filter(t=>t.direction==='Valeurs identiques'),examine:comparable.filter(t=>t.direction!=='Valeurs identiques'),provisional:trends.filter(t=>t.status==='two_observations'&&t.comparison.status==='comparable')};
}
import {buildRealJumolfProfile} from './jumolf-real-science.mjs';
export function buildAccountJumolfProgress({dogId,rows=[],profile,consents={}}={}){
 if(!consents.session_comparison)return {...summarizeAccountJumolfProgress(),incomparable:[]};
 // Exact context cohorts preserve the comparison engine's strict conditions.
 const groups=new Map();
 for(const row of rows){if(row.kind==='coaching'&&!['normal','simple_blind','full_blind'].includes(row.mode))continue;const key=JSON.stringify([row.kind,row.mode||null,row.terrain||null,row.trackAge?.seconds??row.trackAge?.label??null,row.weather||null,row.wind||null,row.handlerId||null]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const trends=[...groups.values()].filter(g=>g.length>=2).flatMap(g=>buildRealJumolfProfile(dogId,g,{consents}).trends);
 const unknownMode=rows.some(r=>r.kind==='coaching'&&!['normal','simple_blind','full_blind'].includes(r.mode));
 const contextual=(profile?.trends||[]).map(t=>t.kind==='coaching'&&unknownMode?{...t,comparison:{...t.comparison,status:'partially_comparable',label:'Partiellement comparable',reasons:[...t.comparison.reasons,'Mode de visibilité Coaching indisponible sur au moins une séance.']}}:t);
 return {...summarizeAccountJumolfProgress(trends),incomparable:contextual.filter(t=>t.comparison.status!=='comparable')};
}
