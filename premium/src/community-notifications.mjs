const clone=value=>structuredClone(value);
const preferenceDefaults=()=>({notify_live_in_app:true,notify_live_email:false,notify_live_push:false});
const recipientOf=item=>item.recipient_user_id||item.recipientId||null;
const liveKey=item=>item.type==='live_session_started'&&item.session_id&&recipientOf(item)?`${item.session_id}:${recipientOf(item)}`:null;

export function createCommunityNotificationStore({notifications=[],viewerId='self'}={}){
 const events=clone(notifications).map(item=>({channels:{inApp:true,email:false,push:false},read:false,...item}));
 const preferences=new Map();let sequence=1;
 const nextId=()=>`community-notification-${sequence++}`;
 function getPreferences(userId=viewerId){return {...preferenceDefaults(),...(preferences.get(userId)||{})};}
 function setPreferences(userId,patch={}, {actorId=userId}={}){
  if(!userId||actorId!==userId)return false;
  const current=getPreferences(userId),next={...current};
  for(const field of Object.keys(current))if(typeof patch[field]==='boolean')next[field]=patch[field];
  preferences.set(userId,next);return true;
 }
 function append(event={}){
  if(!recipientOf(event)||!event.type)return null;
  const key=liveKey(event);if(key&&events.some(item=>liveKey(item)===key))return null;
  const record={id:event.id||nextId(),createdAt:event.createdAt||new Date().toISOString(),read:false,channels:{inApp:true,email:false,push:false},...clone(event)};
  events.push(record);return clone(record);
 }
 function publishLiveStart({sessionId,sessionType,ownerUserId,recipientUserIds=[],ownerDisplayName,dogName=null,startedAt=new Date().toISOString(),route,observerRole}={}){
  const created=[];
  for(const recipientId of [...new Set(recipientUserIds)]){
   const prefs=getPreferences(recipientId),channels={inApp:prefs.notify_live_in_app,email:prefs.notify_live_email,push:prefs.notify_live_push};
   if(!Object.values(channels).some(Boolean))continue;
   const event=append({type:'live_session_started',session_id:String(sessionId),session_type:sessionType,owner_user_id:ownerUserId,recipient_user_id:recipientId,owner_display_name:String(ownerDisplayName||'Un contact'),...(dogName?{dog_name:String(dogName)}:{}),started_at:startedAt,route,observer_role:observerRole,channels});
   if(event)created.push(event);
  }
  return created;
 }
 function listAll(){return clone(events);}
 function list(userId=viewerId){return clone(events.filter(item=>recipientOf(item)===userId&&item.channels?.inApp!==false));}
 function unreadCount(userId=viewerId){return events.filter(item=>recipientOf(item)===userId&&item.channels?.inApp!==false&&!item.read).length;}
 function markRead(id,userId=viewerId){const event=events.find(item=>item.id===id&&recipientOf(item)===userId);if(!event)return false;event.read=true;return true;}
 function buildDeliveryContracts(event){
  if(!event||event.type!=='live_session_started')return {email:null,push:null};
  const prefs=getPreferences(recipientOf(event));
  const route=String(event.route||'/live');
  const email=prefs.notify_live_email&&event.channels?.email?{
   toUserId:recipientOf(event),subject:'Une session PISTE Community est en direct',sessionId:event.session_id,sessionType:event.session_type,
   ownerDisplayName:event.owner_display_name,...(event.dog_name?{dogName:event.dog_name}:{}),observerRole:event.observer_role,route
  }:null;
  const push=prefs.notify_live_push&&event.channels?.push?{
   toUserId:recipientOf(event),type:'live_session_started',sessionId:event.session_id,sessionType:event.session_type,
   ownerDisplayName:event.owner_display_name,route
  }:null;
  return {email,push};
 }
 return Object.freeze({getPreferences,setPreferences,append,publishLiveStart,listAll,list,unreadCount,markRead,buildDeliveryContracts});
}
