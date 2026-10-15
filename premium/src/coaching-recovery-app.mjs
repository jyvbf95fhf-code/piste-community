import {createClient} from './vendor/supabase-client.mjs';
import {COACHING_REMOTE as config} from './coaching-remote-config.mjs';
import {createPisteAccount} from './piste-account-auth.mjs';
import {createRecovery} from './coaching-recovery.mjs';
// Mail can reuse an already-open tab: a new fragment must initialize a new recovery.
window.addEventListener('hashchange',()=>{if(location.hash)location.reload();});
const hash=location.hash;
const client=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,storageKey:'piste-v2-recovery'}});
const recovery=createRecovery({client,hash});
let mailStorage;try{mailStorage=localStorage;}catch{}
const mailAccount=createPisteAccount({client,storage:mailStorage});
const request=document.querySelector('[data-recovery-request]');
const status=document.querySelector('[data-recovery-status]'),form=document.querySelector('[data-recovery-form]'),done=document.querySelector('[data-recovery-done]');
try{
 const type=new URLSearchParams(hash.slice(1)).get('type');
 if(['signup','invite','email'].includes(type)){
  const session=await client.auth.getSession(),user=await client.auth.getUser();
  if(session.error||!session.data?.session||user.error||!user.data?.user)throw Error('Lien de confirmation invalide ou expiré.');
  status.textContent='Votre adresse est confirmée. Vous pouvez vous connecter à PISTE. L’accès au Coaching V2 reste soumis à autorisation.';
  await client.auth.signOut({scope:'local'});
 }else{
 const ready=await recovery.initialize();
 status.textContent=ready?'Choisissez votre nouveau mot de passe PISTE V2.':'Ouvrez le lien du dernier e-mail de récupération pour choisir votre mot de passe.';
 form.hidden=!ready;request.hidden=ready;
 }
}catch(error){status.textContent=error.message;request.hidden=false;}
finally{history.replaceState(null,'',location.pathname+location.search);}
form.addEventListener('submit',async event=>{
 event.preventDefault();const button=form.querySelector('button');button.disabled=true;status.textContent='Enregistrement…';
 try{
  const fields=new FormData(form);
  const result=await recovery.update(fields.get('password'),fields.get('confirmation'));
  form.reset();form.hidden=true;done.hidden=false;
  status.textContent=result.signedOut?'Mot de passe modifié. Revenez à PISTE et connectez-vous avec votre nouveau mot de passe.':'Mot de passe modifié. Fermez cette page avant de vous reconnecter au Coaching.';
 }catch(error){form.reset();status.textContent=error.message;}
 finally{button.disabled=false;}
});

request.addEventListener('submit',async event=>{
 event.preventDefault();const button=request.querySelector('button');button.disabled=true;
 try{
  await mailAccount.forgot(new FormData(request).get('email'));
  status.textContent='Si cette adresse correspond à un compte, un e-mail de récupération sera envoyé. Ouvrez uniquement le dernier message dans ce même navigateur Safari.';
 }catch(error){status.textContent=error.message;}
 finally{button.disabled=false;}
});
