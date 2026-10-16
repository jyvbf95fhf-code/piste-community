const clone=value=>structuredClone(value);

export function buildScientificDatasetView(dataset,analytics={},anomalies=[],discoveries=[]){
 const sessions=(dataset?.sessions||[]).filter(item=>(dataset?.mode==='account'?item.source==='account':item.synthetic===true)).map(item=>({...clone(item),syntheticLabel:dataset?.mode==='account'?'Données réelles du compte':'Données synthétiques / Démonstration'}));
 return{sessions,summary:{total:sessions.length,training:sessions.filter(item=>item.kind==='training').length,operational:sessions.filter(item=>item.kind==='operational').length,benchmarks:sessions.filter(item=>item.benchmark_session).length,blindCandidates:sessions.filter(item=>item.blind_analysis_available).length,anomalies:anomalies.length,discoveries:discoveries.length,period:clone(dataset?.period||null),quality:dataset?.mode==='account'?(sessions.length?Math.round(sessions.reduce((n,s)=>n+(s.quality?.score||0),0)/sessions.length):null):analytics.averageQuality??null,synthetic:dataset?.mode!=='account',label:dataset?.mode==='account'?'Données réelles du compte':'Données synthétiques / Démonstration'},seed:dataset?.seed||null,version:dataset?.mode==='account'?'account-sessions-1':'synthetic-2026.10'};
}

export function scientificSessionDetail(session){
 if(!session||session.synthetic!==true&&session.source!=='account')return null;
 return clone({...session,syntheticLabel:session.source==='account'?'Données réelles du compte':'Données synthétiques / Démonstration'});
}
