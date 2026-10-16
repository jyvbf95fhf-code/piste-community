import {COACHING_REMOTE as config} from './coaching-remote-config.mjs';
export function createOpsLiveTransport({client,ownerId,request=fetch}={}){
 if(client.supabaseUrl.replace(/\/$/,'')!=='https://shnwqdkiapgcftbnhilh.supabase.co')throw Error('Projet V2 requis.');
 return async body=>{
  const {data,error}=await client.auth.getSession();if(error||!data.session||data.session.user?.id!==ownerId)throw Object.assign(Error('Connexion requise.'),{status:401});
  const response=await request(config.url+'/functions/v1/ops-live',{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error||'Live indisponible.'),{status:response.status});return value.result;
 };
}
