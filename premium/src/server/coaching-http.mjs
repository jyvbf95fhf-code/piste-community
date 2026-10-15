import {createRemoteSession,joinRemoteSession,reduceRemoteSession,projectRemoteSession} from './coaching-service.mjs';
const hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
function error(message,status=400){throw Object.assign(Error(message),{status});}
const assertResult=result=>{if(result.error){const code=result.error.code;error(code==='40001'?'Session mise à jour ailleurs : actualisez puis réessayez.':code==='42501'?'Accès refusé.':'Commande refusée.',code==='40001'?409:code==='42501'?403:400);}return result.data;};
export function createCoachingHandler({admin,authClient,clock=Date.now}={}){
 return async request=>{
 const origin=request.headers.get('origin')||'',allowed=!origin||/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)||/^https:\/\/piste-community-v2-premium(?:-[a-z0-9-]+-mw2f59b8p2-4030s-projects)?\.vercel\.app$/.test(origin);const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed&&origin?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 try{
 if(!allowed)error('Origine non autorisée.',403);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')error('Méthode non autorisée.',405);
 if(Number(request.headers.get('content-length')||0)>200000)error('Requête trop volumineuse.',413);const text=await request.text();if(text.length>200000)error('Requête trop volumineuse.',413);let body;try{body=JSON.parse(text);}catch{error('Requête invalide.');}
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];if(!token)error('Connexion requise.',401);const result=await authClient.auth.getUser(token);if(result.error||!result.data?.user)error('Connexion expirée.',401);const uid=result.data.user.id;
 const profile=assertResult(await admin.from('coaching_remote_users').select('id,display_name,qa,enabled').eq('id',uid).eq('enabled',true).maybeSingle());if(!profile)error('Compte non autorisé pour ce pilote.',403);
 if(body.operation==='profile')return respond({id:uid,name:profile.display_name,qa:profile.qa});
 if(body.operation==='list'){const rows=assertResult(await admin.from('coaching_remote_sessions').select('id,state').contains('state',{members:[{id:uid}]}).order('updated_at',{ascending:false}).limit(30));return respond({sessions:rows.map(r=>projectRemoteSession(r.state,uid,clock()))});}
 const id=body.sessionId;if(!uuid(id))error('Identifiant de session invalide.');
 const load=async()=>assertResult(await admin.from('coaching_remote_sessions').select('state,version,owner_id').eq('id',id).maybeSingle());
 let row=await load();
 if(body.operation==='read'){if(!row)error('Session inaccessible.',403);return respond({projection:projectRemoteSession(row.state,uid,clock())});}
 if(body.operation==='invite'){if(!row||row.owner_id!==uid||row.state.search.phase!=='PREPARATION'||!['traceur','driver','coach','observer'].includes(body.role)||body.role==='traceur'&&row.state.session.scenario!=='connected_traceur')error('Invitation refusée.',403);const token=crypto.randomUUID()+crypto.randomUUID();assertResult(await admin.from('coaching_remote_invites').insert({token_hash:await hash(token),session_id:id,role:body.role}));return respond({token,sessionId:id,role:body.role});}
 if(!uuid(body.commandId))error('Identifiant de commande invalide.');const payload=body.payload||{},fingerprint=await hash(JSON.stringify({operation:body.operation,type:body.type,payload,token:body.token||null}));
 if(row){const previous=assertResult(await admin.from('coaching_remote_commands').select('actor_id,fingerprint,accepted_version').eq('session_id',id).eq('command_id',body.commandId).maybeSingle());if(previous){if(previous.actor_id!==uid||previous.fingerprint!==fingerprint)error('Identifiant de commande réutilisé.',409);return respond({acknowledgedVersion:previous.accepted_version,projection:projectRemoteSession(row.state,uid,clock())});}}
 if(row&&body.operation==='command'&&(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion!==row.version))error('Session mise à jour ailleurs : actualisez puis réessayez.',409);
 let state,inviteHash=null;
 if(body.operation==='create'){if(row)error('Session déjà créée.',409);state=createRemoteSession({id,owner:{id:uid,name:profile.display_name},role:payload.role,mode:payload.mode,dogName:payload.dogName,scenario:payload.scenario,traceType:payload.traceType,now:clock()});state.qa=profile.qa;}
 else if(body.operation==='join'){if(!row||typeof body.token!=='string'||body.token.length>100)error('Invitation invalide.',403);inviteHash=await hash(body.token);const invite=assertResult(await admin.from('coaching_remote_invites').select('role,consumed_by,expires_at').eq('session_id',id).eq('token_hash',inviteHash).maybeSingle());if(!invite||invite.consumed_by||Date.parse(invite.expires_at)<=clock())error('Invitation expirée ou déjà utilisée.',403);state=structuredClone(row.state);joinRemoteSession(state,{id:uid,name:profile.display_name},invite.role);state.qa=state.qa||profile.qa;state.version++;}
 else if(body.operation==='command'){if(!row)error('Session inaccessible.',403);state=reduceRemoteSession(row.state,{userId:uid,type:body.type,payload,now:clock()});}
 else error('Opération inconnue.');
 if(body.operation==='command'&&(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion!==row.version))error('Session mise à jour ailleurs : actualisez puis réessayez.',409);
 const accepted=assertResult(await admin.rpc('coaching_commit',{p_session_id:id,p_actor_id:uid,p_command_id:body.commandId,p_fingerprint:fingerprint,p_expected:body.operation==='create'?-1:body.operation==='join'?row.version:body.expectedVersion,p_state:state,p_invite:inviteHash,p_batch:body.type==='gps-batch'?payload:null}));row=await load();return respond({acknowledgedVersion:accepted,projection:projectRemoteSession(row.state,uid,clock())});
 }catch(e){return respond({error:e.status?e.message:'Service temporairement indisponible.'},e.status||503);}
 };
}
