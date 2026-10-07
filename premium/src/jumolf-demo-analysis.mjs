import {analyzeJumolfSnapshot} from './jumolf-analysis-engine.mjs';
import {compareJumolfSessions} from './jumolf-comparison.mjs';
import {buildJumolfDogProfile} from './jumolf-dog-profile.mjs';
import {getJumolfDemoDog,getJumolfDemoSource,listJumolfDemoSources} from './jumolf-demo-fixtures.mjs';

const hypothesisData=[
 {title:'Déplacement probable vers la lisière nord-est',score:78,explanation:'Hypothèse compatible avec la direction du vent, le relief et la progression observée.',supporting:['Météo mock disponible','Chronologie complète','Trace de démonstration continue','Événements fictifs renseignés'],limiting:['Météo simulée','Trace GPS mock','Aucun capteur réel']},
 {title:'Rupture temporaire au croisement du sentier bas',score:61,explanation:'Comportement compatible avec un changement de substrat ou une perturbation olfactive.',supporting:['Événement de rupture présent','Reprise consignée ensuite','Progression de démonstration cohérente'],limiting:['Substrat simulé','Aucune observation terrain réelle','Contexte fictif']},
 {title:'Reprise odorante après la zone humide',score:49,explanation:'La reprise observée peut correspondre à une meilleure disponibilité olfactive après la zone humide.',supporting:['Reprise fictive horodatée','Zone humide simulée'],limiting:['Humidité mock','Pas de mesure olfactive','Zone probable non mesurée']}
];
const confidenceLabel=score=>score>=75?'Confiance élevée':score>=55?'Confiance moyenne':'Confiance faible';

export function buildJumolfDemoAnalysis(sourceId){
 const source=getJumolfDemoSource(sourceId);
 if(!source)return null;
 const analysis=analyzeJumolfSnapshot(source,{consents:{ai_analysis:true},generatedAt:'2026-10-06T08:20:00.000Z',analysisId:`jumolf-demo-analysis-${source.id}`});
 analysis.hypotheses=source.id==='demo-nox-search'?hypothesisData.map((item,index)=>({
  id:`demo-hypothesis-${index+1}`,title:item.title,relative_weight_percent:item.score,
  confidence:{label:confidenceLabel(item.score),score:item.score,explanation:'Indice fictif de démonstration · poids non calibré.'},
  explanation:item.explanation,supporting_factors:[...item.supporting],limiting_factors:[...item.limiting]
 })):[];
 analysis.demo=true;
 analysis.global_confidence=source.demo.globalConfidence;
 analysis.demo_quality_label=source.demo.qualityLabel;
 analysis.provenance_summary={...analysis.provenance_summary,demo:'mock'};
 analysis.limitations=[...analysis.limitations,'Scénario entièrement fictif : aucune mesure terrain, GPS ou météo réelle.'];
 return analysis;
}

export function buildJumolfDemoComparison(){
 const sources=listJumolfDemoSources(),comparisonInputs=sources.map(source=>{
  const analysis=buildJumolfDemoAnalysis(source.id);
  return {...source,metrics:Object.fromEntries(Object.entries(analysis.metrics).map(([key,item])=>[key,item.value]))};
 });
 return {...compareJumolfSessions(comparisonInputs),demo:true,sessions:comparisonInputs.map(item=>({
  id:item.id,title:item.title,dog:{id:item.dog.id,name:item.dog.name},terrain:item.terrain,
  trackAge:item.trackAge,weather:item.weather,wind:item.wind,input_quality:{level:item.demo.qualityLevel,label:item.demo.qualityLabel},
  handler:item.demo.handlerName,duration:item.demo.durationLabel,distance:item.demo.distanceLabel,
  globalConfidence:item.demo.globalConfidence,ruptures:item.demo.rupturesDetected,resumptions:item.demo.resumptionsDetected,
  corridor:item.corridor,provenance:item.provenance
 }))};
}

export function buildJumolfDemoDogProfile(){
 const dog=getJumolfDemoDog(),analyses=listJumolfDemoSources().map(source=>buildJumolfDemoAnalysis(source.id));
 return {...buildJumolfDogProfile(dog.id,analyses,dog),demo:true,demoProfile:{...dog.profile}};
}
