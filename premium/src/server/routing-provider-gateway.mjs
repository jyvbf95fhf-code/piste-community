// V2 server-only routing gateway. Not wired to the browser until a shared atomic quota store is configured.
// The quota store MUST implement reserve({provider,day,limit}) atomically across concurrent requests.
const limits={geoapify:3000,ors:2000};
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=180&&Math.abs(p.y)<=90;
const route=data=>{const g=data?.features?.[0]?.geometry;return g?.type==='LineString'?g.coordinates:g?.type==='MultiLineString'?g.coordinates.flat():null;};
function normalize(data,provider){const coordinates=route(data);if(!Array.isArray(coordinates)||coordinates.length<2||coordinates.some(p=>!Array.isArray(p)||!valid({x:p[0],y:p[1]})))throw Error('Géométrie non valide');return {provider,coordinates};}
export function createRoutingGateway({fetch,geoapifyKey,orsKey,quota,onWarning=()=>{}}){
 if(typeof fetch!=='function'||typeof quota?.reserve!=='function')throw Error('Compteur atomique requis : routage désactivé');
 async function call(provider,a,b){
  const limit=limits[provider],day=new Date().toISOString().slice(0,10);
  const r=await quota.reserve({provider,day,limit});
  if(!r||typeof r.allowed!=='boolean')throw Error('Compteur indisponible');
  if(r.used>=Math.floor(limit*.8))await onWarning({provider,used:r.used,limit});
  if(!r.allowed)throw Object.assign(Error('Quota atteint'),{retryable:true});
  let url,options;
  if(provider==='geoapify'){
   const q=new URLSearchParams({waypoints:`${a.y},${a.x}|${b.y},${b.x}`,mode:'walk',apiKey:geoapifyKey});
   url=`https://api.geoapify.com/v1/routing?${q}`;options={redirect:'error'};
  }else{
   url='https://api.heigit.org/openrouteservice/v2/directions/foot-walking/geojson';
   options={method:'POST',redirect:'error',headers:{Authorization:orsKey,'Content-Type':'application/json'},body:JSON.stringify({coordinates:[[a.x,a.y],[b.x,b.y]]})};
  }
  const res=await fetch(url,options);
  if(!res.ok)throw Object.assign(Error(`${provider} HTTP ${res.status}`),{retryable:[429,500,502,503,504].includes(res.status)});
  return normalize(await res.json(),provider);
 }
 return {async calculate(a,b){
  if(!valid(a)||!valid(b))throw Error('Coordonnées invalides');
  let error;
  for(const provider of ['geoapify','ors']){
   if(provider==='geoapify'&&!geoapifyKey||provider==='ors'&&!orsKey)continue;
   try{return await call(provider,a,b);}catch(e){error=e;if(!e.retryable&&!(e.message||'').includes('Géométrie'))break;}
  }
  throw Object.assign(Error('Calcul indisponible ; conserver les points et proposer le tracé libre'),{cause:error});
 }};
}
