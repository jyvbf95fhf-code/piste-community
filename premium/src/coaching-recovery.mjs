// Dedicated recovery state: an ordinary sign-in session never opens this form.
export function createRecovery({client,hash=''}={}){
 let ready=false;
 const params=new URLSearchParams(hash.replace(/^#/,''));
 return Object.freeze({
  async initialize(){
   ready=false;
   if(params.has('error'))throw Error('Lien expiré ou déjà utilisé. Demandez un nouvel e-mail de récupération.');
   if(params.get('type')!=='recovery'||!params.get('access_token')||!params.get('refresh_token'))return false;
   const session=await client.auth.getSession();
   if(session.error||!session.data?.session)throw Error('Lien expiré ou invalide. Demandez un nouvel e-mail de récupération.');
   const verified=await client.auth.getUser();
   if(verified.error||!verified.data?.user?.id)throw Error('Identité de récupération non vérifiée.');
   ready=true;return true;
  },
  async request(email,redirectTo){
   const url=new URL(redirectTo);
   if(url.protocol!=='https:'||url.username||url.password||url.hash||url.pathname!=='/coaching-recovery.html')throw Error('Adresse de récupération invalide.');
   if(typeof email!=='string'||!email.trim())throw Error('Indiquez votre adresse e-mail.');
   const result=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:url.href});
   if(result.error)throw Error('Envoi impossible. Patientez avant de demander un nouvel e-mail.');
  },
  async update(password,confirmation){
   if(!ready)throw Error('Ouvrez un nouveau lien de récupération reçu par e-mail.');
   if(typeof password!=='string'||password.length<12)throw Error('Choisissez au moins 12 caractères.');
   if(password!==confirmation)throw Error('Les deux mots de passe doivent être identiques.');
   const result=await client.auth.updateUser({password});
   if(result.error)throw Error('Réinitialisation refusée. Choisissez un autre mot de passe ou demandez un nouveau lien.');
   ready=false;
   const logout=await client.auth.signOut();
   return {signedOut:!logout.error};
  }
 });
}
