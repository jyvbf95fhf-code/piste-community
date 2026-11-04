import {resolveDogId} from './dog-selection.mjs';
// Read-only account projection: totals never depend on Community visibility or a
// prepared route's length. A cloud copy and its local original are one activity.
export function dogMileageTotals(dogs=[],sources={}){
 const totals=Object.fromEntries(dogs.map(d=>[d.id,{meters:0,sessions:0}])),activities=new Map();
 for(const row of [...(sources.sessions||[]),...(sources.operational||[])]){
  if(!row?.id||row.demo||row.synthetic||row.qa)continue;
  const coaching=row.kind==='coaching',ops=row.kind==='operational';
  if(!(coaching&&['DEBRIEF','ARCHIVED'].includes(row.status)||ops&&['Terminée','Archivée'].includes(row.status)))continue;
  const meters=coaching?row.metrics?.distanceM:row.distanceM;
  if(typeof meters!=='number'||!Number.isFinite(meters)||meters<0)continue;
  const dogId=resolveDogId(dogs,row.dogId||row.dog?.id);if(!dogId)continue;
  const key=(coaching?'coaching:':'ops:')+(row.communityId||row.id),priority=/^ops:cloud-/.test(row.id)?0:1;
  if(!activities.has(key)||priority>=activities.get(key).priority)activities.set(key,{dogId,meters,priority});
 }
 for(const {dogId,meters} of activities.values()){totals[dogId].meters+=meters;totals[dogId].sessions++;}
 return totals;
}
