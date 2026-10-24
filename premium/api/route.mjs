import {createClient} from '@supabase/supabase-js';
import {createRoutingGateway} from '../src/server/routing-provider-gateway.mjs';
const PROJECT='https://shnwqdkiapgcftbnhilh.supabase.co';
const PUBLIC_KEY='sb_publishable_w8iEmNfmHoAGjkOKXwBEKw_3ujKEutO';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 // Never allow public anonymous use of billable routing.
 const token=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!token)return res.status(401).json({error:'Authentification requise'});
 const secret=process.env.SUPABASE_V2_SERVICE_ROLE_KEY;
 if(!secret||!process.env.GEOAPIFY_API_KEY){console.error('[routing] missing_server_configuration');return res.status(503).json({error:'Routage non configuré',code:'CONFIG_MISSING'});}
 try{
  const auth=createClient(PROJECT,PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await auth.auth.getUser(token);
  if(error||!user){console.warn('[routing] auth_rejected');return res.status(401).json({error:'Session invalide',code:'AUTH_REJECTED'});}
  // Server-authoritative entitlement check: the V2 Coaching Edge Function reads
  // protected app_metadata and current gifts/codes. Never trust client flags.
  let premiumResponse;
  try{
   premiumResponse=await fetch(PROJECT+'/functions/v1/coaching',{
    method:'POST',headers:{'Content-Type':'application/json',apikey:PUBLIC_KEY,Authorization:'Bearer '+token},
    body:JSON.stringify({operation:'authorize-feature',feature:'premium'}),signal:AbortSignal.timeout(8000)
   });
  }catch{
   return res.status(503).json({error:'Vérification Premium temporairement indisponible',code:'ENTITLEMENT_UNAVAILABLE'});
  }
  if(premiumResponse.status===403)return res.status(403).json({error:'Tracé intelligent réservé aux membres Premium',code:'PREMIUM_REQUIRED'});
  if(!premiumResponse.ok)return res.status(503).json({error:'Vérification Premium indisponible',code:'ENTITLEMENT_UNAVAILABLE'});
  const premiumResult=await premiumResponse.json().catch(()=>null);
  if(premiumResult?.authorized!==true||premiumResult?.permissions?.premium!==true)return res.status(403).json({error:'Tracé intelligent réservé aux membres Premium',code:'PREMIUM_REQUIRED'});
  const admin=createClient(PROJECT,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const quota={reserve:async({provider})=>{
   const {data,error}=await admin.rpc('v2_reserve_routing_credit',{p_provider:provider});
   if(error)throw Error('Compteur de quota indisponible');
   const result=Array.isArray(data)?data[0]:data;
   if(!result||typeof result.allowed!=='boolean')throw Error('Réservation de quota invalide');
   return {allowed:result.allowed,used:result.used};
  }};
  const gateway=createRoutingGateway({fetch:globalThis.fetch,geoapifyKey:process.env.GEOAPIFY_API_KEY,orsKey:process.env.ORS_API_KEY,quota});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const result=await gateway.calculate(body?.a,body?.b);
  return res.status(200).json(result);
 }catch(error){
  console.error('[routing] request_failed',{category:error?.cause?.message?.includes('quota')?'quota':error?.message?.includes('quota')?'quota':'provider_or_backend',providerStatus:(error?.cause?.message||'').match(/HTTP (\d{3})/)?.[1]||null});
  return res.status(503).json({error:'Calcul indisponible ; les points restent conservés',code:'ROUTING_UNAVAILABLE'});
 }
}
