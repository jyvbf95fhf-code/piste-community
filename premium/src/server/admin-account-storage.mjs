// Service-role client only. Paths come exclusively from the owner-checked RPC.
export async function cleanAccountStorage(admin,actor,target,payload){
 let removed=0;
 for(let page=0;page<100;page++){
  let manifest;try{manifest=await admin.rpc('v2_admin_deletion_storage',{p_actor:actor,p_target:target,p_payload:payload});}catch{return {error:{message:'storage_cleanup_failed'},removed};}
  if(manifest.error)return {error:manifest.error,removed};
  const objects=manifest.data?.objects;
  if(!Array.isArray(objects))return {error:{message:'storage_cleanup_failed'},removed};
  if(!objects.length)return {error:null,removed};
  const buckets=new Map();
  for(const file of objects){if(typeof file.bucket_id!=='string'||typeof file.name!=='string')return {error:{message:'storage_cleanup_failed'},removed};if(!buckets.has(file.bucket_id))buckets.set(file.bucket_id,[]);buckets.get(file.bucket_id).push(file.name);}
  for(const [bucket,paths] of buckets){try{const result=await admin.storage.from(bucket).remove(paths);if(result.error)return {error:{message:'storage_cleanup_failed'},removed};removed+=paths.length;}catch{return {error:{message:'storage_cleanup_failed'},removed};}}
 }
 return {error:{message:'storage_cleanup_failed'},removed};
}
