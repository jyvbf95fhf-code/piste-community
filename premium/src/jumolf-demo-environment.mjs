// Isolated fictional sources: never inserted into account or persistence stores.
import {gpsDistance} from './coaching-gps-model.mjs';
import {buildJumolfDemoLearning} from './jumolf-real-learning.mjs';
const consents={gps:true,weather:true,dog_history:true,ai_analysis:true,session_comparison:true};
const distance=trace=>trace.slice(1).reduce((n,p,i)=>n+gpsDistance({latitude:p.y,longitude:p.x},{latitude:trace[i].y,longitude:trace[i].x}),0);
const terrains=['Chemin agricole','Sous-bois et lisière','Prairie et bordure','Chemin périurbain'];
const modes=['normal','simple_blind','full_blind','normal'];
export function buildJumolfDemoEnvironment(){
 const dog={id:'demo-history-naya',name:'Naya',breed:'Berger belge',ageYears:4,dataOrigin:'demo',synthetic:true,demo:true};
 const sessions=Array.from({length:40},(_,n)=>{
  const context=n%4,start=Date.UTC(2026,4,1+n*3,8,context*10),startedAt=new Date(start).toISOString();
  const duration=660+context*110+Math.round(Math.sin(n*.7)*65),amplitude=8+context*4+Math.sin(n*.51)*5;
  const reference=Array.from({length:33},(_,i)=>({space:'wgs84',x:7.46+i*.00018,y:48.63+Math.sin(i/10)*.0005+context*.002}));
  const trace=reference.map((p,i)=>({...p,x:p.x+Math.sin(i*.6)*amplitude/74000,y:p.y+Math.cos(i*.5)*amplitude/111320,timestamp:new Date(start+duration*i/32*1000).toISOString(),accuracy:3+context}));
  const count=[2,1,3,0,1,2,0,3][n%8],events=Array.from({length:count},(_,j)=>{const k=4+j*7;return [{id:`demo-${n}-break-${j}`,type:'Rupture',timestamp:trace[k].timestamp,point:trace[k]},{id:`demo-${n}-return-${j}`,type:'Reprise',timestamp:trace[k+2].timestamp,point:trace[k+2]}];}).flat();
  const gpsMissing=n%11===10,eventsMissing=n%7===6,referenceMissing=n%13===12;
  return {id:`rex-demo:history:${String(n+1).padStart(2,'0')}`,dataOrigin:'demo',synthetic:true,demo:true,kind:'coaching',status:'ARCHIVED',dog,dogId:dog.id,title:`Naya · entraînement fictif ${n+1}`,startedAt,finishedAt:new Date(start+duration*1000).toISOString(),mode:modes[context],handlerId:context===3?'demo-handler-jules':'demo-handler-camille',terrain:terrains[context],trackAge:n%10===9?null:{seconds:[1800,3600,5400,7200][context],provenance:'simulated'},weather:n%9===8?null:{temperature:[16,13,19,21][context],humidity:[65,78,58,50][context],label:'Conditions fictives',provenance:'simulated'},wind:n%9===8?null:{speed:[3,2,6,4][context],direction:context*90,provenance:'simulated'},trace:gpsMissing?[]:trace,referenceTrace:referenceMissing||gpsMissing?null:reference,events:eventsMissing?[]:events,eventsComplete:!eventsMissing,metrics:gpsMissing?{}:{distanceM:distance(trace),...(n%8===7?{}:{durationSeconds:duration})},provenance:{trace:'simulated',referenceTrace:referenceMissing?null:'simulated',distance:'calculated'},demoMissing:[...(gpsMissing?['GPS']:[]),...(referenceMissing?['Référence']:[]),...(eventsMissing?['Journal des événements']:[]),...(n%9===8?['Météo et vent']:[]),...(n%10===9?['Âge de piste']:[]),...(n%8===7?['Durée active']:[])]};
 });
 const learning=buildJumolfDemoLearning(dog.id,sessions,{consents});
 return {dog,sessions,learning,dataOrigin:'demo',synthetic:true,limitations:['Chien, coordonnées, événements et conditions entièrement fictifs.','Les valeurs sont calculées avec les moteurs descriptifs des lots A et B ; aucune donnée de compte n’est utilisée.','Les variations décrivent le scénario et ne démontrent ni progression du chien ni effet d’un exercice.','Les valeurs absentes restent inconnues ; les contextes différents limitent les comparaisons.']};
}
