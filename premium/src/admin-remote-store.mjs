import {canAdminAct} from './admin-access.mjs';
import {adminQuotas} from './admin-services.mjs';
const empty=()=>({real:true,members:[],audit:[],codes:[],summary:{},consent_history:[],entitlement_history:[],scientific_roles:[],scientific_role_history:[],corpus_governance:[],services:[],quotas:adminQuotas,serviceSummary:{healthy:'Non récupéré',total:'Non récupéré'},deployments:[],version:{label:'V2',app_version:'Bloc 5',environment:'Développement V2'},errors:[],diagnostics:[],alerts:[]});
const supported=new Set(['create_code','manage_codes','gift_premium','revoke_gift_premium','read','read_dashboard','read_members','read_member','read_premium','read_codes','read_scientific','read_services','read_deployments','read_errors','read_audit','suspend_account','reactivate_account','grant_premium','revoke_premium','grant_jumolf','revoke_jumolf','grant_scientific_role','revoke_scientific_role','manage_admin_roles']);
export function createRemoteAdminStore({actor,call,onChange=()=>{},loadRoutingQuotas=null}){
 let data=empty(),owner=null,key=null,loading=null,last=0,error='';
 const accessFor=who=>({allowed:who?.assurance==='supabase-auth'&&who.permissions?.admin===true&&who.admin_role==='owner_admin',role:who?.admin_role||null});
 function scope(){const who=actor();if(owner!==who?.user_id){owner=who?.user_id;data=empty();key=null;last=0;error='';}return who;}
 function snapshot(who){scope();if(!accessFor(who).allowed)throw Error('not_admin');return structuredClone({...data,loadError:error,loading:Boolean(loading)});}
 const canAct=(who,action)=>{
  if(!accessFor(who).allowed||!supported.has(action))return {allowed:false,reason:'forbidden_action'};
  if(['create_code','manage_codes'].includes(action))return {allowed:data.gift_codes_version===1};
  if(!action.startsWith('read')&&!(data.member_management_version>=2))return {allowed:false,reason:'forbidden_action'};
  return ['gift_premium','revoke_gift_premium'].includes(action)?{allowed:true}:canAdminAct(who,action,{roleAssignments:{[who.user_id]:who.admin_role}});
 };
 async function refresh(nextKey,force=false){const who=scope();if(!accessFor(who).allowed)return;if(loading)return loading;if(!force&&key===nextKey&&Date.now()-last<30000)return;key=nextKey;const id=owner;
  loading=(async()=>{try{const params=new URL(nextKey||'/admin','https://piste.invalid').searchParams;const result=await call({operation:'admin-snapshot',codesPage:Number(params.get('page')||0),codesHistoryPage:Number(params.get('historyPage')||0)});if(actor()?.user_id!==id)return;data={...empty(),...result,quotas:adminQuotas};if(typeof loadRoutingQuotas==='function'){try{data.routingQuotas=await loadRoutingQuotas();}catch{data.routingQuotas={error:'Données de quotas temporairement indisponibles'};}}error='';last=Date.now();}catch(e){if(actor()?.user_id===id){data=empty();error=e.message;last=Date.now();}}finally{loading=null;if(actor()?.user_id===id)onChange();}})();return loading;
 }
 return {real:true,accessFor,canAct,assertAction(who,action){if(!canAct(who,action).allowed)throw Error('forbidden_action');},snapshot,refresh,
 listMembers(who,query={}){const rows=snapshot(who).members,q=String(query.query||'').toLocaleLowerCase();return rows.filter(m=>!q||[m.display_name,m.email,m.user_id].some(v=>String(v).toLocaleLowerCase().includes(q)));},
 getMember:(who,id)=>snapshot(who).members.find(m=>m.user_id===id)||null,listCodes:who=>snapshot(who).codes,listAudit:who=>snapshot(who).audit,
 async perform(action,payload){scope();const id=actor()?.user_id;if(!accessFor(actor()).allowed)throw Error('not_admin');const result=await call({operation:'admin-command',action,targetId:payload.targetId||payload.id,payload:{...payload,...(['gift-premium','create-code'].includes(action)&&!payload.requestId?{requestId:crypto.randomUUID()}:{} )}});if(actor()?.user_id!==id)throw Error('Compte modifié.');await refresh(key,true);if(actor()?.user_id!==id)throw Error('Compte modifié.');if(action==='create-code'){data.revealed_code=result.revealed_code||null;data.code_notice=result.notice||'';}return result;},codeCatalog:()=>null};
}
