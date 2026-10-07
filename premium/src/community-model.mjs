export const COMMUNITY_VISIBILITY=Object.freeze({PRIVATE:'private',CONTACTS:'contacts',COMMUNITY:'community'});
export const CONTACT_STATUS=Object.freeze({NONE:'none',OUTGOING_PENDING:'outgoing_pending',INCOMING_PENDING:'incoming_pending',ACCEPTED:'accepted'});
export const COMMUNITY_SHARE_FIELDS=Object.freeze(['dog','distance','trackAge','environment','difficulty','result','map','provenance','points']);
export const COMMUNITY_LIVE_CONTRACT=Object.freeze({roles:['participant','observer','spectator'],displayModes:['mobile','large-screen'],linkVisibility:'private',optionalDelay:true,coachingModes:['normal','simple-blind','double-blind'],realtime:false,permissionOverride:false});

const clone=value=>structuredClone(value);

function samePair(relation,a,b){
 if(relation.userIds)return relation.userIds.includes(a)&&relation.userIds.includes(b);
 return (relation.fromUserId===a&&relation.toUserId===b)||(relation.fromUserId===b&&relation.toUserId===a);
}

export function contactStatus(state={},viewerId,targetId){
 if(!viewerId||!targetId||viewerId===targetId)return CONTACT_STATUS.NONE;
 if((state.contacts||[]).some(item=>samePair(item,viewerId,targetId)))return CONTACT_STATUS.ACCEPTED;
 const request=(state.contactRequests||[]).find(item=>item.status==='pending'&&((item.fromUserId===viewerId&&item.toUserId===targetId)||(item.fromUserId===targetId&&item.toUserId===viewerId)));
 if(!request)return CONTACT_STATUS.NONE;
 return request.fromUserId===viewerId?CONTACT_STATUS.OUTGOING_PENDING:CONTACT_STATUS.INCOMING_PENDING;
}

export function canViewCommunityPost(state,post,viewerId){
 if(!post||!viewerId)return false;
 if(post.authorId===viewerId)return true;
 if(post.visibility===COMMUNITY_VISIBILITY.COMMUNITY)return true;
 if(post.visibility===COMMUNITY_VISIBILITY.CONTACTS)return contactStatus(state,viewerId,post.authorId)===CONTACT_STATUS.ACCEPTED;
 return false;
}

const primitives=['distance','trackAge','environment','difficulty','result','provenance'];
function safePoints(points){
 if(!Array.isArray(points))return undefined;
 const valid=points.filter(point=>Number.isFinite(Number(point?.x))&&Number.isFinite(Number(point?.y))).map((point,index)=>({x:Number(point.x),y:Number(point.y),...(index&&point.breakBefore?{breakBefore:true}:{})}));
 return valid.length?valid:undefined;
}
function safeMap(value){
 if(!value||typeof value!=='object')return undefined;
 const paths=Array.isArray(value.paths)?value.paths.filter(path=>typeof path?.d==='string').map(path=>({kind:String(path.kind||'trace'),label:String(path.label||'Tracé'),d:path.d})):[];
 const points=safePoints(value.points);
 if(!paths.length&&!points)return undefined;
 return {paths,...(points?{points}:{})};
}

export function projectCommunitySource(type,sourceId,source={},selectedFields=[]){
 if(!['session','track'].includes(type))throw new Error('Les missions OPS ne sont pas une source partageable dans Communauté.');
 const fields={};
 for(const field of [...new Set(selectedFields)].filter(value=>COMMUNITY_SHARE_FIELDS.includes(value))){
  if(field==='dog'&&source.dog&&typeof source.dog==='object'){
   const dog={};for(const key of ['id','name','portrait','personalPhotoDataUrl'])if(typeof source.dog[key]==='string'&&source.dog[key])dog[key]=source.dog[key];
   if(Array.isArray(source.dog.disciplines))dog.disciplines=source.dog.disciplines.filter(value=>typeof value==='string');
   if(Object.keys(dog).length)fields.dog=dog;
  }else if(field==='points'){
   const points=safePoints(source.points);if(points)fields.points=points;
  }else if(field==='map'){
   const map=safeMap(source.map);if(map)fields.map=map;
  }else if(primitives.includes(field)&&['string','number','boolean'].includes(typeof source[field]))fields[field]=source[field];
 }
 return {type,sourceId:String(sourceId),readOnly:true,fields:clone(fields)};
}

export function buildCommunitySharePayload(kind,post,origin=''){
 if(!post||!['post','track'].includes(kind))throw new Error('Type de partage indisponible.');
 const base=String(origin).replace(/\/$/,'');
 if(kind==='post')return {kind,title:post.text||post.title||'Publication PISTE Community',url:`${base}/community/post/${encodeURIComponent(post.id)}`,text:`${post.text||post.title||'Publication'} · PISTE Community`};
 if(post.attachment?.type!=='track')throw new Error('Cette publication ne contient pas de piste partagée.');
 const title=post.attachment.fields?.title||post.title||'Piste PISTE Community';
 return {kind,title,url:`${base}/community/post/${encodeURIComponent(post.id)}?share=track`,text:`${title} · tracé partagé dans PISTE Community`};
}

export function canViewCommunityComment(state,post,viewerId){return canViewCommunityPost(state,post,viewerId);}

export function searchCommunity({state,viewerId,query='',dogs=[],tracks=[]}={}){
 const term=String(query).trim().toLocaleLowerCase('fr');if(!term)return [];
 const contains=value=>String(value||'').toLocaleLowerCase('fr').includes(term);
 const results=[];
 for(const profile of state?.profiles||[]){
  if(profile.id===viewerId)continue;
  const dogNames=(profile.dogIds||[]).map(id=>dogs.find(dog=>dog.id===id)?.name||'').join(' ');
  if([profile.displayName,profile.role,profile.specialty,profile.bio,...(profile.disciplines||[]),dogNames].some(contains))results.push({type:'profile',id:profile.id,title:profile.displayName,subtitle:profile.role||profile.specialty||'Profil Communauté'});
 }
 for(const dog of dogs){
  const linked=(state?.profiles||[]).some(profile=>profile.id!==viewerId&&(profile.dogIds||[]).includes(dog.id));
  if(linked&&[dog.name,dog.breed,dog.specialty,...(dog.disciplines||[])].some(contains))results.push({type:'dog',id:dog.id,title:dog.name,subtitle:dog.specialty||dog.breed||'Chien'});
 }
 for(const post of state?.posts||[]){
  if(!canViewCommunityPost(state,post,viewerId))continue;
  const profile=state.profiles.find(item=>item.id===post.authorId);
  const fields=post.attachment?.fields||{};
  if([post.text,post.type,fields.environment,fields.provenance,fields.distance,profile?.displayName].some(contains)){
   results.push({type:'post',id:post.id,title:post.text||'Publication',subtitle:profile?.displayName||'Membre'});
   if(post.attachment?.type==='track')results.push({type:'track',id:post.id,title:fields.title||post.text||'Piste partagée',subtitle:fields.provenance||'Trace explicitement partagée'});
  }
 }
 // Un tracé local n'est pas découvrable tant que son auteur ne l'a pas partagé dans un post visible.
 return results;
}
