const categories=['manual','phone_gps','gpx_import','garmin','weather_api','historical_weather','calculated','estimated','ai_generated','user_confirmed'];
export function provenanceLabel(value){return ({manual:'Saisie manuelle',phone_gps:'GPS téléphone',gpx_import:'Import GPX',garmin:'Garmin',weather_api:'Météo API',historical_weather:'Météo historique',calculated:'Calculé',estimated:'Estimé',ai_generated:'IA',user_confirmed:'Confirmé par l’utilisateur'})[value]||'Provenance inconnue';}
export function summarizeProvenance(input={}){
 const source=input.provenance||{};
 const trace=source.trace||input.traceProvenance||(input.trace?'manual':null);
 const weather=source.weather||input.weather?.provenance||null;
 const wind=source.wind||input.wind?.provenance||null;
 const referenceTrace=source.referenceTrace||input.referenceProvenance||(input.referenceTrace?'manual':null);
 const out={};for(const [key,value]of Object.entries({trace,weather,wind,referenceTrace}))if(categories.includes(value))out[key]=value;
 if(input.corridor)out.corridor='estimated';
 return out;
}
