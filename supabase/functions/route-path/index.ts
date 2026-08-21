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
    if(points.length<2||points.length>5)throw new Error('Deux à cinq points sont requis.')
    const coordinates=points.map((p:{lat:number,lon:number})=>{const lat=Number(p.lat),lon=Number(p.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180)throw new Error('Coordonnées invalides.');return{lat,lon}})
    const key=Deno.env.get('GRAPHHOPPER_API_KEY')
    if(!key)throw new Error('Le service de routage n’est pas encore configuré.')
    const query=new URLSearchParams({key,profile:profile==='foot-walking'?'foot':'hike',points_encoded:'false',instructions:'false',locale:'fr'})
    coordinates.forEach(({lat,lon})=>query.append('point',`${lat},${lon}`))
    const routed=await fetch(`https://graphhopper.com/api/1/route?${query.toString()}`)
    const data=await routed.json()
    if(!routed.ok||!data?.paths?.[0]?.points?.coordinates)throw new Error(data?.message||'Aucun itinéraire trouvé.')
    return Response.json({points:data.paths[0].points.coordinates.map(([lon,lat]:[number,number])=>({lat,lon})),distance_m:data.paths[0].distance??null,profile,provider:'graphhopper'},{headers:corsHeaders})
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:'Calcul impossible.'},{status:400,headers:corsHeaders})
  }
})
