import {createCoachingRemoteTransport} from './coaching-remote-transport.mjs';
const pending=new Map(),attempts=new Map();
const keyFor=id=>'piste-v2-coaching-live-end:'+id;
const read=(storage,key)=>{const value=JSON.parse(storage.getItem(key)||'[]');if(!Array.isArray(value)||value.some(id=>typeof id!=='string'))throw Error('File de clôture Live illisible.');return value;};
export async function flushCoachingLiveEnds({client,ownerId,storage=globalThis.localStorage,force=false}={}){
 if(!ownerId||!storage)return;if(pending.has(ownerId))return pending.get(ownerId);if(!force&&Date.now()-(attempts.get(ownerId)||0)<15000)return;attempts.set(ownerId,Date.now());
 const key=keyFor(ownerId),ids=read(storage,key);if(!ids.length)return;
 const task=(async()=>{for(const id of ids){const identity=await client.auth.getUser();if(identity.error||identity.data.user?.id!==ownerId)throw Error('Clôture Live en attente du compte propriétaire.');const transport=createCoachingRemoteTransport({client,sessionId:id});try{await transport.sendCommand('end-live');}catch(error){if(error.status!==403&&error.status!==404)throw error;const current=await client.auth.getUser();if(current.error||current.data.user?.id!==ownerId)throw error;}finally{transport.disconnect();}storage.setItem(key,JSON.stringify(read(storage,key).filter(value=>value!==id)));}})().finally(()=>pending.delete(ownerId));pending.set(ownerId,task);return task;
}
export function requestCoachingLiveEnd({client,ownerId,sessionId,storage=globalThis.localStorage}={}){
 if(!ownerId||!sessionId||!storage)return Promise.resolve();const key=keyFor(ownerId),ids=read(storage,key);if(!ids.includes(sessionId)){if(ids.length>=100)throw Error('Trop de clôtures Live en attente.');storage.setItem(key,JSON.stringify([...ids,sessionId]));}return flushCoachingLiveEnds({client,ownerId,storage,force:true});
}
