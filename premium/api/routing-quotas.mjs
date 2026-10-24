import {createClient} from '@supabase/supabase-js';
const URL='https://shnwqdkiapgcftbnhilh.supabase.co';
const KEY='sb_publishable_w8iEmNfmHoAGjkOKXwBEKw_3ujKEutO';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const token=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!token)return res.status(401).json({error:'Authentication required'});
 const secret=process.env.SUPABASE_V2_SERVICE_ROLE_KEY;
 if(!secret)return res.status(503).json({error:'Service unavailable'});
 try{
  const client=createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await client.auth.getUser(token);
  if(error||!user)return res.status(401).json({error:'Invalid session'});
  const check=await fetch(URL+'/functions/v1/coaching',{method:'POST',headers:{Authorization:'Bearer '+token,apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({operation:'admin-snapshot'})});
  if(!check.ok)return res.status(403).json({error:'Admin access required'});
  const profile=await check.json();
  if(!profile||!profile.summary||!Array.isArray(profile.members))return res.status(403).json({error:'Admin access required'});
  const admin=createClient(URL,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data, error:dbError}=await admin.from('v2_routing_daily_quotas').select('provider,quota_day,used,quota_limit').gte('quota_day',new Date(Date.now()-30*86400000).toISOString().slice(0,10)).order('quota_day',{ascending:false}).limit(100);
  if(dbError)throw Error('quota_query_failed');
  return res.status(200).json({rows:data||[],asOf:new Date().toISOString(),kind:'reserved_requests'});
 }catch(e){console.error('[routing-quota] unavailable');return res.status(503).json({error:'Quota metrics unavailable'});}
}
