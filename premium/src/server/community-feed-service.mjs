import {normalizeCommunityPublication} from '../community-publication.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
async function rpc(admin,name,args){const {data,error}=await admin.rpc(name,args);if(error){const status=({'42501':403,'22023':400,'22P02':400,'23505':409,'54000':429})[error.code]||503;fail(status===403?'Publication inaccessible.':status===400?'Demande invalide.':status===429?'Trop de publications : réessayez plus tard.':'Communauté indisponible : réessayez.',status);}return data;}
export function createCommunityFeedService(admin){return {
 snapshot(actorId,{postId}={}){if(!uuid(actorId))fail('Connexion requise.',401);if(postId!==undefined&&!uuid(postId))fail('Publication invalide.');return rpc(admin,'community_feed_snapshot',{p_actor:actorId,p_post_id:postId??null});},
 command(actorId,body){if(!uuid(actorId))fail('Connexion requise.',401);if(!body||!uuid(body.commandId)||new TextEncoder().encode(JSON.stringify(body)).length>262144)fail('Demande invalide.');const b={action:body.action,commandId:body.commandId};
  if(body.action==='create-post')b.post=normalizeCommunityPublication(body.post);
  else if(body.action==='update-profile'){if(typeof body.displayName!=='string'||!body.displayName.trim()||body.displayName.length>80)fail('Nom invalide.');b.displayName=body.displayName.trim();}
  else{if(!['toggle-like','add-comment','delete-comment','delete-post','hide-post','report-post'].includes(body.action)||!uuid(body.postId))fail('Demande invalide.');b.postId=body.postId;if(body.action==='delete-comment'){if(!uuid(body.commentId))fail('Commentaire invalide.');b.commentId=body.commentId;}if(body.action==='add-comment'){if(typeof body.text!=='string'||!body.text.trim()||body.text.length>600)fail('Commentaire invalide.');b.text=body.text.trim();}}
  return rpc(admin,'community_feed_command',{p_actor:actorId,p_body:b});}
};}
