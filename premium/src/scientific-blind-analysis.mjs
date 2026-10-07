const allowedEvents=new Set(['Départ','Indice','Rupture','Reprise','Changement de surface','Zone humide','Détour','Zone d’investigation']);
export function blindProjection(session){
 if(!session?.synthetic||session.blind_analysis_available!==true)return null;
 return{sessionId:session.id,date:session.startedAt,trace:(session.trace||[]).map(point=>({sequence:point.sequence,x:point.x,y:point.y,timestamp:point.timestamp})),events:(session.events||[]).filter(item=>allowedEvents.has(item.type)).map(item=>({type:item.type,timestamp:item.timestamp,point:item.point?{...item.point}:null})),metrics:{distanceM:session.metrics?.distanceM??null,durationSeconds:session.metrics?.durationSeconds??null},label:'Données synthétiques · projection aveugle',synthetic:true};
}

export function validateBlindAnalysis(store,session,input={}){
 const projection=blindProjection(session);if(!projection)throw new Error('Session non disponible pour une analyse en aveugle.');
 if(!String(input.hypothesis||'').trim())throw new Error('Une hypothèse est requise.');
 const confidence=Number(input.confidence);if(!Number.isFinite(confidence)||confidence<0||confidence>100)throw new Error('Confiance attendue entre 0 et 100.');
 return store.appendBlindRecord({kind:'validated',sessionId:session.id,status:'validated',initialHypothesis:String(input.hypothesis).trim(),comment:String(input.comment||''),confidence,projection});
}

export function revealBlindAnalysis(store,recordId,session,run){
 const prior=store.snapshot().blindRecords.find(row=>row.id===recordId&&row.kind==='reveal');if(prior)return prior;
 const record=store.snapshot().blindRecords.find(row=>row.id===recordId&&row.kind==='validated');if(!record||record.sessionId!==session?.id)throw new Error('Analyse en aveugle indisponible.');
 return store.appendBlindRecord({kind:'reveal',blindRecordId:recordId,sessionId:session.id,hiddenData:{result:session.result,environment:session.environment?.label||null,trackAge:session.trackAge?.label||null,weather:session.weather?structuredClone(session.weather):null,pollution:session.scentPollution?.level||null},jumolfHypotheses:(run?.outputs?.hypotheses||[]).map(item=>({title:item.title,confidence:item.confidence?.score??null})),synthetic:true});
}
