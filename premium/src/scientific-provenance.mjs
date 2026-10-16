const get=(value,path)=>String(path).split('.').reduce((current,key)=>current?.[key],value);
export function scientificProvenance(session,field){
 if(session?.source==='account'){const value=get(session,field),origin=get(session.provenance||{},field)||session.provenance?.[field.split('.')[0]]||((field==='weather'||field==='wind')?session[field]?.provenance:null);return{status:value==null?'Indisponible':'Disponible',source:origin||'unknown',method:field==='corridor'?'Modèle de couloir olfactif · estimation':field.startsWith('metrics.')?'Calcul sur données de session':'Dossier autorisé du compte',timestamp:session.weather?.observedAt||session.finishedAt||null,quality:session.quality?.level||'insufficient',value:value==null?null:structuredClone(value),synthetic:false};}
 if(!session||session.synthetic!==true)return{status:'Indisponible',synthetic:false};
 const value=get(session,field),origin=get(session.provenance||{},field);
 if(value===null||value===undefined||origin==='unknown')return{status:'Indisponible',source:origin||'unknown',timestamp:null,synthetic:true};
 if(field==='weather'||field.startsWith('weather.'))return{status:'Disponible · donnée météo simulée',source:origin||session.weather?.provenance||'historical_weather',method:'Fixture météo synthétique',timestamp:null,quality:session.quality?.level||'unknown',value:structuredClone(value),synthetic:true};
 if(field==='wind'||field.startsWith('wind.'))return{status:'Disponible · estimation mock',source:origin||'estimated',method:'Paramètre synthétique du scénario',timestamp:null,quality:session.quality?.level||'unknown',value:structuredClone(value),synthetic:true};
 if(field==='metrics'||field.startsWith('metrics.'))return{status:'Disponible · calcul mock',source:'calculated',method:'JUMOLF mock calculation',inputs:['trace','events','trackAge'],algorithmVersion:'jumolf-mock-1.0.0',timestamp:null,unit:null,value:structuredClone(value),synthetic:true};
 return{status:'Disponible · synthétique',source:origin||'synthetic_demo',method:'Fixture déterministe du dataset',timestamp:null,quality:session.quality?.level||'unknown',value:structuredClone(value),synthetic:true};
}
