export function createAdminCode(store,actor,input){return store.createCode(actor,input);}
export function createAdminCodeBatch(store,actor,input){return store.createCodeBatch(actor,input);}
export function changeAdminCode(store,actor,id,action,updates={},options={}){return store.updateCode(actor,id,action,updates,options);}
export function listAdminCodes(store,actor){return store.listCodes(actor);}
