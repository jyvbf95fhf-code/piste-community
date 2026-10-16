// Test-only server contract. The authenticated principal is supplied by the harness.
export function createMemoryPersistenceServer(){
 const owners=new Map();
 return {client(ownerId){if(!ownerId)throw Error('Identity required');if(!owners.has(ownerId))owners.set(ownerId,{records:new Map(),commands:new Map()});const state=owners.get(ownerId);
  const read=async({kind,id})=>structuredClone(state.records.get(kind+':'+id)||null);
  async function write(command,removed){const key=command.kind+':'+command.id,fingerprint=JSON.stringify({...command,removed});
   const prior=state.commands.get(command.commandId);if(prior){if(prior.fingerprint!==fingerprint)throw Object.assign(Error('Command reused'),{status:409});return structuredClone(prior.record);}
   const old=state.records.get(key);if((old?.revision||0)!==command.expectedRevision)throw Object.assign(Error('Revision conflict'),{status:409});
   const record={schemaVersion:1,kind:command.kind,id:command.id,revision:(old?.revision||0)+1,updatedAt:new Date().toISOString(),deletedAt:removed?new Date().toISOString():null,payload:structuredClone(command.payload||old?.payload||{})};
   state.records.set(key,record);state.commands.set(command.commandId,{fingerprint,record});return structuredClone(record);
  }
  return {read,put:c=>write(c,false),remove:c=>write(c,true),async list({kind,cursor=null}){const offset=cursor?Number(cursor):0,rows=[...state.records.values()].filter(r=>r.kind===kind);return {records:structuredClone(rows.slice(offset,offset+2)),cursor:rows.length>offset+2?String(offset+2):null};}};
 }};
}
