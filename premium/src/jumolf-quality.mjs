const inputs=['dog','trace','referenceTrace','terrain','weather','wind','events'];
const present=(input,key)=>{
 if(key==='dog')return Boolean(input.dog?.id||input.dogId);
 if(key==='events')return Array.isArray(input.events)&&input.events.length>0;
 return input[key]!==null&&input[key]!==undefined&&input[key]!=='';
};
export function assessInputQuality(input={}){
 const availableInputs=inputs.filter(key=>present(input,key));
 const missingInputs=inputs.filter(key=>!present(input,key));
 const count=availableInputs.length;
 const level=count>=6?'high':count>=4?'medium':count>=2?'low':'insufficient';
 const explanation=level==='high'?'Plusieurs familles de données sont disponibles.':level==='medium'?'Des éléments importants restent absents.':level==='low'?'Les éléments disponibles limitent fortement l’interprétation.':'Les données sont insuffisantes pour produire une interprétation.';
 return {level,score:Math.round(count/inputs.length*100),availableInputs,missingInputs,explanation};
}
