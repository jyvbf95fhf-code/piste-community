// Adapter local de démonstration. Aucun identifiant, token ou compte réel.
const KEY='piste.v2.mock-session';
const anonymous=()=>({authenticated:false,user:null});
const expert=()=>({user_id:'owner-sebastien',name:'Sébastien',initials:'SL',role:'Conducteur',permissions:{research:true,admin:true}});
const standard=name=>({user_id:'member-standard-01',name:name?.trim()||'Camille',initials:(name?.trim()||'Camille').slice(0,1),role:'Conducteur',permissions:{research:false,admin:false}});
export function createMockAuth(storage) {
 let session=anonymous();
 try {
  const saved=JSON.parse(storage?.getItem(KEY) || 'null');
  if(saved?.version===1 && saved.authenticated===true && ['expert','standard'].includes(saved.profile)) session={authenticated:true,user:saved.profile==='expert'?expert():standard(saved.name)};
 } catch { /* Stockage absent ou corrompu : visite anonyme. */ }
 function save(profile,name) {
  session={authenticated:true,user:profile==='expert'?expert():standard(name)};
  try { storage?.setItem(KEY,JSON.stringify({version:1,authenticated:true,profile,name:session.user.name})); } catch { /* Repli en mémoire. */ }
  return session;
 }
 return {
  getSession:()=>session,
  signIn:()=>save('expert'),
  signUp:({firstName}={})=>save('standard',firstName),
  signOut:()=>{session=anonymous();try{storage?.removeItem(KEY);}catch{};}
 };
}
export const resolveMockRoute=(route,session)=>!session.authenticated&&!route.startsWith('/auth')?'/auth':route;
