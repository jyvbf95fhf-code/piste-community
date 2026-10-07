export const OWNER_ADMIN_ID='owner-sebastien';
export const ADMIN_ROLES=Object.freeze(['owner_admin','admin','support_admin','readonly_admin']);
const FIXED_ROLES=Object.freeze({
 [OWNER_ADMIN_ID]:'owner_admin',
 'admin-demo-01':'admin',
 'support-demo-01':'support_admin',
 'readonly-demo-01':'readonly_admin'
});
const READ_ACTIONS=new Set(['read','read_dashboard','read_members','read_member','read_premium','read_codes','read_scientific','read_services','read_deployments','read_errors','read_audit']);
const ACTION_ROLES=Object.freeze({
 suspend_account:['owner_admin','admin','support_admin'],reactivate_account:['owner_admin','admin','support_admin'],
 request_account_deletion:['owner_admin','admin'],request_personal_data_deletion:['owner_admin','admin'],
 grant_premium:['owner_admin','admin'],revoke_premium:['owner_admin','admin'],grant_jumolf:['owner_admin','admin'],revoke_jumolf:['owner_admin','admin'],
 manage_codes:['owner_admin','admin'],create_code:['owner_admin','admin'],revoke_code:['owner_admin','admin'],
 suspend_corpus_inclusion:['owner_admin','admin'],exclude_corpus_session:['owner_admin','admin'],grant_scientific_role:['owner_admin','admin'],revoke_scientific_role:['owner_admin','admin'],
 manage_admin_roles:['owner_admin'],change_admin_role:['owner_admin'],permanent_mock_delete:['owner_admin']
});
const OWNER_PROTECTED_ACTIONS=new Set(['suspend_account','delete_account','request_account_deletion','request_personal_data_deletion','revoke_premium','revoke_jumolf','manage_admin_roles','change_admin_role','permanent_mock_delete','grant_premium','grant_jumolf']);
function assignedRole(userId,roleAssignments){
 if(!userId)return null;
 const candidate=roleAssignments?.[userId] ?? FIXED_ROLES[userId];
 return ADMIN_ROLES.includes(candidate)?candidate:null;
}
export function adminActorFor(actor,roleAssignments){
 const userId=actor?.user_id||actor?.id||null;
 return Object.freeze({user_id:userId,role:assignedRole(userId,roleAssignments)});
}
export function adminAccessFor(actor,roleAssignments){
 const resolved=adminActorFor(actor,roleAssignments);
 return Object.freeze({allowed:resolved.role!==null,role:resolved.role,reason:resolved.role?'allowed':'not_admin'});
}
export function canAdminAct(actor,action,{targetId=null,roleAssignments}={}){
 const {role,user_id:userId}=adminActorFor(actor,roleAssignments);
 if(!role)return Object.freeze({allowed:false,reason:'not_admin'});
 if(targetId===OWNER_ADMIN_ID&&userId!==OWNER_ADMIN_ID&&OWNER_PROTECTED_ACTIONS.has(action))return Object.freeze({allowed:false,reason:'owner_protected'});
 if(READ_ACTIONS.has(action))return Object.freeze({allowed:true,reason:'allowed'});
 const allowedRoles=ACTION_ROLES[action]||[];
 return Object.freeze({allowed:allowedRoles.includes(role),reason:allowedRoles.includes(role)?'allowed':'forbidden_action'});
}
export function assertAdminAction(actor,action,options={}){
 const decision=canAdminAct(actor,action,options);
 if(!decision.allowed)throw new Error(decision.reason);
 return decision;
}
