import {geographicCoordinates} from './track-geographic.mjs';
import {normalizeTrackRoute,routeSegmentKey} from './track-route-segments.mjs';

const API='https://data.geopf.fr/navigation/itineraire';
const sleep=(ms,signal)=>new Promise((resolve,reject)=>{if(signal?.aborted)return reject(Object.assign(Error('Calcul interrompu.'),{name:'AbortError'}));const t=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},ms);const stop=()=>{clearTimeout(t);reject(Object.assign(Error('Calcul interrompu.'),{name:'AbortError'}));};signal?.addEventListener('abort',stop,{once:true});});
const geometryOf=data=>data?.geometry?.type==='LineString'?data.geometry:data?.route?.geometry?.type==='LineString'?data.route.geometry:data?.features?.[0]?.geometry?.type==='LineString'?data.features[0].geometry:null;
export function createTrackRoutingService({fetch=globalThis.fetch,timeoutMs=15000,getAccessToken}={}){
 return {async calculate(a,b,{signal}={}){
  geographicCoordinates(a);geographicCoordinates(b);
  const controller=new AbortController(),abort=()=>controller.abort();
  if(signal?.aborted)abort();signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,timeoutMs);
  try{
   if(getAccessToken){
    const token=await getAccessToken();
    if(!token)throw Error('Connectez-vous pour calculer un itinéraire.');
    const response=await fetch('/api/route',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({a,b}),signal:controller.signal,credentials:'same-origin'});
    if(!response.ok)throw Error('Calcul piéton indisponible. Réessayez ou conservez les points.');
    const data=await response.json();
    const provider=data.provider==='geoapify'?'Geoapify':data.provider==='ors'?'ORS':null;
    if(!provider)throw Error('Fournisseur de routage invalide.');
    return normalizeTrackRoute({key:routeSegmentKey(a,b),provider,coordinates:data.coordinates},a,b);
   }
   const params=new URLSearchParams({resource:'bdtopo-osrm',start:`${a.x},${a.y}`,end:`${b.x},${b.y}`,profile:'pedestrian',optimization:'shortest',geometryFormat:'geojson',getSteps:'false',distanceUnit:'meter',timeUnit:'second',crs:'EPSG:4326'});
   let lastError=null;
   for(const engine of ['bdtopo-osrm','bdtopo-valhalla']){
    params.set('resource',engine);
    const url=`${API}?${params}`;
    for(let attempt=0;attempt<3;attempt++){
     const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',headers:{Accept:'application/json'}});
     if(!response.ok){
      let detail='';try{const body=await response.text();let parsed;try{parsed=JSON.parse(body);}catch{}const raw=parsed?.message||parsed?.error?.message||parsed?.error||parsed?.detail||parsed?.description||'';detail=typeof raw==='string'?raw.slice(0,220):'';}catch{}lastError=Error(`Calcul IGN ${engine} indisponible (HTTP ${response.status})${detail?' : '+detail:''}.`);
      if([429,500,502,503,504].includes(response.status)&&attempt<2){await sleep(450*(attempt+1),controller.signal);continue;}
      break;
     }
     let data;try{data=await response.json();}catch{lastError=Error('Réponse IGN illisible.');break;}
     const geometry=geometryOf(data);
     if(!geometry||!Array.isArray(geometry.coordinates)){lastError=Error('Réponse IGN sans itinéraire piéton exploitable.');break;}
     try{return normalizeTrackRoute({key:routeSegmentKey(a,b),provider:'IGN',coordinates:geometry.coordinates},a,b);}
     catch(error){lastError=error;break;}
    }
   }
   throw lastError||Error('Aucun itinéraire IGN disponible.');
  }catch(error){
   if(error.name==='AbortError')throw Error('Calcul IGN interrompu ou trop long.');
   if(error instanceof TypeError)throw Error('Connexion au service IGN impossible (réseau ou accès navigateur).');
   throw error;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }};
}
