export const adminMemberFilters=Object.freeze(['account_status','premium','jumolf','admin_role','scientific_role','contributor']);
export function searchAdminMembers(store,actor,filters={}){return store.listMembers(actor,filters);}
export function getAdminMember(store,actor,id){return store.getMember(actor,id);}
export function setAdminMemberStatus(store,actor,id,status,options){return store.setAccountStatus(actor,id,status,options);}
export function requestMemberDeletion(store,actor,id,operation,options){return store.requestDeletionOperation(actor,id,operation,options);}
