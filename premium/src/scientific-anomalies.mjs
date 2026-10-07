export function explainScientificAnomaly(anomaly,session,baseline=[]){
 if(!session||session.synthetic!==true)return null;
 const values=baseline.filter(row=>row.synthetic&&row.id!==session.id).map(row=>row.confidence).filter(Number.isFinite).sort((a,b)=>a-b),median=values.length?values[Math.floor(values.length/2)]:null;
 return{id:anomaly?.id||`${session.id}-signal`,sessionId:session.id,title:anomaly?.title||'Signal détecté',reason:anomaly?.why||'Raison non renseignée',context:{kind:session.kind,environment:session.environment?.label||'Indisponible',trackAge:session.trackAge?.label||'Non renseigné',pollution:session.scentPollution?.level||'Indisponible',confidence:session.confidence??null,profileMedianConfidence:median},severity:session.confidence<=35||session.ruptures>=5?'élevée':session.quality?.level==='low'?'modérée':'à examiner',quality:session.quality?.level||'insufficient',synthetic:true};
}
