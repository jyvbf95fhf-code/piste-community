import {COACHING_REMOTE as config} from './coaching-remote-config.mjs';
const empty=(access='anonymous')=>({authenticated:false,user:null,access});
export function accountAuthError(error){
 if(error?.status===429||error?.code==='over_email_send_rate_limit')return 'La limite d’envoi d’e-mails est atteinte. Patientez environ une heure avant une nouvelle demande.';
 if(error?.code==='invalid_credentials')return 'E-mail ou mot de passe incorrect. Utilisez « Mot de passe oublié » si nécessaire.';
 if(error?.code==='email_not_confirmed')return 'Confirmez votre adresse depuis le dernier e-mail reçu avant de vous connecter.';
 if(error?.code==='user_already_exists')return 'Ce compte existe déjà. Connectez-vous ou utilisez « Mot de passe oublié ».';
 if(error?.code==='signup_disabled')return 'Les inscriptions sont momentanément fermées. Votre compte existant reste disponible.';
 return 'Connexion au service impossible. Vérifiez votre connexion puis réessayez.';
}
export function createPisteAccount({client,loadProfile,storage,clock=Date.now,onInvalidated=()=>{}}={}){
 if(client?.supabaseUrl!==config.url)throw Error('Projet Auth V2 isolé requis.');
 let session=empty(),generation=0,mailPending=false,loginPending=false;
 const key='piste.v2.auth.mail-retry';let retryAt=0;
 try{const saved=Number(storage?.getItem(key));if(Number.isFinite(saved)&&saved>clock()&&saved<=clock()+3600000)retryAt=saved;}catch{}
 const clear=access=>{session=empty(access);};
 const rememberDelay=ms=>{retryAt=clock()+ms;try{storage?.setItem(key,String(retryAt));}catch{}};
 const subscription=client.auth.onAuthStateChange((event,value)=>{
  if(event==='SIGNED_OUT'||session.user&&event==='SIGNED_IN'&&value?.user?.id!==session.user.user_id){generation++;clear();onInvalidated();}
 });
 async function verify(){
  const version=generation;clear();
  const verified=await client.auth.getUser();
  if(version!==generation)return session;
  if(verified.error||!verified.data?.user?.id)return session;
  const id=verified.data.user.id;
  try{
   const p=await loadProfile();
   if(version!==generation)return session;
   if(p.id!==id)throw Error('Identité incohérente.');
   const name=typeof p.name==='string'&&p.name.trim()?p.name.trim():'Membre';
   session={authenticated:true,access:'enabled',user:{user_id:id,name,initials:name.slice(0,1),role:'Conducteur',permissions:{research:p.permissions?.research===true,admin:false},jumolf_entitlement:p.jumolf_entitlement&&['premium','admin_grant','access_code'].includes(p.jumolf_entitlement.entitlement)?structuredClone(p.jumolf_entitlement):{entitlement:'none'},assurance:'supabase-auth',qa:p.qa===true}};
  }catch(error){if(version!==generation)return session;if(error.status===403){clear('pending');return session;}throw Error('Vérification de votre accès impossible. Réessayez.');}
  return structuredClone(session);
 }
 async function mailAction(action){
  if(mailPending||clock()<retryAt)throw Error('Patientez avant de demander un nouvel e-mail. Vérifiez aussi votre boîte de réception.');
  mailPending=true;
  try{const result=await action();if(result.error){if(result.error.status===429||result.error.code==='over_email_send_rate_limit')rememberDelay(3600000);throw Error(accountAuthError(result.error));}rememberDelay(60000);return result;}
  finally{mailPending=false;}
 }
 return {
  assurance:'supabase-auth',getSession:()=>structuredClone(session),initialize:verify,
  async signIn({email,password}){
   if(loginPending)throw Error('Connexion en cours. Patientez.');
   loginPending=true;const version=++generation;clear();
   try{
    const result=await client.auth.signInWithPassword({email:email.trim(),password});
    if(version!==generation){await client.auth.signOut({scope:'local'});return structuredClone(session);}
    if(result.error){await client.auth.signOut({scope:'local'});throw Error(accountAuthError(result.error));}
    return await verify();
   }finally{loginPending=false;}
  },
  async signUp({firstName,lastName,email,password,confirmPassword}){
   if(typeof password!=='string'||password.length<12)throw Error('Utilisez au moins 12 caractères.');
   if(password!==confirmPassword)throw Error('Les mots de passe ne correspondent pas.');
   if(!firstName?.trim()||!lastName?.trim())throw Error('Indiquez votre prénom et votre nom.');
   generation++;clear();
   const result=await mailAction(()=>client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:config.authReturnUrl,data:{first_name:firstName.trim().slice(0,80),last_name:lastName.trim().slice(0,80)}}}));
   if(result.data?.session)await verify();
   return {message:'Si cette inscription peut être acceptée, un e-mail de confirmation vous sera envoyé. L’accès au Coaching V2 reste soumis à autorisation.'};
  },
  async forgot(email){await mailAction(()=>client.auth.resetPasswordForEmail(email.trim(),{redirectTo:config.authReturnUrl}));return {message:'Si cette adresse correspond à un compte, un e-mail a été envoyé. Ouvrez uniquement le dernier lien reçu dans ce même navigateur.'};},
  async signOut(){generation++;clear();const result=await client.auth.signOut();if(result.error)throw Error('Déconnexion distante non confirmée.');},
  destroy(){generation++;clear();subscription.data?.subscription?.unsubscribe();}
 };
}
