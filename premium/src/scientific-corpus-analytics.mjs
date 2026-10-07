import { assessReidentificationRisk } from './scientific-reidentification.mjs';

export function aggregateScientificContributionCorpus(rows=[],dimensions=['type']) {
  const groups=new Map();
  for(const row of rows){
    const values=dimensions.map(key=>key==='weatherBand'?row.fields.weather?.value?.band:key==='trackAgeBand'?row.fields.trackAgeBand?.value:key==='quality'?row.quality:row[key]||'unavailable');
    const key=values.join('|'),group=groups.get(key)||{dimensions:Object.fromEntries(dimensions.map((dimension,index)=>[dimension,values[index]])),sessionCount:0,dogs:new Set(),synthetic:true};
    group.sessionCount++;if(row.dogId)group.dogs.add(row.dogId);groups.set(key,group);
  }
  return [...groups.values()].map(group=>{
    const dogCount=group.dogs.size,risk=assessReidentificationRisk({sessionCount:group.sessionCount,dogCount});
    if(!risk.allowed)return null;
    return {...group,dogs:undefined,dogCount,label:'Différence observée dans cet échantillon',quality:'synthétique'};
  }).filter(Boolean);
}
