const clone=value=>structuredClone(value);

export function buildScientificDatasetView(dataset,analytics={},anomalies=[],discoveries=[]){
 const sessions=(dataset?.sessions||[]).filter(item=>item.synthetic===true).map(item=>({...clone(item),syntheticLabel:'Données synthétiques / Démonstration'}));
 return{sessions,summary:{total:sessions.length,training:sessions.filter(item=>item.kind==='training').length,operational:sessions.filter(item=>item.kind==='operational').length,benchmarks:sessions.filter(item=>item.benchmark_session).length,blindCandidates:sessions.filter(item=>item.blind_analysis_available).length,anomalies:anomalies.length,discoveries:discoveries.length,period:clone(dataset?.period||null),quality:analytics.averageQuality??null,synthetic:true,label:'Données synthétiques / Démonstration'},seed:dataset?.seed||null,version:'synthetic-2026.10'};
}

export function scientificSessionDetail(session){
 if(!session||session.synthetic!==true)return null;
 return clone({...session,syntheticLabel:'Données synthétiques / Démonstration'});
}
