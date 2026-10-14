// Identity adapter only. Session membership and role authorization belong to the server.
const V1_REF='cobekrttsojzwoetyaad';
export function createCoachingRemoteAuth({client,allowedProjectRef}={}){
 if(!allowedProjectRef||allowedProjectRef===V1_REF||!/^[a-z0-9]+$/.test(allowedProjectRef))throw Error('Projet V2 isolé requis.');
 let url;try{url=new URL(client?.supabaseUrl);}catch{throw Error('URL Supabase V2 requise.');}
 if(url.origin!==`https://${allowedProjectRef}.supabase.co`||url.pathname!=='/'||url.username||url.password||url.search||url.hash)throw Error('Le client ne correspond pas au projet V2 autorisé.');
 if(!client?.auth?.getUser||!client.auth.onAuthStateChange)throw Error('Client Auth réel requis.');
 let epoch=0,identity=null,destroyed=false;const listeners=new Set();
 const publish=value=>{identity=value;for(const listener of listeners)listener(value?{...value}:null);};
 async function getUser(){if(destroyed)return null;const version=++epoch;let user=null;try{const result=await client.auth.getUser();if(!result.error&&typeof result.data?.user?.id==='string'&&result.data.user.id)user={id:result.data.user.id};}catch{}if(version!==epoch||destroyed)return identity?{...identity}:null;publish(user);return user?{...user}:null;}
 const {data}=client.auth.onAuthStateChange(event=>{if(destroyed)return;if(event==='SIGNED_OUT'){epoch++;publish(null);return;}const scheduled=++epoch;publish(null);queueMicrotask(()=>{if(!destroyed&&epoch===scheduled)void getUser();});});
 return Object.freeze({
  getUser,
  async signIn(credentials){if(destroyed)throw Error('Raccord Auth fermé.');const result=await client.auth.signInWithPassword(credentials);if(result.error){epoch++;publish(null);throw Error('Authentification impossible.');}const user=await getUser();if(!user)throw Error('Identité non vérifiée après authentification.');return user;},
  async signOut(){epoch++;publish(null);const result=await client.auth.signOut();if(result.error)throw Error('Déconnexion distante non confirmée.');},
  subscribe(listener){if(destroyed)throw Error('Raccord Auth fermé.');listeners.add(listener);return ()=>listeners.delete(listener);},
  destroy(){destroyed=true;epoch++;publish(null);listeners.clear();data?.subscription?.unsubscribe();}
 });
}
