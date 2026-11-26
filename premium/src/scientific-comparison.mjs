import {summarizeScientificValues} from './scientific-statistics.mjs';
const metrics=[['confidence','Confiance',row=>row.confidence,'%'],['distanceKm','Distance suivie',row=>row.distanceKm,'km'],['trackAgeMinutes','Âge de piste',row=>Number.isFinite(row.trackAge?.seconds)?row.trackAge.seconds/60:null,'min'],['ruptures','Ruptures',row=>row.ruptures,''],['resumptions','Reprises',row=>row.resumptions,''],['resumptionDelaySeconds','Délai de reprise',row=>row.resumptionDelaySeconds,'s'],['averageLateralOffset','Écart latéral moyen',row=>row.metrics?.averageLateralOffset,'m'],['durationMinutes','Durée',row=>row.durationMinutes,'min']];
const quality=rows=>{const values=rows.map(row=>row.quality?.score).filter(Number.isFinite);return{n:values.length,mean:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null};};
export function compareScientificCohorts(a={sessions:[]},b={sessions:[]}){
 const left=a.sessions||[],right=b.sessions||[];
 return{sampleA:left.length,sampleB:right.length,labelA:a.cohort?.name||a.name||'Cohorte A',labelB:b.cohort?.name||b.name||'Cohorte B',qualityA:quality(left),qualityB:quality(right),metrics:metrics.map(([key,label,get,unit])=>{const first=summarizeScientificValues(left.map(get)),second=summarizeScientificValues(right.map(get));return{key,label,unit,first,second,difference:first.mean===null||second.mean===null?null:Math.round((second.mean-first.mean)*100)/100,derived:true};}),caveat:'Différence observée dans cet échantillon. Elle ne démontre pas de causalité.',synthetic:true};
}

export function compareScientificTrackAges(sessions,terrain){
 const local=sessions.filter(row=>row.environment?.primary===terrain);
 const known=local.filter(row=>Number.isFinite(row.trackAge?.seconds)&&row.trackAge.seconds>=0);
 const fresh=known.filter(row=>row.trackAge.seconds<3600);
 const older=known.filter(row=>row.trackAge.seconds>10800);
 return {...compareScientificCohorts({name:'Moins de 1 h',sessions:fresh},{name:'Plus de 3 h',sessions:older}),
  ageGroups:{terrain,missingAge:local.length-known.length,between:known.length-fresh.length-older.length}};
}
