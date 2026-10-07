const normalize=weights=>{
 const total=weights.reduce((sum,item)=>sum+item.weight,0)||1;
 let remaining=100;
 return weights.map((item,index)=>{
  const value=index===weights.length-1?remaining:Math.round(item.weight/total*100);
  remaining-=value;
  return {...item,relative_weight_percent:value};
 });
};
const levelFor=(quality,weight)=>quality==='high'&&weight>=60?'medium':quality==='insufficient'?'low':weight>=60?'medium':'low';

export function interpretJumolfMock({source={},quality={level:'insufficient',missingInputs:[]}}={}){
 const eventTypes=(source.events||[]).map(event=>String(event.type||'').toLocaleLowerCase('fr'));
 const hasTrace=Array.isArray(source.trace)&&source.trace.length>1;
 const hasReference=Array.isArray(source.referenceTrace)&&source.referenceTrace.length>1;
 const weights=[
  {id:'main-plume',title:'Travail compatible avec le panache principal',weight:40+(hasTrace?12:0)+(hasReference?10:0),explanation:'Cette hypothèse décrit une compatibilité, pas une confirmation du mécanisme olfactif.',supporting_factors:[...(hasTrace?['Une trace source est disponible.']:[]),...(hasReference?['Une référence de tracé est disponible.']:[])],limiting_factors:[]},
  {id:'odor-pollution',title:'Pollution olfactive possible',weight:24+(eventTypes.some(type=>type.includes('indice'))?8:0),explanation:'Une perturbation environnementale peut être envisagée si les observations source la documentent.',supporting_factors:eventTypes.some(type=>type.includes('indice'))?['Un événement terrain source est enregistré.']:[],limiting_factors:[]},
  {id:'track-break',title:'Rupture de trace possible',weight:18+(eventTypes.some(type=>type.includes('rupture'))?18:0),explanation:'Une rupture est une hypothèse parmi d’autres et ne prouve pas une perte de piste.',supporting_factors:eventTypes.some(type=>type.includes('rupture'))?['Un événement de rupture figure dans la source.']:[],limiting_factors:[]}
 ];
 const normalized=normalize(weights);
 return normalized.map(item=>{
  const limitingFactors=[...(quality.missingInputs||[]).slice(0,4).map(key=>`${key} indisponible`),...(item.supporting_factors.length?[]:['Aucun facteur direct ne soutient cette hypothèse dans les données disponibles.'])];
  const level=levelFor(quality.level,item.relative_weight_percent);
  return {id:item.id,title:item.title,relative_weight_percent:item.relative_weight_percent,confidence:{level,label:level==='high'?'Confiance élevée':level==='medium'?'Confiance moyenne':'Confiance faible',explanation:'Niveau indicatif du modèle mock ; ce poids n’est pas une probabilité calibrée.'},explanation:item.explanation,supporting_factors:item.supporting_factors,limiting_factors:limitingFactors};
 });
}

export function detectJumolfSignals(source={}){
 const signals=[];
 const metrics=source.metrics||{};
 const distance=metrics.distanceM,duration=metrics.durationSeconds;
 if(Number.isFinite(distance)&&Number.isFinite(duration)&&duration>0&&distance/duration>3){
  signals.push({id:'speed-demo-threshold',label:'Signal détecté',description:'Vitesse inhabituelle par rapport au seuil de démonstration.',provenance:'calculated',limit:'Seuil mock non étalonné ; aucune conclusion sur le chien.'});
 }
 const longBreak=(source.events||[]).some(event=>String(event.type||'').toLocaleLowerCase('fr').includes('rupture')&&Number.isFinite(event.durationSeconds)&&event.durationSeconds>=600);
 if(longBreak)signals.push({id:'long-break',label:'Signal détecté',description:'Une rupture longue est présente dans les événements source.',provenance:'manual',limit:'La durée source ne démontre pas une perte de piste.'});
 return signals;
}
