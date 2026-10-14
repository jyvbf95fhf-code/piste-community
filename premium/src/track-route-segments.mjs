import {geographicCoordinates,geographicDistance} from './track-geographic.mjs';
export const routeSegmentKey=(a,b)=>JSON.stringify([a.x,a.y,b.x,b.y]);
export function normalizeTrackRoute(route,a,b){
 if(!route||!['IGN','OSM'].includes(route.provider)||route.key!==routeSegmentKey(a,b)||!Array.isArray(route.coordinates)||route.coordinates.length<2||route.coordinates.length>50000)throw Error('Itinéraire invalide.');
 const coordinates=route.coordinates.map(c=>{if(!Array.isArray(c)||c.length<2)throw Error('Itinéraire invalide.');geographicCoordinates({x:c[0],y:c[1]});return [c[0],c[1]];});
 if(geographicDistance(a,{x:coordinates[0][0],y:coordinates[0][1]})>100||geographicDistance(b,{x:coordinates.at(-1)[0],y:coordinates.at(-1)[1]})>100)throw Error('Choisissez des points plus proches des routes ou chemins.');
 return {key:route.key,provider:route.provider,coordinates};
}
export function routeForSegment(a,b){if(b?.space!=='wgs84'||b.incomingMode!=='follow'||b.breakBefore)return null;try{return normalizeTrackRoute(b.route,a,b);}catch{return null;}}
export function segmentCoordinates(a,b){if(b.breakBefore)return [];if(b.space==='wgs84'&&b.incomingMode==='follow'){const route=routeForSegment(a,b);return route?[[a.x,a.y],...route.coordinates,[b.x,b.y]]:[];}return [[a.x,a.y],[b.x,b.y]];}
export function segmentDistance(a,b){const coords=segmentCoordinates(a,b);return coords.slice(1).reduce((sum,c,i)=>sum+geographicDistance({x:coords[i][0],y:coords[i][1]},{x:c[0],y:c[1]}),0);}
export const trackHasPendingRoutes=points=>points.some((p,i)=>i>0&&p.space==='wgs84'&&p.incomingMode==='follow'&&!p.breakBefore&&!routeForSegment(points[i-1],p));
