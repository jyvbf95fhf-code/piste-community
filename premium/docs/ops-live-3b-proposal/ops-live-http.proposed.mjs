// PREPARATION ONLY. Not imported by the application or any deployed Edge Function.
// No endpoint, SDK import, service credential or automatic deployment.
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const sign=async(keyText,value)=>{
 if(typeof keyText!=='string'||keyText.length<32)throw Error('Signing unavailable');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(keyText),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
};
const equal=(a,b)=>{if(typeof a!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;};
export function createOpsLiveProposedHandler({authClient,admin,isAccountEnabled,enabled=false,allowedOrigins=[],invitationKey=null,clock=Date.now,emitSignal=null}={}){
 if(!authClient||!admin||typeof isAccountEnabled!=='function')throw Error('Explicit server dependencies required.');
 return async request=>{
  const origin=request.headers.get('origin'),allowed=!origin||allowedOrigins.includes(origin);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed&&origin?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(!enabled)return reply({error:'Live OPS indisponible.'},503);
  if(!allowed)return reply({error:'Origine refusée.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'Méthode refusée.'},405);
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];if(!token)return reply({error:'Connexion requise.'},401);
  try{
   const {data,error}=await authClient.auth.getUser(token);const actor=data?.user?.id;
   if(error||!uuid(actor))return reply({error:'Connexion expirée.'},401);
   if(!await isAccountEnabled(actor))return reply({error:'Accès refusé.'},403);
   if(Number(request.headers.get('content-length')||0)>200000)return reply({error:'Requête trop volumineuse.'},413);
   // Bounded streaming read: do not buffer an arbitrarily large request body.
   const reader=request.body?.getReader();let size=0,chunks=[];
   if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>200000){await reader.cancel();return reply({error:'Requête trop volumineuse.'},413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({error:'Requête invalide.'},400);}
   if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'Requête invalide.'},400);
   const call=async(name,args)=>{const result=await admin.rpc(name,args);if(result.error)throw result.error;return result.data;};
   let result;
   if(body.operation==='prepare-publication'){
    if(typeof body.localMissionId!=='string'||!body.localMissionId||body.localMissionId.length>160)return reply({error:'Mission invalide.'},400);
    const id=body.id||crypto.randomUUID();if(!uuid(id))return reply({error:'Identifiant invalide.'},400);
    const existing=body.id?await call('ops_live_prepare',{p_id:id,p_actor:actor}):null;
    const creationPurpose=body.id?'republish':'create',creationExpectedVersion=existing?.version??-1;
    const creationExpiresAt=new Date(clock()+300000).toISOString();
    result={id,creationExpiresAt,creationPurpose,creationExpectedVersion,ticket:await sign(invitationKey,JSON.stringify([creationPurpose,actor,id,body.localMissionId,creationExpiresAt,creationExpectedVersion]))};
   }else if(body.operation==='list')result=await call('ops_live_list',{p_actor:actor});
   else if(body.operation==='notifications')result=await call('ops_live_notifications',{p_actor:actor});
   else if(body.operation==='habitual'){
    if(!uuid(body.userId)||typeof body.enabled!=='boolean')return reply({error:'Autorisation invalide.'},400);
    result=await call('ops_live_habitual',{p_actor:actor,p_owner:actor,p_user:body.userId,p_enabled:body.enabled});
   }else{
    if(!uuid(body.id))return reply({error:'Identifiant invalide.'},400);
    if(body.operation==='read')result=await call('ops_live_read',{p_id:body.id,p_actor:actor,p_after:body.after??0,p_version:body.version??null});
    else if(body.operation==='delete-live')result=await call('ops_live_delete',{p_id:body.id,p_actor:actor});
    else if(body.operation==='command'){
     if(!uuid(body.commandId)||!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion< -1||typeof body.type!=='string'||!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))return reply({error:'Commande invalide.'},400);
     let payload=structuredClone(body.payload),invitationToken=null;
     if(body.type==='publish'){
      const expires=Date.parse(payload.creationExpiresAt);
      if(!Number.isFinite(expires)||expires>clock()+300000||!['create','republish'].includes(payload.creationPurpose)||!Number.isSafeInteger(payload.creationExpectedVersion)||!equal(payload.ticket,await sign(invitationKey,JSON.stringify([payload.creationPurpose,actor,body.id,payload.localMissionId,payload.creationExpiresAt,payload.creationExpectedVersion]))))return reply({error:'Autorisation de publication expirée ou invalide.'},403);
      delete payload.ticket;
     }else if(body.type==='invite'){
      // Deterministic server HMAC yields the same secret on command retry;
      // only its SHA256 hash reaches SQL. No client-controlled entropy.
      if(typeof invitationKey!=='string'||invitationKey.length<32)return reply({error:'Invitations indisponibles.'},503);
      const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(invitationKey),{name:'HMAC',hash:'SHA-256'},false,['sign']);
      invitationToken=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(actor+':'+body.id+':'+body.commandId))),x=>x.toString(16).padStart(2,'0')).join('');
      payload={recipientId:payload.recipientId,tokenHash:await hash(invitationToken),expiresAt:payload.expiresAt};
     }else if(body.type==='join'){
      if(!/^[0-9a-f]{64}$/.test(payload.token||''))return reply({error:'Invitation invalide.'},400);
      payload={tokenHash:await hash(payload.token)};
     }
     result=await call('ops_live_commit',{p_id:body.id,p_actor:actor,p_command:body.commandId,p_expected:body.expectedVersion,p_type:body.type,p_payload:payload});
     if(invitationToken)result={...result,invitationToken};
     if(typeof emitSignal==='function'&&body.type!=='join'&&body.type!=='mark-notification-read'){
      try{const targets=await call('ops_live_signal_targets',{p_id:body.id,p_actor:actor});
       if(targets)for(const user of targets.users||[])await emitSignal({topic:'ops-live:'+targets.id+':'+targets.generation+':'+targets.epoch+':'+user,event:'version',payload:{id:targets.id,generation:targets.generation,version:targets.version,epoch:targets.epoch}});
      }catch{/* Committed data remains authoritative; periodic re-read recovers a lost signal. */}
     }
     // Secret is returned only to the verified owner after successful invite command.
    }else return reply({error:'Opération invalide.'},400);
   }
   return reply({result});
  }catch(error){const status=error.code==='42501'?403:error.code==='40001'||error.code==='23505'?409:error.code==='22023'||error.code==='23514'||error.code==='23503'?400:503;
   return reply({error:status===403?'Accès refusé.':status===409?'Conflit de synchronisation.':status===400?'Commande refusée.':'Service temporairement indisponible.'},status);
  }
 };
}
