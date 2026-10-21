// Stable identity only: no engines or I/O. Safe for deletion guards.
export const LOBO_DEMO_OWNER_ID='eeca6271-b459-443b-8c2f-46ce20215c8a';
export const LOBO_DEMO_LABEL='Démonstration fictive';
const uuid=n=>'10b00000-0000-4000-8000-'+String(n).padStart(12,'0');
export const LOBO_DEMO_MANIFEST=Object.freeze({version:1,ownerId:LOBO_DEMO_OWNER_ID,label:LOBO_DEMO_LABEL,dogId:uuid(1),opsIds:Object.freeze(Array.from({length:20},(_,n)=>uuid(1001+n))),coachingIds:Object.freeze(Array.from({length:20},(_,n)=>uuid(2001+n)))});
