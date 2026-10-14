const UPSTREAM='https://overpass-api.de/api/interpreter';
const retainedTags=['highway','surface','access','foot','barrier','construction','area','oneway:foot'];
export function createTrackNetworkHandler({fetch=globalThis.fetch,timeoutMs=30000}={}){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Méthode non autorisée.'});}
  const params=new URL(req.url,'https://piste.invalid').searchParams,keys=[...params.keys()];
  const read=k=>{const value=params.get(k);return value?.trim()?Number(value):NaN;},lon=read('lon'),lat=read('lat'),km=read('distanceKm');
  if(keys.some(k=>!['lon','lat','distanceKm'].includes(k)&&!['_vercel_share','_vercel_protection_bypass'].includes(k))||['lon','lat','distanceKm'].some(k=>params.getAll(k).length!==1)||!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(km)||km<.5||km>10)return res.status(400).json({error:'Zone ou distance de recherche invalide.'});
  const radius=Math.round(Math.min(6000,Math.max(1200,km*700+1000))),query=`[out:json][timeout:25][maxsize:10000000];way(around:${radius},${lat},${lon})[highway~"^(residential|living_street|pedestrian|service|unclassified|tertiary|tertiary_link|footway|path|track|cycleway|steps)$"];out body;>;out body qt;`;
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeoutMs),cancel=()=>abort.abort();req.on?.('aborted',cancel);
  try{
   const response=await fetch(UPSTREAM,{method:'POST',headers:{'User-Agent':'PISTECommunityV2/1.0','Accept':'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:query}).toString(),signal:abort.signal,credentials:'omit',redirect:'error'});
   if(!response.ok){console.warn('[track-network] upstream HTTP',response.status);return res.status(502).json({error:'Fournisseur cartographique momentanément indisponible. Réessayez dans un instant.'});}
   if(Number(response.headers?.get('content-length'))>10000000)return res.status(413).json({error:'Zone trop dense. Réduisez la distance.'});
   const data=await response.json();if(data.remark||!Array.isArray(data.elements)||data.elements.length>150000)return res.status(502).json({error:'Données cartographiques incomplètes. Réessayez plus tard.'});
   const elements=data.elements.filter(e=>['node','way'].includes(e.type)).map(e=>{const tags=Object.fromEntries(retainedTags.filter(k=>typeof e.tags?.[k]==='string').map(k=>[k,e.tags[k]]));return e.type==='node'?{type:'node',id:e.id,lat:e.lat,lon:e.lon,...(Object.keys(tags).length?{tags}:{})}:{type:'way',id:e.id,nodes:e.nodes,tags};});
   if(Buffer.byteLength(JSON.stringify({elements}))>4000000)return res.status(413).json({error:'Zone trop dense. Réduisez la distance.'});
   return res.status(200).json({elements});
  }catch(error){console.warn('[track-network] request failed',error.name);return res.status(abort.signal.aborted?504:502).json({error:abort.signal.aborted?'Recherche cartographique trop longue. Réessayez avec une distance plus courte.':'Connexion au fournisseur cartographique indisponible. Réessayez plus tard.'});}
  finally{clearTimeout(timer);req.off?.('aborted',cancel);}
 };
}
export default createTrackNetworkHandler();
