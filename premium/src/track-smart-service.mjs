import {validateSmartOptions} from './track-smart-engine.mjs';
const finiteCenter=c=>Array.isArray(c)&&c.length===2&&Number.isFinite(c[0])&&Math.abs(c[0])<=180&&Number.isFinite(c[1])&&Math.abs(c[1])<=90;
export function createSmartTrackService({fetch=globalThis.fetch,clock=Date.now,timeoutMs=50000,getAuthorization=async()=>null}={}){
 const cache=new Map();
 async function request(url,{signal}={}){if(signal?.aborted)throw Error('Recherche interrompue.');const controller=new AbortController(),abort=()=>controller.abort();
  const interrupted=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new DOMException('Recherche interrompue','AbortError')),{once:true}));
  if(signal?.aborted)abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,timeoutMs);
  try{return await Promise.race([interrupted,(async()=>{
   const headers={Accept:'application/json',...(url.startsWith('/')?await getAuthorization():{})};
   if(controller.signal.aborted)throw new DOMException('Recherche interrompue','AbortError');
   const response=await fetch(url,{signal:controller.signal,credentials:url.startsWith('/')?'same-origin':'omit',referrerPolicy:'no-referrer',headers});
   if(!response.ok){let detail=null;try{detail=await response.json();}catch{}throw Error(typeof detail?.error==='string'?detail.error.slice(0,200):'Service cartographique indisponible. Réessayez plus tard.');}
   if(Number(response.headers?.get('content-length'))>10000000)throw Error('Zone trop dense. Réduisez la distance.');return await response.json();
  })()]);}catch(error){if(error.name==='AbortError')throw Error('Recherche interrompue ou trop longue.');if(error instanceof TypeError||error.message==='Load failed')throw Error('Connexion au service cartographique impossible. Réessayez dans un instant.');throw error;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }

 return {
  async communeAt(point,{signal}={}){if(!finiteCenter(point))throw Error('Point de départ invalide.');const [lon,lat]=point;
   const reverse=await request('https://data.geopf.fr/geocodage/reverse?'+new URLSearchParams({lon:String(lon),lat:String(lat),type:'municipality',limit:'1'}),{signal});
   const match=reverse?.features?.[0],code=match?.properties?.citycode||match?.properties?.id;
   if(!/^(?:\d{5}|2[AB]\d{3})$/.test(String(code||'')))throw Error('Commune introuvable pour ce départ. Recherchez-la manuellement.');
   const data=await request('https://geo.api.gouv.fr/communes/'+encodeURIComponent(code)+'?fields=nom,code,centre,departement',{signal});
   if(!data?.nom||!finiteCenter(data?.centre?.coordinates))throw Error('Informations de commune indisponibles.');
   return {code:data.code,name:data.nom,center:data.centre.coordinates,department:data.departement?.nom||data.code.slice(0,2)};
  },
  async searchCommunes(query,{signal}={}){const q=String(query||'').trim();if(q.length<2||q.length>80)throw Error('Renseignez un nom de commune ou un code postal.');const params=new URLSearchParams({fields:'nom,code,centre,codesPostaux,departement',limit:'8',boost:'population',...(/^\d{5}$/.test(q)?{codePostal:q}:{nom:q})});const data=await request('https://geo.api.gouv.fr/communes?'+params,{signal});if(!Array.isArray(data))throw Error('Réponse commune invalide.');return data.slice(0,8).filter(c=>typeof c.nom==='string'&&/^(?:\d{5}|2[AB]\d{3})$/.test(c.code)&&finiteCenter(c.centre?.coordinates)).map(c=>({code:c.code,name:c.nom,center:c.centre.coordinates,department:c.departement?.nom||c.code.slice(0,2)}));},
  async loadNetwork(commune,distanceKm,{signal,center=null}={}){const options=validateSmartOptions({commune:center&&finiteCenter(center)?{...commune,center}:commune,distanceKm,terrain:'mixed',transitions:'any'}),radius=Math.round(Math.min(6000,Math.max(1200,options.distanceKm*700+1000))),key=JSON.stringify([commune.code,options.commune.center,radius]),saved=cache.get(key);if(saved&&clock()-saved.at<900000)return saved.data;
   const [lon,lat]=options.commune.center;const data=await request('/api/track-network?'+new URLSearchParams({lon:String(lon),lat:String(lat),distanceKm:String(options.distanceKm)}),{signal});if(!Array.isArray(data?.elements)||data.elements.length>150000||data.remark)throw Error('Données cartographiques incomplètes. Réessayez plus tard.');if(signal?.aborted)throw Error('Recherche interrompue.');cache.set(key,{at:clock(),data});while(cache.size>2)cache.delete(cache.keys().next().value);return data;
  }
 };
}
