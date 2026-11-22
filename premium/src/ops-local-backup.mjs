// Explicit, lossless offline export. Does not send data to Supabase or mutate local stores.
// Call only after an explicit user gesture; caller owns the download UI.
const encoder=new TextEncoder();
const sha256=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function buildLocalOpsBackup({missions,createdAt=new Date().toISOString()}={}){
 if(!Array.isArray(missions)||!missions.every(m=>m&&typeof m==='object'&&!Array.isArray(m)&&m.kind==='operational'))throw Error('Missions OPS locales invalides.');
 const entries=[];
 for(const mission of missions){
  const json=JSON.stringify(mission);if(typeof json!=='string')throw Error('Mission OPS impossible à exporter.');
  const bytes=encoder.encode(json);entries.push({mission:JSON.parse(json),bytes:bytes.length,sha256:await sha256(bytes)});
 }
 return {format:'piste-ops-local-backup',version:1,createdAt,count:entries.length,entries};
}
export async function verifyLocalOpsBackup(backup){
 if(backup?.format!=='piste-ops-local-backup'||backup.version!==1||!Array.isArray(backup.entries)||backup.entries.length!==backup.count)throw Error('Export OPS local invalide.');
 for(const entry of backup.entries){if(!entry?.mission||entry.mission.kind!=='operational'||!Number.isSafeInteger(entry.bytes)||!/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Entrée OPS invalide.');const bytes=encoder.encode(JSON.stringify(entry.mission));if(bytes.length!==entry.bytes||await sha256(bytes)!==entry.sha256)throw Error('Export OPS altéré ou incomplet.');}
 return true;
}
