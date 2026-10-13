import {geographicCoordinates} from './track-geographic.mjs';
import {normalizeTrackRoute,routeSegmentKey} from './track-route-segments.mjs';
export function createTrackRoutingService({fetch=globalThis.fetch,timeoutMs=15000}={}){
 return {async calculate(a,b,{signal}={}){
  geographicCoordinates(a);geographicCoordinates(b);const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,timeoutMs);
  try{const params=new URLSearchParams({resource:'bdtopo-osrm',start:`${a.x},${a.y}`,end:`${b.x},${b.y}`,profile:'pedestrian',optimization:'shortest',geometryFormat:'geojson',getSteps:'false',distanceUnit:'meter',crs:'EPSG:4326'});
   const response=await fetch(`https://data.geopf.fr/navigation/itineraire?${params}`,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('Calcul IGN indisponible.');
   const data=await response.json();if(data.profile!=='pedestrian'||data.geometry?.type!=='LineString')throw Error('Réponse IGN invalide.');
   return normalizeTrackRoute({key:routeSegmentKey(a,b),provider:'IGN',coordinates:data.geometry.coordinates},a,b);
  }catch(error){if(error.name==='AbortError')throw Error('Calcul interrompu ou trop long.');throw error;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }};
}
