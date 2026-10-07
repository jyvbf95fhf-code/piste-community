const valueAt=(session,key)=>({kind:session.kind,type:session.type,environment:session.environment?.primary,substrate:session.surface,pollution:session.scentPollution?.level,quality:session.quality?.level,result:session.result,ruptures:session.ruptures,resumptions:session.resumptions,ageBand:session.trackAge?.band,benchmark:session.benchmark_session,blind:session.blind_analysis_available,reference:Boolean(session.referenceTrace),difficulty:session.difficulty?.level,rain:session.weather?.rain,windDirection:session.weather?.windDirection})[key];
export function filterScientificSessions(sessions=[],filters={}){
 const anomalyIds=new Set(filters.anomalyIds||[]);
 return sessions.filter(row=>row.synthetic===true).filter(row=>{
  const f=filters,started=Date.parse(row.startedAt),age=row.trackAge?.seconds===null?null:(row.trackAge?.seconds??null)/60;
  const checks=[['kind',f.kind],['environment',f.environment],['substrate',f.substrate],['pollution',f.pollution],['quality',f.quality],['result',f.result],['ageBand',f.ageBand],['kind',f.type]];
  if(checks.some(([key,want])=>want&&want!=='all'&&valueAt(row,key)!==want))return false;
  if(f.dateFrom&&started<Date.parse(f.dateFrom))return false;if(f.dateTo&&started>Date.parse(`${f.dateTo}T23:59:59`))return false;
  if(f.ageMin!=null&&(age===null||age<Number(f.ageMin)))return false;if(f.ageMax!=null&&(age===null||age>Number(f.ageMax)))return false;
  if(f.benchmark===true&&!row.benchmark_session)return false;if(f.blind===true&&!row.blind_analysis_available)return false;
  if(f.reference!==undefined&&Boolean(row.referenceTrace)!==Boolean(f.reference))return false;
  if(f.anomaly===true&&!anomalyIds.has(row.id))return false;
  for(const [filterKey,value] of [['humidityMin',row.weather?.humidityPercent],['humidityMax',row.weather?.humidityPercent],['temperatureMin',row.weather?.temperatureC],['temperatureMax',row.weather?.temperatureC],['windSpeedMin',row.weather?.windSpeedKmh],['windSpeedMax',row.weather?.windSpeedKmh],['rupturesMin',row.ruptures],['rupturesMax',row.ruptures],['resumptionsMin',row.resumptions],['resumptionsMax',row.resumptions]]){
   const limit=f[filterKey];if(limit===undefined||limit===null||limit==='')continue;if(value===null||value===undefined)return false;
   if(filterKey.endsWith('Min')&&Number(value)<Number(limit))return false;if(filterKey.endsWith('Max')&&Number(value)>Number(limit))return false;
  }
  if(f.weather&&f.weather!=='all'&&(f.weather==='unknown'?Boolean(row.weather):row.weather?.rain!==f.weather))return false;
  if(f.windDirection&&f.windDirection!=='all'&&row.weather?.windDirection!==f.windDirection)return false;
  if(f.difficulty&&f.difficulty!=='all'&&row.difficulty?.level!==f.difficulty)return false;
  if(f.search&&!`${row.id} ${row.title} ${row.environment?.label} ${row.surface}`.toLowerCase().includes(String(f.search).toLowerCase()))return false;
  return true;
 });
}

export function resolveCohort(sessions=[],cohort={}){
 const rows=filterScientificSessions(sessions,cohort.criteria||{}),scores=rows.map(item=>item.quality?.score).filter(Number.isFinite),mean=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
 return{cohort:{...structuredClone(cohort)},sessions:rows,count:rows.length,quality:{level:mean===null?'insufficient':mean>=82?'high':mean>=60?'medium':'low',score:mean,available:scores.length,missing:rows.length-scores.length},period:rows.length?{start:rows[0].startedAt,end:rows.at(-1).startedAt}:null};
}
