const columns='id,kind,schema_version,revision,payload,updated_at,deleted_at';
const record=r=>({schemaVersion:r.schema_version,kind:r.kind,id:r.id,revision:r.revision,payload:r.payload,updatedAt:r.updated_at,deletedAt:r.deleted_at});
const unwrap=result=>{if(result.error)throw Object.assign(Error('Sauvegarde refusée.'),{status:['40001','P0001'].includes(result.error.code)?409:result.error.code==='42501'?403:503});return result.data;};
export function createPersonalDataRepository(admin,ownerId){
 const write=(operation,c)=>admin.rpc('v2_personal_commit',{p_owner:ownerId,p_kind:c.kind,p_id:c.id,p_expected:c.expectedRevision,p_command:c.commandId,p_operation:operation,p_payload:c.payload||{}}).then(unwrap);
 return {
  async list({kind,cursor=null}){let query=admin.from('v2_personal_records').select(columns).eq('owner_id',ownerId).eq('kind',kind).order('id',{ascending:true});if(cursor)query=query.gt('id',cursor);const rows=unwrap(await query.limit(51));return {records:rows.slice(0,50).map(record),cursor:rows.length>50?rows[49].id:null};},
  async read({kind,id}){const row=unwrap(await admin.from('v2_personal_records').select(columns).eq('owner_id',ownerId).eq('kind',kind).eq('id',id).maybeSingle());return row?record(row):null;},
  put:c=>write('put',c),remove:c=>write('remove',c)
 };
}
