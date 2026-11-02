import {escapeHTML} from './components.mjs';
const fail=message=>{throw Error(message);};
export function validateAccountDeletion(payload,member,actorId){
 if(!member)fail('Membre introuvable. Actualisez la liste.');
 if(member.user_id===actorId||member.admin_role==='owner_admin')fail('Le compte propriétaire est protégé.');
 if(payload.confirmed!==true||payload.confirmation!=='SUPPRIMER')fail('Cochez la confirmation et saisissez SUPPRIMER.');
 if(!member.email||String(payload.email||'').trim().toLowerCase()!==member.email.toLowerCase())fail('Recopiez l’adresse e-mail du membre.');
 if(String(payload.reason||'').trim().length<2||String(payload.reason).length>180)fail('Indiquez un motif de 2 à 180 caractères.');
}
export function AccountDeletionForm(member,{allowed=false,actorId=null}={}){
 if(!allowed||member.admin_role==='owner_admin'||member.user_id===actorId)return '';
 const e=value=>escapeHTML(String(value));
 return `<details class="admin-panel"><summary>Supprimer définitivement le compte</summary><p>Compte concerné : <strong>${e(member.email||'Adresse indisponible')}</strong></p><p>Cette action est irréversible : accès de connexion, profil, chiens, pistes et données propres au compte seront supprimés. Le journal administratif est conservé. Les fichiers du compte seront supprimés. Les dossiers partagés seront conservés pour les autres membres avec une identité anonymisée. Les sessions concernées encore actives seront arrêtées.</p><form class="admin-action-form" data-admin-form="delete-account" data-target-id="${e(member.user_id)}"><label>Recopiez l’adresse e-mail<input name="email" type="email" autocomplete="off" required></label><label>Motif<input name="reason" minlength="2" maxlength="180" required></label><label>Saisissez SUPPRIMER<input name="confirmation" pattern="SUPPRIMER" autocomplete="off" autocapitalize="characters" required></label><label class="admin-confirm"><input type="checkbox" name="confirm" required> Je confirme la suppression définitive de ce compte et de ses données propres.</label><button class="admin-button" type="submit">Supprimer définitivement</button></form></details>`;
}
