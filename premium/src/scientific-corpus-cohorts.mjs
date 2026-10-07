import { assessReidentificationRisk } from './scientific-reidentification.mjs';
import { aggregateScientificContributionCorpus } from './scientific-corpus-analytics.mjs';

function matches(row,criteria={}) {
  return Object.entries(criteria).every(([key,value])=>{
    if(value===undefined||value===null||value==='')return true;
    if(key==='weatherBand')return row.fields.weather?.value?.band===value;
    if(key==='trackAgeBand')return row.fields.trackAgeBand?.value===value;
    if(key==='category')return Object.values(row.fields).some(field=>field.consentCategory===value);
    if(key==='quality')return row.quality===value;
    return row[key]===value;
  });
}

export function buildScientificContributionCohort(corpus,criteria={}) {
  const rows=(corpus?.rows||[]).filter(row=>matches(row,criteria));
  const dogCount=new Set(rows.map(row=>row.dogId).filter(Boolean)).size;
  const isDogProfile=Boolean(criteria.dogId);
  const risk=assessReidentificationRisk({sessionCount:rows.length,dogCount,assessmentType:isDogProfile?'dog_profile':'cross_dog',criterionPrecision:criteria.criterionPrecision||'coarse',opsRarity:criteria.type==='operational'&&rows.length<5,environmentUniqueness:criteria.environment==='rare-private-crossing'});
  if(!risk.allowed)return {displayable:false,summary:null,metrics:[],suppressionReason:risk.reason,synthetic:true};
  const metrics=aggregateScientificContributionCorpus(rows,['type','quality']);
  return {displayable:true,summary:{sessionCount:rows.length,dogCount,training:rows.filter(row=>row.type==='training').length,operational:rows.filter(row=>row.type==='operational').length,quality:rows.reduce((counts,row)=>(counts[row.quality]=(counts[row.quality]||0)+1,counts),{}),caveat:'Différence observée dans cet échantillon'},metrics,suppressionReason:null,coarsened:risk.action==='coarsen',synthetic:true};
}

export function compareScientificContributionCohorts(cohortA,cohortB) {
  if(!cohortA?.displayable||!cohortB?.displayable)return {displayable:false,sampleA:cohortA?.summary?.sessionCount||0,sampleB:cohortB?.summary?.sessionCount||0,differencesObserved:[],caveat:'Échantillon insuffisant pour afficher ce résultat.'};
  const metrics=['sessionCount','dogCount','training','operational'];
  return {displayable:true,sampleA:cohortA.summary.sessionCount,sampleB:cohortB.summary.sessionCount,differencesObserved:metrics.map(metric=>({metric,delta:(cohortA.summary[metric]||0)-(cohortB.summary[metric]||0)})),caveat:'Différence observée dans cet échantillon',synthetic:true};
}
