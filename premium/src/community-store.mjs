import {COMMUNITY_PROFILE_FIXTURES,COMMUNITY_POST_FIXTURES,COMMUNITY_CONTACT_FIXTURES,COMMUNITY_CONTACT_REQUEST_FIXTURES,COMMUNITY_FOLLOW_FIXTURES,COMMUNITY_NOTIFICATION_FIXTURES,COMMUNITY_PHOTO_FIXTURES} from './community-fixtures.mjs';
import {canViewCommunityPost,contactStatus,projectCommunitySource,COMMUNITY_VISIBILITY} from './community-model.mjs';
import {createCommunityNotificationStore} from './community-notifications.mjs';

const clone=value=>structuredClone(value);
const stamp=()=>new Date().toISOString();

export function createCommunityStore(options={}){
 let state={
  viewerId:options.viewerId||'self',
  profiles:clone(options.profiles??COMMUNITY_PROFILE_FIXTURES),
  posts:clone(options.posts??COMMUNITY_POST_FIXTURES).map(post=>({likes:[],comments:[],...post})),
  contacts:clone(options.contacts??COMMUNITY_CONTACT_FIXTURES),
  contactRequests:clone(options.contactRequests??COMMUNITY_CONTACT_REQUEST_FIXTURES),
  follows:clone(options.follows??COMMUNITY_FOLLOW_FIXTURES),
  notifications:clone(options.notifications??COMMUNITY_NOTIFICATION_FIXTURES),
  hiddenPostIds:[],reports:[]
 };
 const notificationStore=options.notificationStore||createCommunityNotificationStore({notifications:state.notifications,viewerId:state.viewerId});
 let nextId=1;
 const profile=id=>state.profiles.find(person=>person.id===id);
 const post=id=>state.posts.find(item=>item.id===id);
 const ensureProfile=id=>{if(!profile(id))throw new Error('Ce profil Communauté n’est pas disponible.');};
 const ensureVisiblePost=id=>{const record=post(id);if(!record||!canViewCommunityPost(state,record,state.viewerId))throw new Error('Cette publication n’est pas visible ou disponible.');return record;};
 const notify=(recipientId,type,actorId,postId=null)=>{if(!recipientId||recipientId===actorId)return;notificationStore.append({id:`notification-local-${nextId++}`,recipientId,actorId,type,postId,createdAt:stamp(),read:false});};
 const snapshot=value=>value?clone(value):null;
 function getContactRequests(otherId){
  const relevant=state.contactRequests.filter(request=>request.status==='pending'&&(otherId?request.fromUserId===otherId||request.toUserId===otherId:request.fromUserId===state.viewerId||request.toUserId===state.viewerId));
  return {contacts:getContacts(),received:relevant.filter(item=>item.toUserId===state.viewerId).map(snapshot),sent:relevant.filter(item=>item.fromUserId===state.viewerId).map(snapshot)};
 }
 function getContacts(){
  return state.contacts.filter(item=>item.userIds?.includes(state.viewerId)).map(item=>snapshot(profile(item.userIds.find(id=>id!==state.viewerId)))).filter(Boolean);
 }
 function getFeed({query=''}={}){
  const needle=String(query).trim().toLocaleLowerCase('fr');
  return state.posts.filter(item=>!state.hiddenPostIds.includes(item.id)&&canViewCommunityPost(state,item,state.viewerId))
   .filter(item=>!needle||`${item.text||''} ${item.type||''}`.toLocaleLowerCase('fr').includes(needle))
   .sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).map(snapshot);
 }
 function updateOwnProfile(patch={}){
  const own=profile(state.viewerId);if(!own)throw new Error('Profil Communauté indisponible.');
  const name=String(patch.displayName??'').trim();if(!name||name.length>80)throw new Error('Le nom visible doit contenir de 1 à 80 caractères.');
  own.displayName=name;return snapshot(own);
 }
 function updateProfile(id,patch={}){if(id!==state.viewerId)throw new Error('Vous ne pouvez modifier que votre propre profil.');return updateOwnProfile(patch);}
 function getRelation(targetId){
  ensureProfile(targetId);
  return {contactStatus:contactStatus(state,state.viewerId,targetId),following:state.follows.some(item=>item.fromUserId===state.viewerId&&item.toUserId===targetId),followedBy:state.follows.some(item=>item.fromUserId===targetId&&item.toUserId===state.viewerId),isSelf:targetId===state.viewerId};
 }
 function getContactRecord(targetId){return state.contacts.find(item=>item.userIds?.includes(state.viewerId)&&item.userIds?.includes(targetId));}
 function getContactPermissions(targetId){
  const relation=getContactRecord(targetId);if(!relation)return null;
  return {live_access_authorized:relation.live_access_authorized===true,quick_coaching_invite_authorized:relation.quick_coaching_invite_authorized===true};
 }
 function setContactPermission(targetId,permission,enabled){
  if(!['live_access_authorized','quick_coaching_invite_authorized'].includes(permission))throw new Error('Permission Contact indisponible.');
  const relation=getContactRecord(targetId);if(!relation)return false;
  relation[permission]=enabled===true;return true;
 }
 function searchContacts(query=''){
  const term=String(query).trim().toLocaleLowerCase('fr');if(!term)return [];
  return state.profiles.filter(person=>person.id!==state.viewerId&&[person.displayName,person.role,person.specialty].some(value=>String(value||'').toLocaleLowerCase('fr').includes(term)))
   .map(person=>({...snapshot(person),...getRelation(person.id),permissions:getContactPermissions(person.id)}));
 }
 function sendContactRequest(targetId){
  ensureProfile(targetId);if(targetId===state.viewerId)throw new Error('Vous êtes déjà sur votre propre profil.');
  if(contactStatus(state,state.viewerId,targetId)!=='none')throw new Error('Une relation Contact existe déjà ou une demande est en attente.');
  const request={id:`contact-request-local-${nextId++}`,fromUserId:state.viewerId,toUserId:targetId,status:'pending',createdAt:stamp()};
  state.contactRequests.push(request);notify(targetId,'contact_request',state.viewerId);return snapshot(request);
 }
 function findRequest(requestId){return state.contactRequests.find(item=>item.id===requestId&&item.status==='pending');}
 function acceptContactRequest(requestId,recipientId=state.viewerId){
  const request=findRequest(requestId);if(!request||request.toUserId!==recipientId||recipientId!==state.viewerId)return false;
  request.status='accepted';request.acceptedAt=stamp();state.contacts.push({userIds:[request.fromUserId,request.toUserId],acceptedAt:request.acceptedAt});
  notify(request.fromUserId,'contact_accepted',request.toUserId);return true;
 }
 function refuseContactRequest(requestId,recipientId=state.viewerId){
  const request=findRequest(requestId);if(!request||request.toUserId!==recipientId||recipientId!==state.viewerId)return false;
  request.status='refused';request.resolvedAt=stamp();return true;
 }
 function cancelContactRequest(requestId){
  const request=findRequest(requestId);if(!request||request.fromUserId!==state.viewerId)return false;
  request.status='cancelled';request.resolvedAt=stamp();return true;
 }
 function removeContact(targetId){
  const before=state.contacts.length;state.contacts=state.contacts.filter(item=>!(item.userIds?.includes(state.viewerId)&&item.userIds?.includes(targetId)));
  return state.contacts.length!==before;
 }
 function follow(targetId){
  ensureProfile(targetId);if(targetId===state.viewerId)throw new Error('Vous ne pouvez pas vous suivre vous-même.');
  if(state.follows.some(item=>item.fromUserId===state.viewerId&&item.toUserId===targetId))return false;
  state.follows.push({fromUserId:state.viewerId,toUserId:targetId,createdAt:stamp()});notify(targetId,'follow',state.viewerId);return true;
 }
 function unfollow(targetId){const before=state.follows.length;state.follows=state.follows.filter(item=>!(item.fromUserId===state.viewerId&&item.toUserId===targetId));return before!==state.follows.length;}
 function toggleLike(postId){
  const item=ensureVisiblePost(postId),index=item.likes.indexOf(state.viewerId);
  if(index>=0){item.likes.splice(index,1);return false;}
  item.likes.push(state.viewerId);notify(item.authorId,'like',state.viewerId,postId);return true;
 }
 function addComment(postId,text){
  const item=ensureVisiblePost(postId),value=String(text||'').trim();if(!value||value.length>600)throw new Error('Le commentaire doit contenir de 1 à 600 caractères.');
  const comment={id:`comment-local-${nextId++}`,authorId:state.viewerId,text:value,createdAt:stamp()};item.comments.push(comment);notify(item.authorId,'comment',state.viewerId,postId);return snapshot(comment);
 }
 function deleteOwnComment(postId,commentId){
  const item=ensureVisiblePost(postId),comment=item.comments.find(value=>value.id===commentId);
  if(!comment||comment.authorId!==state.viewerId)return false;
  item.comments=item.comments.filter(value=>value.id!==commentId);return true;
 }
 function createPost({text='',visibility=COMMUNITY_VISIBILITY.PRIVATE,dogId=null,photo=null,source=null}={}){
  const body=String(text||'').trim();if(!['private','contacts','community'].includes(visibility))throw new Error('Niveau de visibilité indisponible.');
  if(source?.type&&!['session','track'].includes(source.type))throw new Error('Les sources OPS sont exclues de Communauté.');
  const attachment=source?projectCommunitySource(source.type,source.id,source.data||{},source.fields||[]):null;
  if(!body&&!photo&&!Object.keys(attachment?.fields||{}).length)throw new Error('Ajoutez un texte, une photo ou une piste avec des champs choisis.');
  if(photo&&!COMMUNITY_PHOTO_FIXTURES.some(item=>item.src===photo))throw new Error('Choisissez une photo mock locale disponible.');
  if(dogId)ensureProfileDog(dogId);
  const item={id:`post-local-${nextId++}`,authorId:state.viewerId,type:attachment?.type==='track'?'track':'training',visibility,createdAt:stamp(),dogId:dogId||null,photo:typeof photo==='string'?photo:null,text:body,attachment,likes:[],comments:[]};
  state.posts.unshift(item);return snapshot(item);
 }
 function ensureProfileDog(dogId){
  if(!state.profiles.some(item=>item.id===state.viewerId&&(item.dogIds||[]).includes(dogId)))throw new Error('Ce chien n’est pas associé à votre profil Communauté.');
 }
 function getVisiblePost(postId){const item=post(postId);return item&&!state.hiddenPostIds.includes(postId)&&canViewCommunityPost(state,item,state.viewerId)?snapshot(item):null;}
 function deleteOwnPost(postId){const item=post(postId);if(!item||item.authorId!==state.viewerId)throw new Error('Vous ne pouvez supprimer que vos propres publications.');state.posts=state.posts.filter(value=>value.id!==postId);return true;}
 function reportPost(postId,reason=''){const item=post(postId);if(!item||!canViewCommunityPost(state,item,state.viewerId))return false;state.reports.push({postId,reporterId:state.viewerId,reason:String(reason).slice(0,200),createdAt:stamp()});return true;}
 function hidePost(postId){const item=post(postId);if(!item||!canViewCommunityPost(state,item,state.viewerId)||state.hiddenPostIds.includes(postId))return false;state.hiddenPostIds.push(postId);return true;}
 function getNotifications(){return notificationStore.list(state.viewerId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(snapshot);}
 function markNotificationRead(id){return notificationStore.markRead(id,state.viewerId);}
 function getProfile(id){return snapshot(profile(id));}
 function listProfiles(){return state.profiles.map(snapshot);}
 function getState(){return snapshot({...state,notifications:notificationStore.listAll()});}
 return Object.freeze({
  get viewerId(){return state.viewerId;},getState,getProfile,listProfiles,updateOwnProfile,updateProfile,
  getFeed,getVisiblePost,getRelation,getContactRequests,getContacts,getContactPermissions,setContactPermission,searchContacts,getNotificationStore:()=>notificationStore,
  sendContactRequest,acceptContactRequest,refuseContactRequest,cancelContactRequest,removeContact,follow,unfollow,
  toggleLike,addComment,deleteOwnComment,createPost,deleteOwnPost,reportPost,hidePost,getNotifications,markNotificationRead
 });
}
