// Private RPCs only. Raw codes are generated here and disclosed once, never persisted or logged.
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
export const normalizePremiumCode=value=>String(value??'').trim().toUpperCase().replace(/[\s-]/g,'');
async function rpc(admin,name,args){const r=await admin.rpc(name,args);if(r.error)fail(['PGRST202','42883'].includes(r.error.code)?'Les codes cadeaux sont en attente d’activation serveur.':'Opération de code cadeau refusée.',r.error.code==='42501'?403:['PGRST202','42883'].includes(r.error.code)?503:r.error.code==='22023'||r.error.code==='23514'||r.error.code==='22P02'?400:503);return r.data;}
export const loadPremiumCodeEntitlement=(admin,uid)=>rpc(admin,'v2_premium_code_entitlement',{p_actor:uid});
export const loadPremiumCodeCatalogue=(admin,uid,{page=0,historyPage=0}={})=>rpc(admin,'v2_premium_codes_admin',{p_actor:uid,p_action:'list',p_code_id:null,p_payload:{page:Number.isSafeInteger(page)&&page>=0?page:0,history_page:Number.isSafeInteger(historyPage)&&historyPage>=0?historyPage:0}});
export async function redeemPremiumCode(admin,uid,code){
 const normalized=typeof code==='string'&&code.length<=128?normalizePremiumCode(code):'';
 const result=await rpc(admin,'v2_premium_code_redeem',{p_actor:uid,p_hash:await digest(normalized)});
 if(!result?.ok){const reason=result?.reason;fail(reason==='rate_limited'?'Trop de tentatives. Réessayez dans quinze minutes.':reason==='already_used'?'Ce code a déjà été utilisé par votre compte.':reason==='account_disabled'?'Compte non autorisé.':'Code invalide, expiré, désactivé ou épuisé.',reason==='rate_limited'?429:reason==='already_used'?409:reason==='account_disabled'?403:400);}
 return result;
}
export async function managePremiumCode(admin,uid,action,payload={},id=null){
 if(action==='create-code'){
  if(!['1_month','3_months','1_year','permanent'].includes(payload.duration)||!Number.isSafeInteger(payload.max_uses)||payload.max_uses<1||payload.max_uses>100000||payload.confirmed!==true||!/^[-0-9a-f]{36}$/i.test(payload.requestId||''))fail('Paramètres de code cadeau invalides.');
  const bytes=crypto.getRandomValues(new Uint8Array(16)),hex=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
  const raw='PC-'+hex.match(/.{8}/g).join('-'),normalized=normalizePremiumCode(raw);
  const expires=payload.expiresAt||null;if(expires&&(!Number.isFinite(Date.parse(expires))||Date.parse(expires)<=Date.now()))fail('Expiration du code invalide.');
  const result=await rpc(admin,'v2_premium_codes_admin',{p_actor:uid,p_action:'create',p_code_id:null,p_payload:{code_hash:await digest(normalized),suffix:hex.slice(-4),duration:payload.duration,max_uses:payload.max_uses,request_id:payload.requestId,label:String(payload.label||'').slice(0,80),expires_at:expires,confirmed:true}});
  return {...result,...(result.created?{revealed_code:raw}:{notice:'Ce code a déjà été créé. Son secret ne peut pas être affiché une seconde fois.'})};
 }
 if(!['activate-code','deactivate-code'].includes(action)||!/^[-0-9a-f]{36}$/i.test(id||'')||payload.confirmed!==true)fail('Commande de code cadeau invalide.');
 return rpc(admin,'v2_premium_codes_admin',{p_actor:uid,p_action:'set-enabled',p_code_id:id,p_payload:{enabled:action==='activate-code',confirmed:true}});
}
