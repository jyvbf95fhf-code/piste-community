import {analyzeJumolfSnapshot} from './jumolf-analysis-engine.mjs';
import {detectJumolfSyntheticAnomalies} from './jumolf-synthetic-analytics.mjs';

const clamp=(value,min=8,max=94)=>Math.max(min,Math.min(max,Math.round(value)));
const confidenceLabel=value=>value>=75?'Confiance indicative élevée':value>=50?'Confiance indicative moyenne':'Confiance indicative faible';

export function analyzeJumolfSyntheticSession(source){
 if(!source?.synthetic)return null;
 const analysis=analyzeJumolfSnapshot(source,{consents:{ai_analysis:true},generatedAt:source.finishedAt||source.startedAt,analysisId:`jumolf-synthetic-analysis-${source.id}`,engineVersion:'jumolf-synthetic-mock-1.0.0',analysisVersion:'synthetic-analysis-1'});
 analysis.input_quality={level:source.quality.level,score:source.quality.score,availableInputs:[...source.quality.availableInputs],missingInputs:[...source.quality.missingInputs],explanation:source.quality.explanation};
 analysis.missing_inputs=[...new Set([...analysis.missing_inputs,...source.quality.missingInputs])];
 const pollution=source.scentPollution.level,wind=source.weather?.windDirection||'inconnu',surface=source.surface,confidence=source.confidence;
 const hypotheses=[
  {id:'synthetic-plume',title:wind.startsWith('latéral')?'Déport latéral compatible avec le vent simulé':'Progression compatible avec le contexte simulé',score:clamp(confidence+((surface==='terre'||surface==='herbe')?5:0)),explanation:'Une interprétation possible des conditions synthétiques et de la progression mock.',supporting:['Trace et chronologie de démonstration disponibles',`Surface synthétique : ${surface}`],limiting:['Aucune mesure olfactive réelle','Scénario généré à partir d’une seed fixe']},
  {id:'synthetic-pollution',title:pollution==='high'?'Perturbation olfactive possible':'Influence environnementale à considérer',score:clamp(45+(pollution==='high'?24:pollution==='medium'?10:0)+(source.ruptures?source.ruptures*3:0)),explanation:'La pollution est un contexte simulé ; elle ne permet pas d’attribuer la cause d’une rupture.',supporting:[`Niveau de pollution mock : ${pollution}`,...(source.events.some(event=>event.type==='Pollution olfactive')?['Événement synthétique associé']:[])],limiting:['Aucun relevé de composés odorants','Lien statistique non calibré']},
  {id:'synthetic-surface-break',title:source.ruptures?'Rupture compatible avec un changement de contexte':'Continuité de progression possible',score:clamp(38+(source.ruptures?source.ruptures*8:0)+(source.events.some(event=>event.type==='Changement de surface')?12:0)),explanation:'Cette hypothèse concurrente décrit une compatibilité, sans confirmer un mécanisme.',supporting:source.ruptures?[`${source.ruptures} rupture(s) dans les données mock`]:['Aucune rupture synthétique enregistrée'],limiting:['Surfaces et événements synthétiques','Une autre explication reste possible']}
 ].map(item=>({...item,confidence:{label:confidenceLabel(item.score),score:item.score,explanation:'Score local déterministe de démonstration ; ni probabilité calibrée ni validation scientifique.'},relative_weight_percent:item.score,supporting_factors:item.supporting,limiting_factors:item.limiting}));
 analysis.hypotheses=hypotheses;
 analysis.global_confidence=source.confidence;
 analysis.demo=true;
 analysis.synthetic=true;
 analysis.demo_quality_label=source.quality.level==='high'?'Bonne':source.quality.level==='medium'?'Moyenne':source.quality.level==='low'?'Limitée':'Insuffisante';
 analysis.provenance_summary={...analysis.provenance_summary,synthetic:'synthetic_demo'};
 analysis.anomaly_signals=detectJumolfSyntheticAnomalies([source]).map(item=>({id:item.id,label:'Signal détecté',description:item.why,limit:'Session synthétique · signal descriptif, pas une erreur du chien.',provenance:'calculated'}));
 analysis.limitations=[...analysis.limitations,'Données entièrement synthétiques ; elles démontrent l’interface et ne constituent aucun résultat scientifique réel.'];
 return analysis;
}
