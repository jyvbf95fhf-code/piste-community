import {summarizeScientificValues} from './scientific-statistics.mjs';
import {summarizeSearchOutcomes} from './search-outcome.mjs';
import {scientificObservationInputs} from './scientific-quality.mjs';

const nonnegative=value=>Number.isFinite(value)&&value>=0?value:null;
const range=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max?value:null;
export const scientificVariables=[
 {key:'age',label:'Âge au départ',unit:'min',origin:'Calculé à partir des horaires disponibles',read:row=>nonnegative(row.trackAge?.seconds)===null?null:row.trackAge.seconds/60},
 {key:'duration',label:'Durée de recherche',unit:'min',origin:'Durée enregistrée selon le mode de session',read:row=>nonnegative(row.durationMinutes)},
 {key:'distance',label:'Distance de suivi',unit:'km',origin:'Calculée à partir du suivi enregistré',read:row=>nonnegative(row.distanceKm)},
 {key:'speed',label:'Vitesse moyenne',unit:'m/s',origin:'Distance divisée par la durée utilisée par le dossier',read:row=>nonnegative(row.metrics?.speedMps)},
 {key:'wind',label:'Vitesse du vent à la pose',unit:'km/h',origin:'Relevé météo archivé pour la pose',read:row=>range(row.source==='account'?row.poseWind?.wind_speed_kmh:row.weather?.windSpeedKmh,0,150)},
 {key:'temperature',label:'Température archivée',unit:'°C',origin:'Météo du dossier, modélisée ou saisie selon la source',read:row=>range(row.weather?.temperatureC,-80,80)},
 {key:'humidity',label:'Humidité archivée',unit:'%',origin:'Météo du dossier, modélisée ou saisie selon la source',read:row=>range(row.weather?.humidityPercent,0,100)},
 {key:'ruptures',label:'Ruptures relevées',unit:'',origin:'Événements renseignés dans le dossier',read:row=>nonnegative(row.ruptures)},
 {key:'restarts',label:'Reprises relevées',unit:'',origin:'Événements renseignés dans le dossier',read:row=>nonnegative(row.resumptions)},
 {key:'delay',label:'Délai de reprise',unit:'s',origin:'Mesure disponible dans le dossier',read:row=>nonnegative(row.resumptionDelaySeconds)},
 {key:'offset',label:'Écart latéral moyen',unit:'m',origin:'Calcul disponible à partir de la référence et du suivi',read:row=>nonnegative(row.metrics?.averageLateralOffset)}
];
const ageBands=[
 ['< 30 min',30],['30 à < 90 min',90],['1 h 30 à < 3 h',180],
 ['3 à < 6 h',360],['6 à < 12 h',720],['12 h et plus',Infinity]
];

function ranks(values){
 const sorted=values.map((value,index)=>({value,index})).sort((a,b)=>a.value-b.value);
 const rank=Array(values.length);
 for(let start=0;start<sorted.length;){
  let end=start+1;
  while(end<sorted.length&&sorted[end].value===sorted[start].value)end++;
  const mean=(start+end+1)/2;
  for(let i=start;i<end;i++)rank[sorted[i].index]=mean;
  start=end;
 }
 return rank;
}

export function pairedRankCorrelation(points){
 if(points.length<3)return null;
 const x=ranks(points.map(row=>row.x)),y=ranks(points.map(row=>row.y)),center=(points.length+1)/2;
 let cross=0,x2=0,y2=0;
 for(let i=0;i<points.length;i++){
  const a=x[i]-center,b=y[i]-center;
  cross+=a*b;
  x2+=a*a;
  y2+=b*b;
 }
 return x2>0&&y2>0?Math.max(-1,Math.min(1,cross/Math.sqrt(x2*y2))):null;
}

export function buildFilteredScientificAnalysis(sessions,{x='age',y='duration'}={}){
 const xVar=scientificVariables.find(metric=>metric.key===x)||scientificVariables[0];
 const yVar=scientificVariables.find(metric=>metric.key===y)||scientificVariables[1];
 const metrics=scientificVariables.map(variable=>({...variable,summary:summarizeScientificValues(sessions.map(variable.read))}));
 const ages=ageBands.map(([label])=>({label,count:0}));
 const coverage={reference:0,search:0,age:0,wind:0};
 const points=[];
 const environments=new Map();
 for(const row of sessions){
  const environment=row.environment?.primary||'Indisponible';
  environments.set(environment,(environments.get(environment)||0)+1);
  const age=scientificVariables[0].read(row);
  if(age!==null)ages[ageBands.findIndex(([,limit])=>age<limit)].count++;
  for(const [key,value] of Object.entries(scientificObservationInputs(row)))if(value)coverage[key]++;
  const a=xVar.read(row),b=yVar.read(row);
  if(a!==null&&b!==null)points.push({id:row.id,title:row.title||row.id,x:a,y:b});
 }
 return {total:sessions.length,training:sessions.filter(row=>row.kind==='training').length,operational:sessions.filter(row=>row.kind==='operational').length,
  observations:coverage,ages,metrics,points,
  environments:[...environments].sort(([labelA,countA],[labelB,countB])=>countB-countA||labelA.localeCompare(labelB,'fr')),
  outcomes:summarizeSearchOutcomes(sessions),
  missingPairs:sessions.length-points.length,xVar,yVar,
  rho:xVar.key===yVar.key?null:pairedRankCorrelation(points)};
}
