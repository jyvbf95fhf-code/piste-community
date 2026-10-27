import {normalizeTrackRoute} from './track-route-segments.mjs';
export function publicPreparedTrack(track){
 const geometry=track?.geometry;if(!geometry||(geometry.coordinateSpace&&geometry.coordinateSpace!=='wgs84')||!Array.isArray(geometry.points)||geometry.points.length<2||geometry.points.length>1500)throw Error('Seule une piste préparée géographique peut être partagée (2 à 1 500 points).');
 const points=geometry.points.map((p,i)=>{if(p.space!=='wgs84'||!Number.isFinite(p.x)||Math.abs(p.x)>180||!Number.isFinite(p.y)||Math.abs(p.y)>90)throw Error('Coordonnées du tracé invalides.');return {id:'shared-'+i,space:'wgs84',x:p.x,y:p.y,kind:i===0?'start':i===geometry.points.length-1?'arrival':'via',breakBefore:i>0&&p.breakBefore===true,incomingMode:i>0&&!p.breakBefore&&p.incomingMode==='follow'?'follow':i>0?'free':null,...(i>0&&!p.breakBefore&&p.incomingMode==='follow'?{route:normalizeTrackRoute(p.route,geometry.points[i-1],p)}:{})};});
 if(JSON.stringify(points).length>150000)throw Error('Tracé trop volumineux pour un lien privé.');
 const name=String(track.name||'Piste préparée').trim().slice(0,80);return {name,geometry:{coordinateSpace:'wgs84',points},provenance:'private-link-copy',source:'draw'};
}
export const shareExpiryHours=Object.freeze([1,24,168,720]);
