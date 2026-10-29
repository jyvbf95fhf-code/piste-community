// Offline preparation contract only; no endpoint or permission is configured here.
export const PERSISTENCE_KINDS=Object.freeze(['profile','dog','track','ops','session-dog-link']);
export const persistenceUuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function validatePersistenceRecord(record){
 const keys=['schemaVersion','kind','id','revision','updatedAt','deletedAt','payload'];
 if(!record||Object.keys(record).some(k=>!keys.includes(k))||record.schemaVersion!==1||!PERSISTENCE_KINDS.includes(record.kind)||!persistenceUuid(record.id)||!Number.isSafeInteger(record.revision)||record.revision<1||typeof record.updatedAt!=='string'||!Number.isFinite(Date.parse(record.updatedAt))||record.deletedAt!==null&&(typeof record.deletedAt!=='string'||!Number.isFinite(Date.parse(record.deletedAt)))||!record.payload||typeof record.payload!=='object'||Array.isArray(record.payload))throw Error('Dossier de sauvegarde invalide.');
 return structuredClone(record);
}

export function persistenceTrackDates(value){const dates={};for(const field of ['createdAt','updatedAt'])if(Object.hasOwn(value,field)){const x=value[field];if(typeof x!=='string'||x.length>40||!/^\d{4}-\d\d-\d\dT/.test(x)||!Number.isFinite(Date.parse(x)))throw Error('Date du tracé invalide.');dates[field]=x;}return dates;}
