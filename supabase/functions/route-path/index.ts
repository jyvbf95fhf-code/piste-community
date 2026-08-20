const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST')return Response.json({error:'Méthode non autorisée.'},{status:405,headers:corsHeaders})
  const auth=req.headers.get('Authorization')
  if(!auth?.startsWith('Bearer '))return Response.json({error:'Authentification requise.'},{status:401,headers:corsHeaders})
  try{
    const body=await req.json(),points=Array.isArray(body?.points)?body.points:[],profile=body?.profile==='foot-walking'?'foot-walking':'foot-hiking'
    if(points.length<2||points.length>50)throw new Error('Deux à cinquante points sont requis.')
    const coordinates=points.map((p:{lat:number,lon:number})=>{const lat=Number(p.lat),lon=Number(p.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180)throw new Error('Coordonnées invalides.');return[lon,lat]})
    const key=Deno.env.get('ORS_API_KEY')
    if(!key)throw new Error('Le service de routage n’est pas encore configuré.')
    const routed=await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`,{method:'POST',headers:{Authorization:key,'Content-Type':'application/json'},body:JSON.stringify({coordinates,instructions:false,elevation:false})})
    const data=await routed.json()
    if(!routed.ok||!data?.features?.[0]?.geometry?.coordinates)throw new Error(data?.error?.message||'Aucun itinéraire trouvé.')
    return Response.json({points:data.features[0].geometry.coordinates.map(([lon,lat]:[number,number])=>({lat,lon})),distance_m:data.features[0].properties?.summary?.distance??null,profile},{headers:corsHeaders})
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:'Calcul impossible.'},{status:400,headers:corsHeaders})
  }
})
