import {validIsoTimestamp} from './iso-timestamp.mjs';
import {geographicDistance} from './track-geographic.mjs';
import {normalizeSearchOutcome} from './search-outcome.mjs';
const iso=validIsoTimestamp;
const fail=()=>{throw Error('Archive après intervention invalide : vérifiez la date, les horaires et le GPX.');};
export function compactOperationalGpx(parsed){
 if(!Array.isArray(parsed?.points))fail();
 return {fileName:String(parsed.fileName||'piste.gpx').slice(0,240),name:String(parsed.name||'GPX importé').slice(0,80),coordinates:parsed.points.map(p=>[p.x,p.y,Number.isFinite(p.timestamp)?p.timestamp:null,p.breakBefore?1:0])};
}
export function normalizeRetrospective(value){
 if(value==null)return null;
 if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['version','interventionDate','startedAt','finishedAt','recordedAt','observations','dogWork','searchOutcome','gpx'].includes(k))||value.version!==undefined&&value.version!==1||typeof value.interventionDate!=='string'||!/^\d{4}-\d\d-\d\d$/.test(value.interventionDate)||!Number.isFinite(Date.parse(value.interventionDate))||new Date(value.interventionDate).toISOString().slice(0,10)!==value.interventionDate||!iso(value.recordedAt))fail();
 const startedAt=value.startedAt||null,finishedAt=value.finishedAt||null;if(startedAt&&!iso(startedAt)||finishedAt&&!iso(finishedAt)||startedAt&&finishedAt&&Date.parse(finishedAt)<Date.parse(startedAt))fail();
 for(const key of ['observations','dogWork'])if(value[key]!=null&&(typeof value[key]!=='string'||value[key].length>6000))fail();
 let gpx=null;if(value.gpx){const g=value.gpx;if(typeof g!=='object'||Object.keys(g).some(k=>!['fileName','name','coordinates'].includes(k))||typeof g.fileName!=='string'||g.fileName.length>240||typeof g.name!=='string'||g.name.length>80||!Array.isArray(g.coordinates)||g.coordinates.length<2||g.coordinates.length>10000)fail();
  for(const [i,p] of g.coordinates.entries())if(!Array.isArray(p)||p.length!==4||!Number.isFinite(p[0])||Math.abs(p[0])>180||!Number.isFinite(p[1])||Math.abs(p[1])>90||p[2]!==null&&(!Number.isFinite(p[2])||p[2]<0||p[2]>8640000000000000)||![0,1].includes(p[3])||i===0&&p[3]!==0)fail();
  if(!g.coordinates.some((p,i)=>i>0&&p[3]===0))fail();gpx=structuredClone(g);
 }
 return {version:1,interventionDate:value.interventionDate,startedAt,finishedAt,recordedAt:new Date(value.recordedAt).toISOString(),observations:value.observations||'',dogWork:value.dogWork||'',searchOutcome:normalizeSearchOutcome(value.searchOutcome),gpx};
}
export function retrospectivePoints(value){return value?.gpx?.coordinates?.map(([x,y,timestamp,breakBefore],i)=>({space:'wgs84',x,y,...(timestamp===null?{}:{timestamp:new Date(timestamp).toISOString()}),breakBefore:!!breakBefore,id:'import-'+i,kind:i===0?'start':'via',incomingMode:i>0&&!breakBefore?'free':null}))||[];}
export function retrospectiveMetrics(value){
 if(!value)return null;const points=value.gpx?.coordinates||[];let distanceM=points.length?0:null;
 for(let i=1;i<points.length;i++)if(!points[i][3])distanceM+=geographicDistance({x:points[i-1][0],y:points[i-1][1]},{x:points[i][0],y:points[i][1]});
 const validTimes=points.length>1&&points.every((p,i)=>p[2]!==null&&Number.isFinite(p[2])&&(i===0||p[2]>=points[i-1][2]));
 const explicit=!!(value.startedAt||value.finishedAt),startedAt=explicit?value.startedAt:validTimes?new Date(points[0][2]).toISOString():null,finishedAt=explicit?value.finishedAt:validTimes?new Date(points.at(-1)[2]).toISOString():null;
 return {distanceM,startedAt,finishedAt,elapsedMs:startedAt&&finishedAt?Date.parse(finishedAt)-Date.parse(startedAt):null,timeSource:explicit?'declared':validTimes?'gpx':'unavailable',pointCount:points.length};
}
