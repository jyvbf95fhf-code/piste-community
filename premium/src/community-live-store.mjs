const SESSION_TYPES=new Set(['coaching','ops']);
const clone=value=>structuredClone(value);
const projectionDefaults=()=>({showDog:false,showHandler:false,showEvents:false,showTrackAge:false,showCorridor:false});

export function createCommunityLiveStore({communityStore,viewerId=communityStore?.viewerId||'self',notifications=communityStore?.getNotificationStore?.()}={}){
 if(!communityStore)throw new Error('Le store Communauté est requis pour les règles Live.');
 const policies=new Map();
 const key=(type,id)=>{
  if(!SESSION_TYPES.has(type))throw new Error('Type de session Live indisponible.');
  const value=String(id||'');if(!value)throw new Error('Identifiant de session requis.');
  return `${type}:${value}`;
 };
 const defaults=(type,id)=>({sessionType:type,sessionId:String(id),ownerUserId:viewerId,share_live:false,notify_observers:true,projectionOptions:projectionDefaults()});
 function getSessionPolicy(type,id){const k=key(type,id);return clone(policies.get(k)||defaults(type,id));}
 function setSessionPolicy({sessionType,sessionId,ownerUserId=viewerId,patch={}}={}){
  const k=key(sessionType,sessionId);if(ownerUserId!==viewerId)throw new Error('Seul le propriétaire de la session peut modifier son partage Live.');
  const previous=policies.get(k)||defaults(sessionType,sessionId);
  const next={...previous,ownerUserId,share_live:typeof patch.share_live==='boolean'?patch.share_live:previous.share_live,notify_observers:typeof patch.notify_observers==='boolean'?patch.notify_observers:previous.notify_observers};
  if(sessionType==='ops'){
   const options={...previous.projectionOptions};
   for(const field of Object.keys(options))if(typeof patch.projectionOptions?.[field]==='boolean')options[field]=patch.projectionOptions[field];
   next.projectionOptions=options;
  }
  policies.set(k,next);return clone(next);
 }
 function contactCanView(userId,ownerId){
  if(!userId||!ownerId||userId===ownerId)return false;
  return ownerId===viewerId&&communityStore.getRelation(userId).contactStatus==='accepted'&&communityStore.getContactPermissions(userId)?.live_access_authorized===true;
 }
 function canViewSession(type,id,userId){
  const policy=getSessionPolicy(type,id);
  if(userId===policy.ownerUserId)return true;
  return policy.share_live&&contactCanView(userId,policy.ownerUserId);
 }
 function eligibleContacts(type,id){
  const policy=policies.get(key(type,id));if(!policy?.share_live||!policy.ownerUserId)return [];
  return communityStore.getContacts().filter(person=>communityStore.getContactPermissions(person.id)?.live_access_authorized===true).map(person=>person.id);
 }
 function notifySessionStarted(type,id,{dogName=null,startedAt=new Date().toISOString()}={}){
  const policy=policies.get(key(type,id));if(!policy?.share_live||!policy.notify_observers||!notifications)return [];
  const owner=communityStore.getProfile(policy.ownerUserId),route=`/live/${type}/${encodeURIComponent(id)}`;
  const visibleDog=type==='coaching'||policy.projectionOptions.showDog===true?dogName:null;
  return notifications.publishLiveStart({sessionId:String(id),sessionType:type,ownerUserId:policy.ownerUserId,recipientUserIds:eligibleContacts(type,id),ownerDisplayName:owner?.displayName||'Un membre',dogName:visibleDog,startedAt,route,observerRole:type==='ops'?'ops_trace_observer':'observer'});
 }
 function listVisibleSessions(sessions=[],userId=viewerId){
  return sessions.filter(session=>canViewSession(session.sessionType,session.sessionId,userId)).map(clone);
 }
 return Object.freeze({getSessionPolicy,setSessionPolicy,canViewSession,eligibleContacts,notifySessionStarted,listVisibleSessions});
}
