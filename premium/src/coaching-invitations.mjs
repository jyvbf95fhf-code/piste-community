import {escapeHTML as e} from './components.mjs';
const roles={traceur:'Traceur',driver:'Conducteur',coach:'Coach',observer:'Observateur'};
export function createCoachingInvitations({call,onDetected=()=>{},onChange=()=>{}}){
 let invitations=[],error='',busy=false,disposed=false,inflight=null,revision=0;const seen=new Set();
 const view=()=>({invitations:structuredClone(invitations),error,busy});
 function changed(){if(!disposed)onChange(view());}
 async function refresh(){if(disposed)return;if(inflight)return inflight;
  const before=revision;inflight=(async()=>{try{const result=await call({operation:'coaching-inbox'});if(disposed||before!==revision)return;if(result.version!==1||!Array.isArray(result.invitations))throw Error('Liste des invitations indisponible.');const unique=new Map(result.invitations.filter(i=>i.sessionId&&roles[i.role]).map(i=>[i.sessionId+':'+i.role,i]));invitations=[...unique.values()];error='';const fresh=invitations.filter(i=>!seen.has(i.sessionId+':'+i.role));for(const i of invitations)seen.add(i.sessionId+':'+i.role);if(fresh.length)onDetected(fresh);}
   catch(err){if(disposed)return;if([401,403].includes(err.status))invitations=[];error=[400,503].includes(err.status)?'Invitations Coaching en attente d’activation serveur.':err.message||'Invitations indisponibles : actualisez.';}
   finally{inflight=null;changed();}})();return inflight;
 }
 return {view,refresh,async respond(sessionId,role,accept){if(disposed||busy||error||!invitations.some(i=>i.sessionId===sessionId&&i.role===role))throw Error('Actualisez les invitations avant de répondre.');busy=true;changed();try{
  const result=await call({operation:accept?'accept-coaching-invitation':'decline-coaching-invitation',sessionId,role,...(accept?{commandId:crypto.randomUUID()}:{})});if(disposed)throw Error('Compte déconnecté.');if(accept&&(!result.projection||result.projection.id!==sessionId||result.projection.role!==role))throw Error('Accès à la session non confirmé.');
  revision++;invitations=invitations.filter(i=>i.sessionId!==sessionId||i.role!==role);return result.projection||null;
 }finally{busy=false;changed();}},destroy(){disposed=true;invitations=[];seen.clear();error='';}};
}
export function CoachingInvitations({invitations=[],error='',busy=false}={}){
 return `<section class="coaching-invitations" aria-label="Invitations Coaching"><div class="section-title"><h2>Invitations Coaching</h2><button type="button" class="button button-dark" data-refresh-coaching-invitations ${busy?'disabled':''}>Actualiser</button></div>${error?`<p role="status">${e(error)}</p>`:''}${invitations.length?`<p role="status">${invitations.length} invitation${invitations.length>1?'s':''} Coaching à traiter.</p>`:!error?'<p>Aucune invitation en attente.</p>':''}${invitations.map(i=>`<article class="card coaching-invitation"><span class="eyebrow">COACHING · PREMIUM</span><h3>Invitation Coaching</h3><p><strong>${e(i.session)}</strong></p><p>Organisateur : ${e(i.organizer)}<br>Votre rôle : <strong>${e(roles[i.role])}</strong></p><p>En rejoignant, vous acceptez cette invitation.</p><div class="coaching-actions"><button type="button" class="button button-gold" data-coaching-invitation="accept" data-session-id="${e(i.sessionId)}" data-role="${e(i.role)}" ${busy||error?'disabled':''}>Rejoindre la session</button><button type="button" class="button button-dark" data-coaching-invitation="decline" data-session-id="${e(i.sessionId)}" data-role="${e(i.role)}" ${busy||error?'disabled':''}>Refuser</button></div></article>`).join('')}</section>`;
}
