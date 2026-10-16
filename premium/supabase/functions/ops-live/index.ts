import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {createOpsLiveProposedHandler} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
if(new URL(url).origin!=='https://shnwqdkiapgcftbnhilh.supabase.co')throw Error('Projet V2 développement requis.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,serviceKey,options);
const authClient=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,options);
// Dedicated optional secret; fallback is domain-separated from the configured
// server credential. Never returned, logged, committed or sent to the browser.
const invitationKey=Deno.env.get('OPS_LIVE_SIGNING_KEY')||'piste-ops-live-v1:'+serviceKey;
Deno.serve(request=>{
 const origin=request.headers.get('origin')||'';
 const allowed=/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)||/^https:\/\/piste-community-v2-premium(?:-[a-z0-9-]+-mw2f59b8p2-4030s-projects)?\.vercel\.app$/.test(origin);
 return createOpsLiveProposedHandler({authClient,admin,enabled:true,invitationKey,allowedOrigins:allowed?[origin]:[],
  isSessionActive:async(actor,token)=>{try{const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.sub!==actor||typeof payload.session_id!=='string')return false;const r=await admin.rpc('ops_live_session_active',{p_actor:actor,p_session:payload.session_id});return !r.error&&r.data===true;}catch{return false;}},
  isAccountEnabled:async id=>{const r=await admin.from('coaching_remote_users').select('id').eq('id',id).eq('enabled',true).maybeSingle();if(r.error)throw Error('Accès indisponible.');return !!r.data;}
 })(request);
});
