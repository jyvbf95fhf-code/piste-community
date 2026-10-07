export function scientificGovernanceSummary(store,actor){
 const state=store.snapshot(actor),members=state.members;
 return {contributors:members.filter(m=>['active','partial'].includes(m.scientific_contribution?.status)).length,withdrawn:members.filter(m=>m.scientific_contribution?.status==='withdrawn').length,researchers:state.scientific_roles.filter(r=>r.status==='active'&&r.role==='researcher').length,readers:state.scientific_roles.filter(r=>r.status==='active'&&r.role==='scientific_reader').length,excluded:state.corpus_governance.filter(item=>item.operation==='exclude_session').length,opsAllowed:members.filter(m=>m.scientific_contribution?.ops_enabled).length,synthetic:true};
}
export function trySetMemberResearchConsent(store,actor,id,consent){return store.setScientificConsent(actor,id,consent);}
export function excludeScientificSession(store,actor,id,options){return store.governCorpus(actor,id,'exclude_session',options);}
export function suspendScientificInclusion(store,actor,id,options){return store.governCorpus(actor,id,'suspend',options);}
export function assignScientificRole(store,actor,id,role,options){return store.assignScientificRole(actor,id,role,options);}
export function revokeScientificRole(store,actor,id,options){return store.revokeScientificRole(actor,id,options);}
