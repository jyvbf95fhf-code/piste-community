import {projectRemoteSession} from './coaching-service.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const checked=r=>{if(r.error)fail('Historique indisponible.',503);return r.data;};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export function createHistoryHandler({admin,authenticate,clock=Date.now}){
 return async request=>{
  const origin=request.headers.get('origin')||'',allowed=!origin||/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)||/^https:\/\/piste-community-v2-premium(?:-[a-z0-9-]+-mw2f59b8p2-4030s-projects)?\.vercel\.app$/.test(origin);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin&&allowed?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const respond=(v,status=200)=>new Response(JSON.stringify(v),{status,headers});
  try{
   if(!allowed)fail('Origine non autorisée.',403);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')fail('Méthode non autorisée.',405);
   if(Number(request.headers.get('content-length')||0)>50000)fail('Requête trop volumineuse.',413);
   const text=await request.text();if(text.length>50000)fail('Requête trop volumineuse.',413);let body;try{body=JSON.parse(text);}catch{fail('Requête invalide.');}
   const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1],user=token?await authenticate(token):null;
   if(!user?.id)fail('Connexion requise.',401);const uid=user.id;
   const pilot=checked(await admin.from('coaching_remote_users').select('id').eq('id',uid).eq('enabled',true).maybeSingle());if(!pilot)fail('Compte non autorisé.',403);
   if(body?.operation==='catalogue'){
    const domain=body.domain||'coaching';if(!['coaching','hidden','ops','track'].includes(domain)||body.cursor!=null&&(typeof body.cursor!=='string'||body.cursor.length>240||domain!=='hidden'&&!uuid(body.cursor)))fail('Curseur invalide.');
    let q=domain==='coaching'?admin.from('coaching_remote_sessions').select('id,state,owner_id,version,updated_at').contains('state',{members:[{id:uid}]}):domain==='hidden'?admin.from('v2_history_hidden').select('item_key').eq('owner_id',uid):admin.from('v2_personal_records').select('id,kind,payload,revision,updated_at,deleted_at').eq('owner_id',uid).eq('kind',domain).is('deleted_at',null);
    const column=domain==='hidden'?'item_key':'id';q=q.order(column,{ascending:true});if(body.cursor)q=q.gt(column,body.cursor);const rows=checked(await q.limit(26)),page=rows.slice(0,25);
    return respond({sessions:domain==='coaching'?page.map(r=>{let p;try{p=projectRemoteSession(r.state,uid,clock());}catch{p={dog:r.state.session?.dog?.name||'Chien indisponible',role:r.state.members?.find(m=>m.id===uid)?.role||'observer',phase:r.state.search?.phase||'UNKNOWN',pose:null,search:null};}return {...p,id:r.id,version:r.version,ownerId:r.owner_id,createdAt:r.state.createdAt??null,updatedAt:r.updated_at};}):[],hidden:domain==='hidden'?page.map(r=>r.item_key):[],records:['ops','track'].includes(domain)?page:[],cursor:rows.length>25?page.at(-1)[column]:null});
   }
   if(body?.operation!=='batch'||!Array.isArray(body.items)||!body.items.length||body.items.length>100)fail('Sélection invalide (1 à 100 éléments).');
   const results=[];
   for(const item of body.items){
    if(!item||typeof item.key!=='string'||item.key.length>240||!['hide','delete'].includes(item.action)||item.force!==undefined&&typeof item.force!=='boolean'||item.expectedVersion!==undefined&&(!Number.isSafeInteger(item.expectedVersion)||item.expectedVersion<0)){results.push({key:item?.key||'',status:'refused',reason:'Commande invalide.'});continue;}
    const r=await admin.rpc('v2_history_action',{p_actor:uid,p_key:item.key,p_action:item.action,p_expected:item.expectedVersion??null,p_force:item.force===true});
    if(r.error){const code=r.error.code;results.push({key:item.key,status:['42501','22023','55000','40001'].includes(code)?'refused':'failed',reason:code==='55001'?'Dossier ancien incohérent : réessayez en suppression forcée.':code==='42501'?'Droits insuffisants ou démonstration protégée.':code==='55000'?'Session active : arrêt requis.':code==='40001'?'Dossier modifié : actualisez puis réessayez.':'Échec de la transaction : aucune suppression partielle.'});}
    else results.push(r.data);
   }
   return respond({results});
  }catch(e){return respond({error:e.status?e.message:'Historique temporairement indisponible.'},e.status||503);}
 };
}
