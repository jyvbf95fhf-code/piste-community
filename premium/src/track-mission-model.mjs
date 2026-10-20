import {segmentCoordinates} from './track-route-segments.mjs';
import {geographicDistance} from './track-geographic.mjs';
import {trackGeometry} from './track-canine.mjs';
import {smartSurfaceTransitions} from './track-smart-engine.mjs';
const same=(a,b)=>a?.[0]===b?.[0]&&a?.[1]===b?.[1];
const meters=(a,b)=>geographicDistance({x:a[0],y:a[1]},{x:b[0],y:b[1]});
export function missionRoute(draft,{minAngle=45,proposal=null}={}){
 const segments=[],points=draft?.points||[];let line=[];
 const flush=()=>{if(line.length>1)segments.push(line);line=[];};
 for(let i=1;i<points.length;i++){const coordinates=segmentCoordinates(points[i-1],points[i]);if(coordinates.length<2){flush();continue;}if(line.length&&!same(line.at(-1),coordinates[0]))flush();for(const p of coordinates)if(!same(line.at(-1),p))line.push(p);}
 flush();let distanceM=0;const samples=[],stations=[];
 for(const segment of segments){const origin=distanceM,distances=[0];for(let i=1;i<segment.length;i++)distances.push(distances.at(-1)+meters(segment[i-1],segment[i]));
  const geometry=trackGeometry(segment,{maxTurns:30,minAngle});for(const c of geometry.corners||[])stations.push({...c,kind:'angle',distanceM:origin+distances[c.index],label:`Changement de direction · ${c.angle}°`});
  const stride=Math.max(1,Math.ceil(segment.length/800));for(let i=0;i<segment.length;i++)if(i%stride===0||i===segment.length-1)samples.push({coordinate:segment[i],distanceM:origin+distances[i],segment:segments.indexOf(segment)});distanceM+=distances.at(-1);
 }
 const unchanged=!!proposal&&segments.length===1&&JSON.stringify(segments[0])===JSON.stringify(proposal.coordinates);
 if(unchanged)stations.push(...smartSurfaceTransitions(proposal));
 stations.sort((a,b)=>a.distanceM-b.distanceM);
 return {segments,samples,stations:stations.slice(0,60),distanceM,unchanged,valid:samples.length>1&&distanceM>0};
}
export function sampleMissionRoute(route,progress){
 if(!route?.valid)return {coordinate:null,distanceM:0,station:null};
 // Extra presentation time at documented observation points, not a canine speed model.
 const hold=25,total=route.distanceM+route.stations.length*hold,target=Math.max(0,Math.min(1,progress))*total;
 let distance=target,station=null;for(const [i,s] of route.stations.entries()){const begin=s.distanceM+i*hold;if(target>=begin&&target<=begin+hold){distance=s.distanceM;station=s;break;}if(target>begin+hold)distance-=hold;}
 distance=Math.max(0,Math.min(route.distanceM,distance));const samples=route.samples;
 let b=samples.findIndex(p=>p.distanceM>=distance);if(b<0)b=samples.length-1;let a=Math.max(0,b-1);
 // Never interpolate across a missing reference segment.
 if(samples[a].segment!==samples[b].segment)a=b;
 const span=samples[b].distanceM-samples[a].distanceM,f=span?(distance-samples[a].distanceM)/span:0;
 return {coordinate:samples[a].coordinate.map((v,i)=>v+(samples[b].coordinate[i]-v)*f),distanceM:distance,segment:samples[b].segment,station};
}
export function missionTimeline(poseAt,departureAt,position=0){
 const parse=v=>typeof v==='number'?v:typeof v==='string'&&v.trim()?Date.parse(v):NaN;
 const start=parse(poseAt),end=parse(departureAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start||end-start>31*86400000)return {valid:false,at:null,ageSeconds:null,reason:'Renseignez fin de pose et départ prévus dans l’ordre, sur une période maximale de 31 jours.'};
 const at=start+(end-start)*Math.max(0,Math.min(1,Number(position)||0));
 return {valid:true,start,end,at,ageSeconds:Math.round((at-start)/1000),plannedAgeSeconds:Math.round((end-start)/1000),provenance:'calculated-from-declarations'};
}
export const MISSION_WEATHER_LABELS={wind_speed_kmh:'Vent (km/h)',wind_direction_deg:'Vent venant de (°)',wind_gusts_kmh:'Rafales, maximum heure précédente (km/h)',temperature_c:'Température (°C)',humidity_pct:'Humidité (%)',precipitation_mm:'Précipitations, cumul heure précédente (mm)'};
export function missionEnvironment({at,rows=[],manual=null,weatherAllowed=true}={}){
 const selected=weatherAllowed?(manual||rows.find(r=>Number.isFinite(at)&&r.observedAt<=at&&at<r.observedAt+3600000)):null;
 const w=selected||null,direction=w&&Number.isFinite(w.wind_direction_deg)&&Number.isFinite(w.wind_speed_kmh)&&w.wind_speed_kmh>0?(w.wind_direction_deg+180)%360:null;
 const previous=w&&!manual?rows.filter(r=>r.observedAt<w.observedAt).at(-1):null;
 const changes=previous?Object.entries(MISSION_WEATHER_LABELS).flatMap(([k,label])=>Number.isFinite(previous[k])&&Number.isFinite(w[k])&&previous[k]!==w[k]?[`${label} : ${previous[k]} → ${w[k]}`]:[]):[];
 return {weather:w,direction,basis:w?(manual?'declared-constant':'provider-model'):'unavailable',changes,legend:'Schéma hypothétique non à l’échelle · ruban graphique fixe, pas une largeur physique. Aucun transport, concentration ou disparition d’odeur calculé.'};
}
