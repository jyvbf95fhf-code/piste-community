import {canJoinCoaching,targetedCoachingExpiresAt} from '../coaching-invitation-policy.mjs';
import {createWebPushService} from './web-push-service.mjs';
import {createPreparedTrackShareService} from './prepared-track-share-service.mjs';
import {createCommunityFriendshipService} from './community-friendship-service.mjs';
import {createCoachingInboxService} from './coaching-inbox-service.mjs';
import {coachingTeamContacts} from '../coaching-team.mjs';
import {loadPremiumCodeEntitlement,loadPremiumCodeCatalogue,redeemPremiumCode,managePremiumCode} from './premium-code-service.mjs';
import {exportAccountData} from './data-exports-service.mjs';
import {projectAdminSnapshot} from './admin-service.mjs';
import {projectVerifiedCapabilities} from './account-capabilities.mjs';
import {createRemoteSession,joinRemoteSession,reduceRemoteSession,projectRemoteSession} from './coaching-service.mjs';
const hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
function error(message,status=400){throw Object.assign(Error(message),{status});}
const assertResult=result=>{if(result.error){const code=result.error.code;error(['40001','PT409'].includes(code)?'Session mise à jour ailleurs : actualisez puis réessayez.':code==='42501'?'Accès refusé.':'Commande refusée.',['40001','PT409'].includes(code)?409:code==='42501'?403:400);}return result.data;};
export function createCoachingHandler({admin,authClient,clock=Date.now,giftCodesEnabled=false,teamContactsProvider=null,friendshipsEnabled=false,coachingInboxEnabled=false,pushDelivery=null,background=work=>{void work.catch(()=>{});}}={}){
 const friendships=createCommunityFriendshipService(admin);
 const push=createWebPushService(admin,pushDelivery);
 return async request=>{
 const origin=request.headers.get('origin')||'',allowed=!origin||/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)||/^https:\/\/piste-community-v2-premium(?:-[a-z0-9-]+-mw2f59b8p2-4030s-projects)?\.vercel\.app$/.test(origin);const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed&&origin?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 try{
 if(!allowed)error('Origine non autorisée.',403);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')error('Méthode non autorisée.',405);
 if(Number(request.headers.get('content-length')||0)>200000)error('Requête trop volumineuse.',413);const text=await request.text();if(text.length>200000)error('Requête trop volumineuse.',413);let body;try{body=JSON.parse(text);}catch{error('Requête invalide.');}
 const sharing=createPreparedTrackShareService(admin,{clock});
 if(body.operation==='prepared-share-read')return respond(await sharing.read(body.token));
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];if(!token)error('Connexion requise.',401);const result=await authClient.auth.getUser(token);if(result.error||!result.data?.user)error('Connexion expirée.',401);const uid=result.data.user.id;
 const profile=assertResult(await admin.from('coaching_remote_users').select('id,display_name,qa,enabled').eq('id',uid).eq('enabled',true).maybeSingle());if(!profile)error('Compte non autorisé pour ce pilote.',403);
 if(body.operation==='push-public-key')return respond(await push.publicKey());
 if(body.operation==='push-subscribe')return respond(await push.subscribe(uid,body.subscription));
 if(body.operation==='push-unsubscribe')return respond(await push.unsubscribe(uid,body.endpoint));
 if(body.operation==='prepared-share-create')return respond(await sharing.create(uid,body));
 if(body.operation==='prepared-share-list')return respond(await sharing.list(uid,body.sourceId));
 if(body.operation==='prepared-share-revoke')return respond(await sharing.revoke(uid,body.id));
 const codeEntitlement=giftCodesEnabled&&['profile','authorize-feature','export-data','admin-snapshot'].includes(body.operation)?await loadPremiumCodeEntitlement(admin,uid):null;
 const capabilities=projectVerifiedCapabilities(result.data.user,profile,clock(),codeEntitlement);
 if(body.operation==='premium-code-redeem'){
  if(!giftCodesEnabled)error('Les codes cadeaux sont en attente d’activation serveur.',503);
  const redeemed=await redeemPremiumCode(admin,uid,body.code);
  return respond({ok:true,...projectVerifiedCapabilities(result.data.user,profile,clock(),redeemed.entitlement)});
 }
 if(body.operation==='export-data')return respond(await exportAccountData({admin,uid,capabilities,body,clock}));
 if(body.operation==='authorize-feature'){
  const allowed={premium:capabilities.permissions.premium,science:capabilities.permissions.research,jumolf:capabilities.jumolf_entitlement.entitlement!=='none',smart_routing:capabilities.permissions.premium,live_ops_advanced:capabilities.permissions.premium,coaching_advanced:capabilities.permissions.premium,analytics_advanced:capabilities.permissions.premium,export_advanced:capabilities.permissions.premium}[body.feature];
  if(!allowed)error('Accès non autorisé.',403);return respond({authorized:true,...capabilities});
 }
 if(['admin-snapshot','admin-command'].includes(body.operation)){
  if(capabilities.admin_role!=='owner_admin')error('Accès propriétaire requis.',403);
  if(body.operation==='admin-snapshot'){
   const snapshot=assertResult(await admin.rpc('v2_admin_snapshot',{p_actor:uid}));
   const codes=giftCodesEnabled?await loadPremiumCodeCatalogue(admin,uid,{page:body.codesPage,historyPage:body.codesHistoryPage}):null;
   if(codes)snapshot.members=(snapshot.members||[]).map(m=>({...m,premium_code_entitlement:codes.member_grants?.[m.id]||null}));
   return respond({...projectAdminSnapshot(snapshot,clock()),...(codes?{gift_codes_version:codes.gift_codes_version,codes:codes.codes,code_history:codes.history,code_pagination:{page:codes.page,history_page:codes.history_page,total:codes.total,history_total:codes.history_total}}:{})});
  }
  if(giftCodesEnabled&&['create-code','activate-code','deactivate-code'].includes(body.action))return respond(await managePremiumCode(admin,uid,body.action,body.payload,body.targetId));
  if(!uuid(body.targetId)||typeof body.action!=='string'||!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))error('Commande Admin invalide.');
  return respond(assertResult(await admin.rpc('v2_admin_command',{p_actor:uid,p_action:body.action,p_target:body.targetId,p_payload:body.payload})));
 }
 const teamContacts=async ownerId=>{if(typeof teamContactsProvider!=='function')error('Les amis réels sont en attente de raccordement serveur.',503);return coachingTeamContacts(await teamContactsProvider(ownerId),ownerId);};
 const inbox=createCoachingInboxService({admin,contacts:teamContacts,clock,result:assertResult});
 if(['coaching-inbox','accept-coaching-invitation','decline-coaching-invitation'].includes(body.operation)&&!coachingInboxEnabled)error('Invitations Coaching en attente d’activation serveur.',503);
 if(body.operation==='coaching-inbox')return respond(await inbox.inbox(uid));
 if(body.operation==='coaching-contacts'){
  const contacts=await teamContacts(uid);
  if(body.page===undefined)return respond({version:1,ownerId:uid,contacts});
  if(!Number.isSafeInteger(body.page)||body.page<0)error('Page de contacts invalide.');
  const catalogueId=await hash(JSON.stringify(contacts));
  if(body.catalogueId!==undefined&&body.catalogueId!==catalogueId)error('Vos amis ont changé : actualisez le catalogue.',409);
  const offset=body.page*200;return respond({version:1,ownerId:uid,contacts:contacts.slice(offset,offset+200),page:body.page,total:contacts.length,catalogueId,hasMore:offset+200<contacts.length});
 }
 if(['community-friendship-snapshot','community-friendship-command','community-friendship-profile'].includes(body.operation)){
  if(!friendshipsEnabled)error('Amitiés en attente d’activation serveur.',503);
  if(body.operation==='community-friendship-profile'){
   if(!uuid(body.peerId))error('Identifiant de profil invalide.');
   await friendships.snapshot(uid);
   const peer=assertResult(await admin.from('coaching_remote_users').select('id,display_name').eq('id',body.peerId).eq('enabled',true).maybeSingle());
   if(!peer)error('Profil indisponible.',404);
   return respond({id:peer.id,displayName:peer.display_name});
  }
  const friendshipResult=await (body.operation==='community-friendship-snapshot'?friendships.snapshot(uid):friendships.command(uid,body));if(body.operation==='community-friendship-command'&&body.action==='contact-request'&&body.peerId!==uid)background(push.notify(body.peerId,{body:'Vous avez reçu une demande de contact.',tag:'piste-contact'}));return respond(friendshipResult);
 }
 if(body.operation==='profile')return respond({id:uid,name:profile.display_name,qa:profile.qa,...capabilities,coaching_invitations_version:coachingInboxEnabled?1:0,coaching_team_version:typeof teamContactsProvider==='function'?1:0});
 if(body.operation==='list'){const rows=assertResult(await admin.from('coaching_remote_sessions').select('id,state').contains('state',{members:[{id:uid}]}).order('updated_at',{ascending:false}).limit(30));return respond({sessions:rows.map(r=>projectRemoteSession(r.state,uid,clock()))});}
 const id=body.sessionId;if(!uuid(id))error('Identifiant de session invalide.');
 const load=async()=>assertResult(await admin.from('coaching_remote_sessions').select('state,version,owner_id').eq('id',id).maybeSingle());
 let row=await load();
 if(body.operation==='decline-coaching-invitation')return respond(await inbox.decline(row&&{...row,id},uid,body.role));
 if(body.operation==='accept-coaching-invitation'){
  if(!uuid(body.commandId))error('Identifiant de commande invalide.');
  if(row?.state.members.some(m=>m.id===uid&&m.role===body.role))return respond({projection:projectRemoteSession(row.state,uid,clock())});
  const invite=await inbox.find(row&&{...row,id},uid,body.role),state=structuredClone(row.state);
  joinRemoteSession(state,{id:uid,name:profile.display_name},invite.role);state.qa=state.qa||profile.qa;state.version++;
  const accepted=assertResult(await admin.rpc('coaching_commit',{p_session_id:id,p_actor_id:uid,p_command_id:body.commandId,p_fingerprint:await hash(JSON.stringify({operation:body.operation,role:body.role})),p_expected:row.version,p_state:state,p_invite:invite.token_hash,p_batch:null}));
  row=await load();return respond({acknowledgedVersion:accepted,projection:projectRemoteSession(row.state,uid,clock())});
 }
 if(body.operation==='read'){if(!row)error('Session inaccessible.',403);return respond({projection:projectRemoteSession(row.state,uid,clock())});}
 if(body.operation==='invite'){if(!row||row.owner_id!==uid||!canJoinCoaching(row.state.search.phase)||row.state.members.some(m=>m.role===body.role&&body.role!=='observer')||!['traceur','driver','coach','observer'].includes(body.role)||body.role==='traceur'&&row.state.session.scenario!=='connected_traceur')error('Invitation refusée.',403);let recipientId=null;
 if(body.recipientId!==undefined){
  const pending=row.state.pendingTeam?.find(a=>a.status==='pending'&&a.recipientId===body.recipientId&&a.role===body.role);
  if(!uuid(body.recipientId)||!pending||!(await teamContacts(uid)).some(c=>c.id===body.recipientId))error('Destinataire ou affectation indisponible.',403);recipientId=body.recipientId;
  if(coachingInboxEnabled)await inbox.find({...row,id},recipientId,body.role);
 }else if(row.state.pendingTeam?.some(a=>a.status==='pending'&&a.role===body.role))error('Choisissez l’invitation du participant déjà affecté.',403);
 const token=crypto.randomUUID()+crypto.randomUUID();assertResult(await admin.from('coaching_remote_invites').insert({token_hash:await hash(token),session_id:id,role:body.role,...(recipientId?{recipient_id:recipientId,expires_at:targetedCoachingExpiresAt}:{})}));if(recipientId)background(push.notify(recipientId,{body:'Vous avez reçu une invitation Coaching.',tag:'piste-coaching'}));return respond({token,sessionId:id,role:body.role,...(recipientId?{recipientId}:{})});}
 if(!uuid(body.commandId))error('Identifiant de commande invalide.');const payload=body.payload||{},fingerprint=await hash(JSON.stringify({operation:body.operation,type:body.type,payload,token:body.token||null}));
 if(row){const previous=assertResult(await admin.from('coaching_remote_commands').select('actor_id,fingerprint,accepted_version').eq('session_id',id).eq('command_id',body.commandId).maybeSingle());if(previous){if(previous.actor_id!==uid||previous.fingerprint!==fingerprint)error('Identifiant de commande réutilisé.',409);return respond({acknowledgedVersion:previous.accepted_version,projection:projectRemoteSession(row.state,uid,clock())});}}
 if(row&&body.operation==='command'&&(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion!==row.version))error('Session mise à jour ailleurs : actualisez puis réessayez.',409);
 let state,inviteHash=null;
 if(body.operation==='create'){if(row)error('Session déjà créée.',409);state=createRemoteSession({id,owner:{id:uid,name:profile.display_name},role:payload.role,mode:payload.mode,dogName:payload.dogName,scenario:payload.scenario,traceType:payload.traceType,now:clock(),...(payload.teamAssignments!==undefined?{teamAssignments:payload.teamAssignments,teamContacts:await teamContacts(uid)}:{})});state.qa=profile.qa;}
 else if(body.operation==='join'){if(!row||typeof body.token!=='string'||body.token.length>100)error('Invitation invalide.',403);inviteHash=await hash(body.token);const invite=assertResult(await admin.from('coaching_remote_invites').select('*').eq('session_id',id).eq('token_hash',inviteHash).maybeSingle());if(!invite||invite.consumed_by||Date.parse(invite.expires_at)<=clock())error('Invitation expirée ou déjà utilisée.',403);if(invite.recipient_id&&(invite.recipient_id!==uid||!(await teamContacts(row.owner_id)).some(c=>c.id===uid)))error('Invitation destinée à un autre compte ou autorisation retirée.',403);if(coachingInboxEnabled&&invite.recipient_id)await inbox.find({...row,id},uid,invite.role);state=structuredClone(row.state);joinRemoteSession(state,{id:uid,name:profile.display_name},invite.role);state.qa=state.qa||profile.qa;state.version++;}
 else if(body.operation==='command'){if(!row)error('Session inaccessible.',403);state=reduceRemoteSession(row.state,{userId:uid,type:body.type,payload,now:clock()});}
 else error('Opération inconnue.');
 if(body.operation==='command'&&(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion!==row.version))error('Session mise à jour ailleurs : actualisez puis réessayez.',409);
 const accepted=assertResult(await admin.rpc('coaching_commit',{p_session_id:id,p_actor_id:uid,p_command_id:body.commandId,p_fingerprint:fingerprint,p_expected:body.operation==='create'?-1:body.operation==='join'?row.version:body.expectedVersion,p_state:state,p_invite:inviteHash,p_batch:body.type==='gps-batch'?payload:null}));row=await load();let invitationsPending=false;if(coachingInboxEnabled&&body.operation==='create')try{await inbox.issue({...row,id});}catch{invitationsPending=true;}if(coachingInboxEnabled&&body.operation==='create')for(const member of row.state.pendingTeam||[])if(member.recipientId!==uid)background(push.notify(member.recipientId,{body:'Vous avez reçu une invitation Coaching.',tag:'piste-coaching'}));return respond({...(invitationsPending?{invitationsPending:true}:{}),acknowledgedVersion:accepted,projection:projectRemoteSession(row.state,uid,clock())});
 }catch(e){return respond({error:e.status?e.message:'Service temporairement indisponible.'},e.status||503);}
 };
}
