// Identity adapter only. Session membership and role authorization belong to the server.
const V1_REF='cobekrttsojzwoetyaad';
export function createCoachingRemoteAuth({client,allowedProjectRef}={}){
 if(!allowedProjectRef||allowedProjectRef===V1_REF||!/^[a-z0-9]+$/.test(allowedProjectRef))throw Error('Projet V2 isolé requis.');
 let url;try{url=new URL(client?.supabaseUrl);}catch{throw Error('URL Supabase V2 requise.');}
 if(url.origin!==`https://${allowedProjectRef}.supabase.co`||url.pathname!=='/'||url.username||url.password||url.search||url.hash)throw Error('Le client ne correspond pas au projet V2 autorisé.');
 if(!client?.auth?.getUser||!client.auth.onAuthStateChange)throw Error('Client Auth réel requis.');
 let epoch=0,identity=null,destroyed=false,check=null,lastEvent=null;const listeners=new Set();
 const publish=value=>{identity=value;for(const listener of listeners)listener(value?{...value}:null);};
 async function getUser(){
  if(destroyed)return null;
  const version=epoch;if(check?.epoch===version)return check.promise;
  const promise=(async()=>{
   let user=null;try{const result=await client.auth.getUser();if(!result.error&&typeof result.data?.user?.id==='string'&&result.data.user.id)user={id:result.data.user.id};}catch{}
   if(destroyed)return null;
   if(version!==epoch)return lastEvent==='SIGNED_OUT'?null:getUser();
   publish(user);return user?{...user}:null;
  })();
  check={epoch:version,promise};try{return await promise;}finally{if(check?.promise===promise)check=null;}
 }
 const {data}=client.auth.onAuthStateChange(event=>{
  if(destroyed||['INITIAL_SESSION','TOKEN_REFRESHED'].includes(event))return;
  lastEvent=event;const scheduled=++epoch;check=null;publish(null);
  if(event==='SIGNED_OUT')return;
  // A macrotask lets the Auth SDK release its own lock before getUser.
  setTimeout(()=>{if(!destroyed&&epoch===scheduled)void getUser();},0);
 });
 return Object.freeze({
  getUser,
  async signIn(credentials){if(destroyed)throw Error('Raccord Auth fermé.');const result=await client.auth.signInWithPassword(credentials);if(result.error){epoch++;check=null;lastEvent='SIGNED_OUT';publish(null);throw Error('Authentification impossible.');}lastEvent='SIGNED_IN';const user=await getUser();if(!user)throw Error('Identité non vérifiée après authentification.');return user;},
  async signOut(){epoch++;check=null;lastEvent='SIGNED_OUT';publish(null);const result=await client.auth.signOut();if(result.error)throw Error('Déconnexion distante non confirmée.');},
  subscribe(listener){if(destroyed)throw Error('Raccord Auth fermé.');listeners.add(listener);return ()=>listeners.delete(listener);},
  destroy(){destroyed=true;epoch++;check=null;publish(null);listeners.clear();data?.subscription?.unsubscribe();}
 });
}
