const ratings=new Set(['relevant','partially_relevant','not_relevant']);
const errors={false_positive:'Faux positif',false_negative:'Faux négatif',hypothesis_too_strong:'Hypothèse trop forte',confidence_excessive:'Confiance excessive',insufficient_data_misread:'Données insuffisantes mal interprétées',context_error:'Erreur de contexte',unexplained_anomaly:'Anomalie non expliquée'};
export function appendScientificFeedback(store,input={}){
 if(!ratings.has(input.rating))throw new Error('Évaluation scientifique invalide.');
 return store.appendEvaluation({sessionId:input.sessionId||null,runId:input.runId||null,hypothesis:String(input.hypothesis||''),rating:input.rating,comment:String(input.comment||''),synthetic:true});
}
export function classifyScientificError(input={}){
 const type=Object.hasOwn(errors,input.type)?input.type:'context_error';
 return{id:input.id||null,type,label:errors[type],sessionId:input.sessionId||null,runId:input.runId||null,annotationId:input.annotationId||null,comment:String(input.comment||''),synthetic:true};
}
export function appendScientificError(store,input={}){return store.appendErrorCase(classifyScientificError(input));}
export const scientificErrorTypes=Object.freeze({...errors});
