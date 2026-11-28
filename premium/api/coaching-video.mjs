import {COACHING_REMOTE} from '../src/coaching-remote-config.mjs';
import {coachingCameraInUse,validVideoPilotRequest,videoPilotAccess,videoPilotConfig,videoPilotToken} from '../src/server/coaching-video-pilot.mjs';

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Méthode invalide.'});
 const body=req.body;
 const pilot=videoPilotConfig(process.env,body?.sessionType);
 if(!pilot)return res.status(503).json({error:'Vidéo de test non configurée.'});
 const token=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!token)return res.status(401).json({error:'Connexion requise.'});
 if(!validVideoPilotRequest(body))return res.status(400).json({error:'Demande vidéo invalide.'});
 const headers={apikey:COACHING_REMOTE.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'};
 try{
  const identity=await fetch(COACHING_REMOTE.url+'/auth/v1/user',{headers,signal:AbortSignal.timeout(6000)});
  if(!identity.ok)return res.status(401).json({error:'Compte non vérifié.'});
  const {id}=await identity.json();
  if(body.kind==='camera'&&id!==pilot.publisher)return res.status(403).json({error:'Diffusion vidéo non autorisée.',code:'publisher-unavailable'});
  const premium=await fetch(COACHING_REMOTE.endpoint,{method:'POST',headers,
   body:JSON.stringify({operation:'authorize-feature',feature:'premium'}),signal:AbortSignal.timeout(6000)});
  if(premium.status===403)return res.status(403).json({error:'Un accès Premium actif est nécessaire pour la vidéo en direct.'});
  if(!premium.ok||(await premium.json()).authorized!==true)return res.status(503).json({error:'Vérification Premium indisponible.'});
  if(body.sessionType==='ops'){
   const requestOps=async operation=>{
    const response=await fetch(COACHING_REMOTE.url+'/functions/v1/ops-live',{method:'POST',headers,
     body:JSON.stringify({operation,id:body.sessionId}),signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Object.assign(Error('OPS Live'),{opsStatus:response.status,operation});
    return (await response.json()).result;
   };
   const head=await requestOps('head');
   const active=head?.id===body.sessionId&&head.closed===false&&head.missionFinished!==true&&
    ['En cours','Pause'].includes(head.metadata?.state)&&Number.isSafeInteger(head.generation);
   if(!active)return res.status(409).json({error:'Le Live OPS doit être actif sur cette mission.'});
   // OPS returns ownership relative to the authenticated caller, never the owner's ID.
   const permitted=active&&(body.kind==='camera'
    ?(await requestOps('list'))?.some(row=>row.id===head.id&&row.isOwner===true&&row.generation===head.generation&&!row.closed)
    :id!==pilot.publisher&&await isPilotOpsPublication(head,pilot.publisher));
   if(!permitted)return res.status(403).json({error:'Droits du propriétaire de la mission OPS non confirmés.'});
   return res.json(body.action==='check'?{available:true}:{url:pilot.url,token:videoPilotToken(pilot,{...body,identity:id,generation:head.generation})});
  }
  const readCoaching=operation=>fetch(COACHING_REMOTE.endpoint,{method:'POST',headers,
   body:JSON.stringify({operation,sessionId:body.sessionId}),signal:AbortSignal.timeout(8000)});
  const session=await readCoaching('read');
  if(!session.ok&&session.status!==403)return res.status(503).json({error:'Accès vidéo indisponible.'});
  const member=session.ok?(await session.json()).projection:null;
  let projection=member;
  if(body.kind==='viewer'&&body.surface!=='session'){
   const live=await readCoaching('community-live-read');
   if(!live.ok)return res.status(live.status>=500?503:403).json({error:'Accès vidéo indisponible.'});
   ({projection}=await live.json());
  }
  if(!videoPilotAccess(pilot,id,{...body,projection,member}))return res.status(403).json({error:'Vidéo non autorisée pour cette séance.'});
  if(body.kind==='camera'&&body.action==='join'&&await coachingCameraInUse(pilot,body.sessionId)){
   return res.status(409).json({error:'Une caméra diffuse déjà dans cette séance.'});
  }
  if(body.action==='check'&&body.surface==='session'){
   const broadcasting=await coachingCameraInUse(pilot,body.sessionId,{publishedOnly:true}).catch(()=>false);
   return res.json({available:true,broadcasting});
  }
  return res.json(body.action==='check'?{available:true}:{url:pilot.url,token:videoPilotToken(pilot,{...body,identity:id})});
 }catch(error){
  if(error?.opsStatus)return res.status(503).json({error:'Vérification Live OPS indisponible ('+error.operation+' · HTTP '+error.opsStatus+').'});
  return res.status(503).json({error:'Service vidéo indisponible.'});
 }
}

async function isPilotOpsPublication(head,publisher){
 const secret=process.env.SUPABASE_V2_SERVICE_ROLE_KEY;
 if(!secret)return false;
 const url=new URL('/rest/v1/ops_live_publications',COACHING_REMOTE.url);
 url.search=new URLSearchParams({select:'id',id:'eq.'+head.id,owner_id:'eq.'+publisher,
  generation:'eq.'+head.generation,sharing:'eq.true',closed_at:'is.null',limit:'1'});
 const response=await fetch(url,{headers:{apikey:secret,Authorization:'Bearer '+secret},signal:AbortSignal.timeout(6000)});
 return response.ok&&(await response.json()).length===1;
}
