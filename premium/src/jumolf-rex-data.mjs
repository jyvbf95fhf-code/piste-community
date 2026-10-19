// Entirely fictional fixture. It never enters dogs, account sources or training stores.
import {gpsDistance} from './coaching-gps-model.mjs';
import {analyzeJumolfDemoSnapshot} from './jumolf-real-science.mjs';
import {compareJumolfSessions} from './jumolf-comparison.mjs';
import {buildJumolfRecommendation} from './jumolf-recommendations.mjs';
import {buildAccountJumolfProtocol} from './jumolf-training-plan.mjs';
const allConsents={gps:true,weather:true,dog_history:true,ai_analysis:true,session_comparison:true};
// Pixels of genuine IGN tile 16/34131/22705, inspected on aerial and satellite imagery.
// Farm path northbound, then its eastbound junction; westward fictional excursions stay in fields.
const geo=([px,py])=>{const x=(34131+px/256)/2**16,y=(22705+py/256)/2**16;return {space:'wgs84',x:x*360-180,y:Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI};};
const anchors=[[65,235],[65,155],[65,80],[68,15],[150,25],[235,36]];
const reference=anchors.flatMap((p,i)=>i===anchors.length-1?[geo(p)]:Array.from({length:14},(_,j)=>geo([p[0]+(anchors[i+1][0]-p[0])*j/14,p[1]+(anchors[i+1][1]-p[1])*j/14])));
const distance=trace=>trace.slice(1).reduce((n,p,i)=>n+gpsDistance({latitude:p.y,longitude:p.x},{latitude:trace[i].y,longitude:trace[i].x}),0);
let fixture;
export function buildRexDemo(){
 if(fixture)return structuredClone(fixture);
 const dog={id:'demo-rex',name:'Rex',breed:'Berger allemand',ageYears:4,synthetic:true,dataOrigin:'demo'};
 const sessions=[30,27,24,16,13,10].map((amplitude,n)=>{
  const startedAt=`2026-09-${String(1+n*3).padStart(2,'0')}T08:00:00.000Z`,start=Date.parse(startedAt),seconds=960-n*30;
  const trace=reference.map((p,i)=>{const phase=i/(reference.length-1),excursion=Math.exp(-(((phase-.34)/.075)**2))+.75*Math.exp(-(((phase-.56)/.07)**2));return {...p,x:p.x-amplitude*excursion/111320/Math.cos(p.y*Math.PI/180),timestamp:new Date(start+Math.round(phase*seconds)*1000).toISOString(),accuracy:3};});
  trace[0]={...reference[0],timestamp:startedAt,accuracy:3};trace[trace.length-1]={...reference.at(-1),timestamp:new Date(start+seconds*1000).toISOString(),accuracy:3};
  const breaks=[3,3,2,2,1,1][n],events=Array.from({length:breaks},(_,j)=>{const idx=18+j*13;return [{id:`rex-${n}-rupture-${j}`,type:'Rupture',timestamp:trace[idx].timestamp,point:trace[idx]},{id:`rex-${n}-reprise-${j}`,type:'Reprise',timestamp:trace[idx+5].timestamp,point:trace[idx+5]}];}).flat();
  return {id:`rex-demo:${n+1}`,dataOrigin:'demo',synthetic:true,demo:true,kind:'coaching',mode:'normal',status:'ARCHIVED',dog,dogId:dog.id,title:`Rex · séance fictive ${n+1}`,stage:n<3?'avant':'après',startedAt,finishedAt:trace.at(-1).timestamp,trace,referenceTrace:reference,events,eventsComplete:true,terrain:'Chemins agricoles et bordures de champs',handlerId:'rex-demo-handler',trackAge:{seconds:3600,provenance:'calculated'},weather:{temperature:15,humidity:70,label:'Conditions fictives identiques',provenance:'simulated'},wind:{speed:4,direction:90,provenance:'simulated'},metrics:{distanceM:distance(trace),durationSeconds:seconds},provenance:{trace:'simulated',referenceTrace:'simulated',distance:'calculated'}};
 });
 const analyses=sessions.map(s=>analyzeJumolfDemoSnapshot(s,{consents:allConsents,generatedAt:s.finishedAt,analysisId:'rex-analysis-'+s.id,analysisVersion:'rex-demo-descriptive-1'}));
 const first=analyses[0];
 const recommendation=buildJumolfRecommendation({id:'rex-interruptions',priority:'Observation simulée',conditions:'ruptures puis reprises signalées',observation:`${first.metrics.ruptures.value} ruptures et ${first.metrics.resumptions.value} reprises dans la première séance fictive.`,recommendation:{summary:'Documenter les interruptions et les aides apportées, avec une difficulté familière et un objectif d’observation unique.'}});
 const comparison=compareJumolfSessions([0,3].map(i=>({...sessions[i],metrics:analyses[i].metrics})));
 const series=analyses.map((a,i)=>({id:sessions[i].id,date:sessions[i].startedAt,stage:sessions[i].stage,...Object.fromEntries(['traveled_distance_m','duration_seconds','ruptures','resumptions','reference_point_mean_m'].map(key=>[key,a.metrics[key].value]))}));
 fixture={dog,sessions,analyses,referenceDistanceM:distance(reference),recommendation,protocol:buildAccountJumolfProtocol('interruptions'),comparison,series,training:{id:'rex-training',status:'simulated',afterSession:sessions[2].id,beforeSession:sessions[3].id},limitations:['Toutes les coordonnées de traces, événements, conditions et résultats de Rex sont fictifs. Le fond géographique est authentique.','Le changement avant/après est écrit dans le scénario : il ne prouve aucun effet causal de l’entraînement.','Les écarts sont calculés aux points de référence, pas à une piste vraie ni à une odeur mesurée.','Le scénario simplifie volontairement les conditions ; les données réelles peuvent être manquantes ou non comparables.','Le terrain représenté n’est pas une recommandation d’accès ou d’entraînement sur place.']};
 return structuredClone(fixture);
}
