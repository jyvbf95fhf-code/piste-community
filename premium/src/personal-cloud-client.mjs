import {COACHING_REMOTE as config} from './coaching-remote-config.mjs';
import {validatePersistenceRecord} from './persistence-contract.mjs';
export function createPersonalCloudRepository({client,ownerId,request=fetch}={}){
 let disposed=false;const pending=new Set();
 const active=()=>{if(disposed)throw Error('Synchronisation fermée.');};
 async function call(body){active();const auth=await client.auth.getSession();active();const session=auth.data?.session;if(auth.error||!session||session.user?.id!==ownerId)throw Object.assign(Error('Le compte de sauvegarde a changé.'),{status:401});const controller=new AbortController();pending.add(controller);const timer=setTimeout(()=>controller.abort(),20000);
  try{const response=await request(config.url+'/functions/v1/personal-data',{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});active();const value=await response.json();active();if(!response.ok)throw Object.assign(Error(value.error||'Sauvegarde indisponible.'),{status:response.status});return value;}finally{clearTimeout(timer);pending.delete(controller);}
 }
 return {
  async list(args){const value=await call({operation:'list',...args});return {...value,records:value.records.map(validatePersistenceRecord)};},
  async read(args){try{return validatePersistenceRecord((await call({operation:'read',...args})).record);}catch(e){if(e.status===404)return null;throw e;}},
  async put(c){return validatePersistenceRecord((await call({operation:'put',kind:c.kind,id:c.id,expectedRevision:c.expectedRevision,commandId:c.commandId,payload:c.payload})).record);},
  async remove(c){return validatePersistenceRecord((await call({operation:'remove',kind:c.kind,id:c.id,expectedRevision:c.expectedRevision,commandId:c.commandId})).record);},
  dispose(){disposed=true;for(const controller of pending)controller.abort();pending.clear();}
 };
}
