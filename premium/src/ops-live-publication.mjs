import {sanitizeOpsLiveFrame} from './ops-live-contract.mjs';
const clone=structuredClone;
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const id=value=>typeof value==='string'&&value.length>0&&value.length<=160?value:fail('Identifiant invalide.');
const fields=['showDog','showHandler','showEvents','showTrackAge','showCorridor'];
const options=value=>Object.fromEntries(fields.map(k=>[k,value?.[k]===true]));
export function createOpsPublication({missionId,ownerId}){return {missionId:id(missionId),ownerId:id(ownerId),version:0,generation:0,sequence:0,sharing:false,closed:false,frame:null,options:options(),observers:[],invitations:[],receipts:[]};}
// Pure domain reducer, not an authenticated endpoint. The future server supplies
// actorId from verified identity and commits state/version atomically (Bloc 3B).
export function reduceOpsPublication(state,command,now=Date.now()){
 const {type,actorId,expectedVersion}=command;id(command.id);id(actorId);if(!Number.isFinite(now))fail('Date invalide.');
 if(type!=='join'&&actorId!==state.ownerId)fail('Accès refusé.',403);
 let payload;
 const input=command.payload||{};
 if(type==='publish'||type==='update')payload={frame:sanitizeOpsLiveFrame(input.frame),...(type==='publish'?{options:options(input.options)}:{generation:input.generation,sequence:input.sequence})};
 else if(type==='invite')payload={invitationId:id(input.invitationId),userId:id(input.userId),expiresAt:input.expiresAt};
 else if(type==='join')payload={invitationId:id(input.invitationId)};
 else if(type==='revoke')payload={userId:id(input.userId)};
 else payload={};
 const fingerprint=JSON.stringify({type,actorId,payload}),receipt=state.receipts.find(r=>r.id===command.id);
 if(receipt){if(receipt.fingerprint!==fingerprint)fail('Identifiant de commande réutilisé.',409);return clone(state);}
 if(expectedVersion!==state.version)fail('Version périmée.',409);
 if(state.closed&&!['revoke','stop-sharing'].includes(type))fail('Publication clôturée.',409);
 const s=clone(state);
 if(type==='publish'){
  if(s.sharing)fail('Publication déjà active.',409);
  if(payload.frame.sessionId!==s.missionId)fail('Mission incompatible.');
  if(payload.frame.state==='Fin de piste')fail('Mission déjà arrêtée.');
  s.sharing=true;s.generation++;s.sequence=0;s.observers=[];s.invitations=[];s.frame=payload.frame;s.options=payload.options;
 }else if(type==='stop-sharing'){s.sharing=false;s.generation++;s.frame=null;s.observers=[];s.invitations=[];}
 else if(type==='revoke'){s.observers=s.observers.filter(u=>u!==payload.userId);s.invitations=s.invitations.filter(i=>i.userId!==payload.userId);}
 else{
  if(!s.sharing)fail('Le partage est arrêté.',403);
  if(type==='invite'){
   if(payload.userId===s.ownerId||!Number.isFinite(payload.expiresAt)||payload.expiresAt<=now||payload.expiresAt>now+86400000||s.invitations.some(i=>i.id===payload.invitationId))fail('Invitation invalide.');
   s.invitations.push({id:payload.invitationId,userId:payload.userId,expiresAt:payload.expiresAt,used:false});
  }else if(type==='join'){
   const invite=s.invitations.find(i=>i.id===payload.invitationId&&i.userId===actorId&&!i.used&&i.expiresAt>now);
   if(!invite)fail('Invitation indisponible.',403);invite.used=true;if(!s.observers.includes(actorId))s.observers.push(actorId);
  }else if(type==='update'){
   if(payload.generation!==s.generation)fail('Ancienne génération de partage.',409);
   if(!Number.isSafeInteger(payload.sequence)||payload.sequence<=s.sequence)fail('Séquence périmée.',409);
   if(payload.frame.sessionId!==s.missionId)fail('Mission incompatible.');
   const before=s.frame.gpsTrack,after=payload.frame.gpsTrack;
   if(before&&(!after||after.startedAt!==before.startedAt||before.segments.some((segment,i)=>!after.segments[i]||segment.some((point,j)=>JSON.stringify(point)!==JSON.stringify(after.segments[i][j])))||after.distanceM<before.distanceM)||s.frame.trackingSeconds!==null&&(payload.frame.trackingSeconds===null||payload.frame.trackingSeconds<s.frame.trackingSeconds))fail('Historique OPS non monotone.',409);
   s.frame=payload.frame;s.sequence=payload.sequence;
   if(s.frame.state==='Fin de piste'){s.closed=true;s.invitations=[];}
  }else if(type==='close'){s.closed=true;s.invitations=[];s.frame={...s.frame,state:'Fin de piste'};}
  else fail('Commande OPS inconnue.');
 }
 s.version++;s.receipts.push({id:command.id,fingerprint});return s;
}
export function readOpsPublication(state,userId){
 if(!userId||!state.sharing||!state.frame||userId!==state.ownerId&&!state.observers.includes(userId))fail('Accès refusé.',403);
 const projection=sanitizeOpsLiveFrame(state.frame);
 if(!state.options.showDog)projection.dogName=null;if(!state.options.showHandler)projection.handlerName=null;
 if(!state.options.showEvents)projection.events=[];if(!state.options.showTrackAge)projection.trackAge=null;
 return {missionId:state.missionId,version:state.version,generation:state.generation,closed:state.closed,projection};
}
