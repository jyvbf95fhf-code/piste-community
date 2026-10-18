// Server-only adapter for installed RPCs. Deployment and activation require separate approval.
// Invoke after existing getUser() and enabled-profile checks; actorId comes from that verified identity.
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const fail=(message,status)=>{throw Object.assign(Error(message),{status});};
async function rpc(admin,name,args){const {data,error}=await admin.rpc(name,args);if(error){const status=({'42501':403,'40001':409,'54000':429,'55000':503,'22023':400,'22P02':400,'23505':409})[error.code]||503;fail(({403:'Action non autorisée.',409:'Relation actualisée ailleurs : rechargez vos contacts.',429:'Trop de demandes : réessayez plus tard.',400:'Demande invalide.',503:'Amitiés en attente d’activation serveur.'})[status],status);}return data;}
export function createCommunityFriendshipService(admin){return {
 snapshot(actorId){if(!uuid(actorId))fail('Connexion requise.',401);return rpc(admin,'community_friendship_snapshot',{p_actor:actorId});},
 contacts(actorId){if(!uuid(actorId))fail('Connexion requise.',401);return rpc(admin,'community_coaching_contacts',{p_actor:actorId});},
 command(actorId,body){
  if(!uuid(actorId))fail('Connexion requise.',401);
  if(!uuid(body?.peerId)||!uuid(body.commandId)||!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion< -1||!['contact-request','accept-contact','refuse-contact','cancel-contact','remove-contact','set-contact-permission'].includes(body.action))fail('Demande invalide.',400);
  if(body.action==='set-contact-permission'&&(body.permission!=='quick_coaching_invite_authorized'||typeof body.enabled!=='boolean'))fail('Permission indisponible pour ce raccordement.',400);
  return rpc(admin,'community_friendship_command',{p_actor:actorId,p_peer:body.peerId,p_action:body.action,p_command_id:body.commandId,p_expected:body.expectedVersion,p_enabled:body.action==='set-contact-permission'?body.enabled:null});
 }
};}
