export function appendAdminAudit(state,{actor,action,targetType,targetId,before=null,after=null,reason='',timestamp,id}){
 const event=Object.freeze({audit_id:id||`audit-${state.audit.length+1}`,actor_id:actor.user_id,actor_role:actor.role,action,target_type:targetType,target_id:targetId,before:structuredClone(before),after:structuredClone(after),reason:String(reason||''),timestamp});
 state.audit.push(event);
 return event;
}
export function adminAuditForTarget(entries,targetId){return entries.filter(event=>event.target_id===targetId).map(event=>structuredClone(event));}
