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

// Descriptive longitudinal reading of the existing authorized A/B analyses.
// Preparation memory is contextual only; it never substitutes for field metrics.
export function buildAccountLongitudinalProgress({dogId,handlerId=null,rows=[],memories=[],progress={},consents={},declarations=[]}={}){
 const ids=new Set(rows.map(r=>r.source.id));
 const sessionId=m=>String(m.sessionId||'').startsWith('coaching:')?m.sessionId:'coaching:'+m.sessionId;
 const worked=memories.filter(m=>m.completed&&m.dogId===dogId&&(!handlerId||m.handlerId===handlerId)&&ids.has(sessionId(m))).filter(m=>rows.some(r=>r.source.id===sessionId(m)&&r.source.handlerId===m.handlerId)).map(m=>({sessionId:sessionId(m),objective:m.objective,skill:m.skill||null,level:m.level||null,handlerId:m.handlerId,storage:'account-local'}));
 const dated=(consents.session_comparison?rows:[]).filter(r=>Number.isFinite(Date.parse(r.source.startedAt))).sort((a,b)=>Date.parse(a.source.startedAt)-Date.parse(b.source.startedAt));
 const metric=(key,planned=false)=>dated.flatMap(r=>{const m=r.analysis.metrics[key];return Number.isFinite(m?.value)&&m.value>=0?[{sessionId:r.source.id,title:r.source.title,date:r.source.startedAt,value:m.value,provenance:m.provenance||'calculated',handlerId:r.source.handlerId||null,kind:r.source.kind,actor:'recording-phone',...(planned?{referenceBasis:'prepared-geographic',method:'nearest-recorded-points'}:{})}]:[];});
 const recurrences=['ruptures','resumptions'].flatMap(key=>{const evidence=dated.filter(r=>r.source.handlerId&&r.source.handlerId===handlerId&&r.analysis.metrics[key]?.value>0);return evidence.length>=2?[{key,label:key==='ruptures'?'Signalements de rupture répétés':'Signalements de reprise répétés',sessions:evidence.map(r=>({sessionId:r.source.id,date:r.source.startedAt,value:r.analysis.metrics[key].value,events:r.analysis.metrics[key].evidence||[]}))}]:[];});
 return {dogId,handlerId,storage:'account-local',declaredGoals:declarations.map(String),sessionCount:rows.length,worked,recurrences,series:{distance:metric('traveled_distance_m'),duration:metric('duration_seconds'),plannedOffset:metric('planned_reference_point_mean_m',true)},comparisons:consents.session_comparison?[...(progress.comparable||[]),...(progress.provisional||[])]:[],missingDates:rows.length-dated.length,limits:['Les séries décrivent le téléphone et les signalements, pas une performance du chien.','Les conditions manquantes ou différentes limitent les comparaisons.','Les objectifs liés proviennent de la mémoire de cet appareil, sans synchronisation cloud.','Une préparation liée ne prouve pas que son protocole a été réalisé.']};
}
