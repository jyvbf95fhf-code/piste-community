import {resolveAdminRoute,ADMIN_ROUTE_LINKS} from './admin-routes.mjs';
import {AdminScreen} from './admin-screen.mjs';
import {getAdminServiceSummary} from './admin-services.mjs';
import {listAdminDeployments,adminCurrentVersion} from './admin-deployments.mjs';
import {filterAdminErrors,adminDiagnostics,adminAlerts} from './admin-errors.mjs';
import {buildAdminEntitlement} from './admin-entitlements.mjs';

export function createAdminController({store,actor=()=>null,navigate=()=>{},render=()=>{},toast=()=>{},confirm=()=>false,clock=()=>new Date().toISOString()}={}){
 const currentActor=()=>typeof actor==='function'?actor():actor;
 function view(path){
  const route=typeof path==='string'?resolveAdminRoute(path):path,who=currentActor(),access=store.accessFor(who);
  if(!route)return {route:null,access:{allowed:false,role:null,reason:'not_admin'},data:null};
  if(!access.allowed)return {route,access,data:null};
  const data={navigation:ADMIN_ROUTE_LINKS,summary:{},members:[],codes:[],audit:[],entitlement_history:[],consent_history:[],scientific_roles:[],corpus_governance:[],permissions:{manageAccount:store.canAct(who,'suspend_account').allowed,manageEntitlements:store.canAct(who,'grant_premium').allowed,manageCodes:store.canAct(who,'create_code').allowed,governCorpus:store.canAct(who,'suspend_corpus_inclusion').allowed,manageScientificRoles:store.canAct(who,'grant_scientific_role').allowed,manageAdminRoles:store.canAct(who,'manage_admin_roles').allowed,permanentDelete:store.canAct(who,'permanent_mock_delete').allowed,requestDeletion:store.canAct(who,'request_account_deletion').allowed},serviceSummary:getAdminServiceSummary(),services:getAdminServiceSummary().services,quotas:getAdminServiceSummary().quotas,deployments:listAdminDeployments(),version:adminCurrentVersion(),errors:filterAdminErrors(route.query||{}),diagnostics:adminDiagnostics(),alerts:adminAlerts()};
  if(['dashboard','members','member','premium','codes','scientific','audit'].includes(route.type))Object.assign(data,store.snapshot(who));
  if(route.type==='members')data.members=store.listMembers(who,route.query||{});
  if(route.type==='member')data.member=store.getMember(who,route.id);
  if(route.type==='codes')data.codes=store.listCodes(who);
  if(route.type==='audit')data.audit=store.listAudit(who);
  if(route.type==='premium')data.members=store.listMembers(who);
  return {route,access,data};
 }
 function screen(path){return AdminScreen({route:typeof path==='string'?resolveAdminRoute(path):path,model:view(path)});}
 function perform(action,payload={}){
  const who=currentActor(),id=payload.targetId||payload.id||null;
  const actionKey={ 'suspend-account':'suspend_account','delete-account':'permanent_mock_delete','reactivate-account':'reactivate_account','request-account-deletion':'request_account_deletion','request-personal-data-deletion':'request_personal_data_deletion','request-corpus-deletion':'suspend_corpus_inclusion','request-access-revocation':'revoke_jumolf','revoke-premium':'revoke_premium','revoke-jumolf':'revoke_jumolf','grant-premium':'grant_premium','grant-jumolf':'grant_jumolf','create-code':'create_code','create-code-batch':'create_code','revoke-code':'manage_codes','delete-code':'manage_codes','deactivate-code':'manage_codes','activate-code':'manage_codes','duplicate-code':'manage_codes','extend-code':'manage_codes','assign-scientific-role':'grant_scientific_role','revoke-scientific-role':'revoke_scientific_role','exclude-session':'exclude_corpus_session','suspend-corpus':'suspend_corpus_inclusion','set-admin-role':'manage_admin_roles'}[action];
  if(!actionKey)throw new Error('unknown_admin_action');
  store.assertAction(who,actionKey,id);
  let result;
  switch(action){
   case 'suspend-account':result=store.setAccountStatus(who,id,'suspended',payload);break;
   case 'delete-account':result=store.setAccountStatus(who,id,'deleted_mock',payload);break;
   case 'reactivate-account':result=store.setAccountStatus(who,id,'active',payload);break;
   case 'request-account-deletion':result=store.requestDeletionOperation(who,id,'account',payload);break;
   case 'request-personal-data-deletion':result=store.requestDeletionOperation(who,id,'personal_data',payload);break;
   case 'request-corpus-deletion':result=store.requestDeletionOperation(who,id,'corpus',payload);break;
   case 'request-access-revocation':result=store.requestDeletionOperation(who,id,'access',payload);break;
   case 'grant-premium':if(payload.duration==='custom'&&!payload.expiresAt)throw new Error('custom_expiration_required');result=store.grantPremium(who,id,buildAdminEntitlement({kind:'premium',durationDays:payload.durationDays??null,expiresAt:payload.duration==='custom'?payload.expiresAt:null,source:'admin_grant',sourceId:payload.sourceId||null,now:clock(),note:payload.note||''}),payload);break;
   case 'revoke-premium':result=store.revokePremium(who,id,payload);break;
   case 'grant-jumolf':if(payload.duration==='custom'&&!payload.expiresAt)throw new Error('custom_expiration_required');result=store.grantJumolf(who,id,buildAdminEntitlement({kind:'jumolf',durationDays:payload.durationDays??null,expiresAt:payload.duration==='custom'?payload.expiresAt:null,source:'admin_grant',sourceId:payload.sourceId||`admin-grant-${id}`,now:clock(),note:payload.note||''}),payload);break;
   case 'revoke-jumolf':result=store.revokeJumolf(who,id,payload);break;
   case 'create-code':result=store.createCode(who,payload);break;
   case 'create-code-batch':result=store.createCodeBatch(who,payload);break;
   case 'revoke-code':case 'delete-code':case 'deactivate-code':case 'activate-code':case 'duplicate-code':case 'extend-code':result=store.updateCode(who,id,action==='revoke-code'?'revoked':action==='delete-code'?'deleted':action==='deactivate-code'?'deactivated':action==='activate-code'?'activated':action==='duplicate-code'?'duplicate':'extended',payload,payload);break;
   case 'assign-scientific-role':result=store.assignScientificRole(who,id,payload.role,payload);break;
   case 'revoke-scientific-role':result=store.revokeScientificRole(who,id,payload);break;
   case 'exclude-session':result=store.governCorpus(who,id,'exclude_session',payload);break;
   case 'suspend-corpus':result=store.governCorpus(who,id,'suspend',payload);break;
   case 'set-admin-role':result=store.setAdminRole(who,id,payload.role,payload);break;
  }
  toast('Action mock enregistrée dans l’audit Admin.');render();return result;
 }
 function handleSubmit(event){
  const form=event.target.closest?.('[data-admin-form]');if(!form)return false;event.preventDefault();
  const values=Object.fromEntries(new FormData(form).entries()),action=form.dataset.adminForm,payload={...values,targetId:form.dataset.targetId||values.targetId,id:form.dataset.targetId||values.id,confirmed:form.elements.confirm?.checked===true,reason:values.reason||'',max_uses:Number(values.max_uses),count:Number(values.count),entitlement_duration_days:values.entitlement_duration_days?Number(values.entitlement_duration_days):null,durationDays:values.duration==='permanent'||values.duration==='custom'?null:Number(values.duration||0),expiresAt:values.expires_at&&Number.isFinite(Date.parse(values.expires_at))?new Date(values.expires_at).toISOString():null,role:values.role||null};
  try{perform(action,payload);form.reset();}catch(error){toast(error.message==='confirmation_required'?'Cochez la confirmation avant de continuer.':error.message==='reason_required'?'Un motif est requis.':error.message==='custom_expiration_required'?'Une date d’expiration valide est requise.':`Action refusée : ${error.message}`);}
  return true;
 }
 return Object.freeze({view,screen,perform,handleSubmit,handleClick(event){const link=event.target.closest?.('[data-admin-nav]');if(link){event.preventDefault();navigate(link.getAttribute('href'));return true;}return false;}});
}
