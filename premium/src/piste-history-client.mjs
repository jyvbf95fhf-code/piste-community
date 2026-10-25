import {COACHING_REMOTE as config} from './coaching-remote-config.mjs';
export function createPisteHistoryClient({client,getOwnerId,request=fetch}){
 async function call(body,owner=getOwnerId()){
  const assertOwner=()=>{if(!owner||getOwnerId()!==owner)throw Error('Le compte a changé.');};assertOwner();
  const auth=await client.auth.getSession();assertOwner();if(auth.error||auth.data?.session?.user?.id!==owner)throw Error('Connexion requise.');
  const r=await request(config.url+'/functions/v1/piste-history',{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+auth.data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
  const v=await r.json();assertOwner();if(!r.ok)throw Object.assign(Error(v.error||'Historique indisponible.'),{status:r.status});return v;
 }
 return {call,async catalogue(){const owner=getOwnerId(),sessions=[],hidden=[],records=[];for(const domain of ['coaching','hidden','ops','track']){let cursor=null;const seen=new Set();do{const v=await call({operation:'catalogue',domain,cursor},owner);sessions.push(...v.sessions);hidden.push(...v.hidden);records.push(...(v.records||[]));cursor=v.cursor;if(cursor&&seen.has(cursor))throw Error('Catalogue incomplet : actualisez.');seen.add(cursor);}while(cursor);}return {sessions,hidden,records};}};
}
