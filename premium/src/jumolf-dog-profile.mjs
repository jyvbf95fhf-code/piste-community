const scalar=value=>Number.isFinite(value)?value:null;
const average=values=>{const available=values.filter(Number.isFinite);return available.length?available.reduce((sum,value)=>sum+value,0)/available.length:null;};
const getMetric=(analysis,key)=>analysis.metrics?.[key]?.value??null;
const trend=(values,unit='')=>{const value=average(values);return {value,unit,status:value===null?'indisponible':'calculé',provenance:value===null?null:'calculated'};};

export function buildJumolfDogProfile(dogId,analyses=[],sourceDog=null){
 const rows=(analyses||[]).filter(item=>item?.dog_id===dogId).slice().sort((a,b)=>String(b.generated_at||'').localeCompare(String(a.generated_at||'')));
 const speeds=rows.map(item=>scalar(getMetric(item,'speed_m_s'))),ruptures=rows.map(item=>scalar(getMetric(item,'ruptures'))),resumptions=rows.map(item=>scalar(getMetric(item,'resumptions'))),ages=rows.map(item=>scalar(getMetric(item,'track_age'))),offsets=rows.map(item=>scalar(getMetric(item,'average_lateral_offset_m')));
 const profileFactors={};
 for(const key of ['age','training','handler','fatigue','environment','delay','weather','wind_reaction']){
  const value=rows.map(item=>item.profile_snapshot?.[key]).find(value=>value!==null&&value!==undefined&&value!=='')??sourceDog?.[key]??null;
  profileFactors[key]={value:value===null?'indisponible':value,provenance:value===null?null:'manual'};
 }
 return {dog:sourceDog?{id:sourceDog.id,name:sourceDog.name||null,breed:sourceDog.breed||null,age:sourceDog.age||null,specialty:sourceDog.specialty||null}:null,analysisCount:rows.length,trends:{speed_m_s:trend(speeds,'m/s'),ruptures:trend(ruptures),resumptions:trend(resumptions),track_age:trend(ages,'s'),average_lateral_offset_m:trend(offsets,'m'),wind_reaction:profileFactors.wind_reaction},factors:profileFactors,recentAnalyses:rows.slice(0,5).map(item=>({id:item.id,generated_at:item.generated_at||null,input_quality:item.input_quality?.level||'indisponible',engine_version:item.engine_version||null})),limitations:rows.length?'Tendances descriptives des analyses disponibles ; elles ne classent pas le chien.':'Aucune analyse disponible ; les tendances restent indisponibles.'};
}
