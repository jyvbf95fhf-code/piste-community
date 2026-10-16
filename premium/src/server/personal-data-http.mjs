import {PERSISTENCE_KINDS,persistenceUuid,validatePersistenceRecord} from '../persistence-contract.mjs';
import {preparePersistenceCandidate} from '../persistence-domain-adapters.mjs';
import {profileIdentity} from '../persistence-journal.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function createPersonalDataHandler({authenticate,enabled,repositoryFor}={}){
 return async request=>{
  const origin=request.headers.get('origin')||'',allowed=!origin||/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)||/^https:\/\/piste-community-v2-premium(?:-[a-z0-9-]+-mw2f59b8p2-4030s-projects)?\.vercel\.app$/.test(origin);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin&&allowed?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  try{
   if(!allowed)fail('Origine non autorisée.',403);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')fail('Méthode non autorisée.',405);
   const chunks=[];let length=0;const reader=request.body?.getReader();
   if(Number(request.headers.get('content-length')||0)>200000){await reader?.cancel();fail('Requête trop volumineuse.',413);}
   if(reader)for(;;){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.byteLength;if(length>200000){await reader.cancel();fail('Requête trop volumineuse.',413);}chunks.push(chunk.value);}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{fail('Requête invalide.');}
   const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];if(!token)fail('Connexion requise.',401);const user=await authenticate(token);if(!user?.id)fail('Connexion expirée.',401);if(!await enabled(user.id))fail('Compte non autorisé pour ce pilote.',403);
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['operation','kind','id','cursor','commandId','expectedRevision','payload'].includes(k)))fail('Commande invalide.');
   if(!PERSISTENCE_KINDS.includes(body.kind))fail('Domaine invalide.');const repository=repositoryFor(user.id);
   if(body.operation==='list'){if(body.cursor!=null&&!persistenceUuid(body.cursor))fail('Curseur invalide.');return respond(await repository.list({kind:body.kind,cursor:body.cursor??null}));}
   if(!persistenceUuid(body.id))fail('Identifiant invalide.');
   if(body.operation==='read'){const record=await repository.read({kind:body.kind,id:body.id});if(!record)fail('Dossier inaccessible.',404);return respond({record:validatePersistenceRecord(record)});}
   if(!['put','remove'].includes(body.operation)||!persistenceUuid(body.commandId)||!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)fail('Commande invalide.');
   if(body.kind==='profile'&&body.id!==await profileIdentity(user.id))fail('Identité de profil invalide.');
   let payload={};if(body.operation==='put'){
    try{payload=preparePersistenceCandidate({kind:body.kind,localId:body.kind==='ops'?body.payload?.id:body.id,value:body.payload}).payload;}catch{fail('Données de sauvegarde invalides.');}
    const dogId=body.kind==='profile'?payload.primary_dog_id:payload.dogId;
    if(dogId&&!persistenceUuid(dogId))fail('Référence chien invalide.');
   }
   const record=await repository[body.operation]({kind:body.kind,id:body.id,commandId:body.commandId,expectedRevision:body.expectedRevision,payload});return respond({record:validatePersistenceRecord(record)});
  }catch(error){return respond({error:error.status?error.message:'Service de sauvegarde indisponible.'},error.status||503);}
 };
}
