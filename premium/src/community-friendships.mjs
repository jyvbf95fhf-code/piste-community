import {createCommunityStore} from './community-store.mjs';
import {planLocalFriendshipRecovery} from './community-friendship-recovery.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
// Account-bound projection, not a second friendship database. Other Community state stays intact.
export function createCommunityFriendships({baseStore,ownerId,ownerName='Moi',getOwnerId=()=>ownerId,call,onChange=()=>{},afterRemove=()=>{},getLivePermission=id=>baseStore.getContactPermissions(id)?.live_access_authorized===true,setLivePermission=(id,value)=>baseStore.setContactPermission(id,'live_access_authorized',value)}={}){
 if(!uuid(ownerId))throw Error('Compte réel requis.');
 const recoveryPlan=planLocalFriendshipRecovery(baseStore.getState(),ownerId);
 let disposed=false,epoch=0,projection=null,pending=false,loading=false,ready=false,message='',inFlight=null;
 const profiles=new Map([[ownerId,{id:ownerId,displayName:ownerName,dogIds:[]}]]),active=()=>!disposed&&getOwnerId()===ownerId;
 const empty=()=>createCommunityStore({viewerId:ownerId,profiles:[...profiles.values()],posts:[],contacts:[],contactRequests:[],follows:[],notifications:[]});
 let view=empty();
 function clear(){projection=null;ready=false;view.replaceContactProjection({viewerId:ownerId,contacts:[],contactRequests:[]});}
 function dropAccount(){profiles.clear();projection=null;ready=false;view=empty();}
 function accept(value){
  if(value?.version!==1||value.ownerId!==ownerId||!['contacts','received','sent','relations'].every(k=>Array.isArray(value[k])))throw Error('Projection des amitiés invalide.');
  const person=(id,name)=>{if(!uuid(id)||id===ownerId||typeof name!=='string'||!name.trim()||name.length>80)throw Error('Profil distant invalide.');profiles.set(id,{id,displayName:name,dogIds:[]});};
  for(const c of value.contacts){person(c.id,c.displayName||c.name);if(typeof c.quick_coaching_invite_authorized!=='boolean')throw Error('Permission distante invalide.');}
  for(const r of value.received){if(r.toUserId!==ownerId||r.status!=='pending')throw Error('Demande distante invalide.');person(r.fromUserId,r.name);}
  for(const r of value.sent){if(r.fromUserId!==ownerId||r.status!=='pending')throw Error('Demande distante invalide.');person(r.toUserId,r.name);}
  for(const r of value.relations)if(!uuid(r.peerId)||r.peerId===ownerId||!Number.isSafeInteger(r.version)||r.version<0)throw Error('Version distante invalide.');
  if(value.socialVersion===1&&(!Array.isArray(value.following)||!value.following.every(uuid)||!Array.isArray(value.livePermissions)||!value.livePermissions.every(r=>uuid(r.peerId)&&typeof r.enabled==='boolean')))throw Error('Préférences sociales invalides.');
  projection=structuredClone(value);
  view.replaceContactProjection({viewerId:ownerId,profiles:[...profiles.values()],contacts:value.contacts.map(c=>({userIds:[ownerId,c.id],quick_coaching_invite_authorized:c.quick_coaching_invite_authorized})),contactRequests:[...value.received,...value.sent]});ready=true;
 }
 async function refresh(){
  if(!active()){dropAccount();return;}if(inFlight)return inFlight;
  const ticket=++epoch;loading=true;message='Chargement des amitiés…';onChange();
  inFlight=(async()=>{try{const value=await call({operation:'community-friendship-snapshot'});if(active()&&ticket===epoch){accept(value);message='';}else dropAccount();}
   catch(error){if(active()&&ticket===epoch){clear();message=error.message||'Amis indisponibles.';}throw error;}
   finally{if(ticket===epoch){loading=false;inFlight=null;if(active())onChange();}}
  })();return inFlight;
 }
 async function command(action,peerId,extra={}){
  if(!active())throw Error('Le compte a changé.');if(pending)throw Error('Une demande est déjà en cours.');if(!uuid(peerId)||peerId===ownerId)throw Error('Choisissez un profil réel.');
  const expectedVersion=projection?.relations.find(r=>r.peerId===peerId)?.version??-1;pending=true;onChange();
  try{const result=await call({operation:'community-friendship-command',action,peerId,commandId:crypto.randomUUID(),expectedVersion,...extra});if(!active()){dropAccount();throw Error('Le compte a changé.');}if(action==='remove-contact')await afterRemove(peerId);if(inFlight)await inFlight.catch(()=>{});await refresh();return result;}
  catch(error){if(active()){message=error.message;if(error.status===409){await refresh().catch(()=>{});message=error.message;}}throw error;}
  finally{pending=false;if(active())onChange();}
 }
 const requestAction=(action,id)=>{const r=[...(projection?.received||[]),...(projection?.sent||[])].find(r=>r.id===id);if(!r)throw Error('Demande indisponible : actualisez les contacts.');return command(action,r.fromUserId===ownerId?r.toUserId:r.fromUserId);};
 const overrides={refreshFriendships:refresh,getSocialVersion:()=>projection?.socialVersion||0,
  getRelation:id=>({...view.getRelation(id),...(projection?.socialVersion===1?{following:projection.following.includes(id)}:{})}),
  getState:()=>({...view.getState(),...(projection?.socialVersion===1?{follows:projection.following.map(id=>({fromUserId:ownerId,toUserId:id}))}:{})}),
  follow:id=>projection?.socialVersion===1?command('follow',id):view.follow(id),unfollow:id=>projection?.socialVersion===1?command('unfollow',id):view.unfollow(id),
  async findMembers(query){if(!active())throw Error('Le compte a changé.');const text=String(query||'').trim();if(text.length<2)return [];const value=await call({operation:'community-member-search',query:text});if(!active())throw Error('Le compte a changé.');if(!Array.isArray(value.members))throw Error('Recherche de membres indisponible.');for(const p of value.members){if(!uuid(p.id)||p.id===ownerId||typeof p.displayName!=='string'||!p.displayName.trim())throw Error('Profil distant invalide.');profiles.set(p.id,{id:p.id,displayName:p.displayName,dogIds:[]});}if(projection)accept(projection);onChange();return value.members;},searchContacts:query=>uuid(query)?[view.getProfile(query)].filter(Boolean):view.searchContacts(query),getFriendshipStatus:()=>({ready:active()&&ready,loading,pending,message}),getRecoveryPlan:()=>active()?structuredClone(recoveryPlan):{candidates:[],unverifiable:[],autoConfirmed:0},
  sendContactRequest:id=>command('contact-request',id),acceptContactRequest:id=>requestAction('accept-contact',id),refuseContactRequest:id=>requestAction('refuse-contact',id),cancelContactRequest:id=>requestAction('cancel-contact',id),removeContact:id=>command('remove-contact',id),
  setContactPermission:(id,permission,enabled)=>permission==='live_access_authorized'&&projection?.socialVersion!==1?setLivePermission(id,enabled):command('set-contact-permission',id,{permission,enabled}),
  getContactPermissions:id=>{const p=view.getContactPermissions(id);return p?{...p,live_access_authorized:projection?.socialVersion===1?projection.livePermissions.some(r=>r.peerId===id&&r.enabled===true):getLivePermission(id)===true}:null;},
  async resolveProfile(id){if(!active()||!uuid(id)||id===ownerId)throw Error('Utilisez le lien ou l’identifiant du profil réel.');const p=await call({operation:'community-friendship-profile',peerId:id});if(!active())throw Error('Le compte a changé.');if(p?.id!==id||typeof p.displayName!=='string'||!p.displayName.trim())throw Error('Profil distant invalide.');profiles.set(id,{id,displayName:p.displayName,dogIds:[]});view.replaceContactProjection({viewerId:ownerId,profiles:[...profiles.values()],contacts:view.getState().contacts,contactRequests:view.getState().contactRequests});if(projection)accept(projection);onChange();return p;}
 };
 const store=new Proxy({}, {get(_,key){if(!active())dropAccount();if(key in overrides)return (...args)=>{if(!active())dropAccount();return overrides[key](...args);};const value=view[key];return typeof value==='function'?(...args)=>{if(!active())dropAccount();return view[key](...args);}:value;}});
 return {store,refresh,status:overrides.getFriendshipStatus,recovery:overrides.getRecoveryPlan,dispose(){disposed=true;epoch++;dropAccount();}};
}
