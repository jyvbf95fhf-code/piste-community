// Targeted invitations use the existing private table and coaching_commit.
// No pending assignment grants session membership before explicit acceptance.
const refusedAt='1970-01-01T00:00:00.000Z';
const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');
const denied=()=>{throw Object.assign(Error('Invitation indisponible, expirée ou non autorisée.'),{status:403});};
export function createCoachingInboxService({admin,contacts,clock=Date.now,result}){
 const eligible=(row,a)=>row.state.search.phase==='PREPARATION'&&a.status==='pending'&&!row.state.members.some(m=>m.id===a.recipientId)&&['traceur','driver','coach','observer'].includes(a.role)&&!row.state.members.some(m=>m.role===a.role&&a.role!=='observer');
 async function ensure(row,a){
  if(!eligible(row,a)||!(await contacts(row.owner_id)).some(c=>c.id===a.recipientId))return null;
  const existing=result(await admin.from('coaching_remote_invites').select('*').eq('session_id',row.id).eq('recipient_id',a.recipientId).eq('role',a.role).order('expires_at',{ascending:false}).limit(100));
  if(existing.length)return existing.find(i=>i.consumed_by)||existing.find(i=>Date.parse(i.expires_at)===0)||existing[0];
  const key=await hash(`targeted-coaching-v1:${row.id}:${a.recipientId}:${a.role}`);
  // One deterministic key prevents duplicate issuance on concurrent refreshes.
  // It is never returned to a client; recipient authentication is still mandatory.
  const expires=new Date(row.state.createdAt+86400000).toISOString();
  result(await admin.from('coaching_remote_invites').upsert({token_hash:key,session_id:row.id,recipient_id:a.recipientId,role:a.role,expires_at:expires},{onConflict:'token_hash',ignoreDuplicates:true}));
  return result(await admin.from('coaching_remote_invites').select('*').eq('token_hash',key).maybeSingle());
 }
 async function issue(row){for(const a of row.state.pendingTeam||[])await ensure(row,a);}
 async function find(row,uid,role){const assignment=row?.state.pendingTeam?.find(a=>a.recipientId===uid&&a.role===role);if(!assignment)denied();const invite=await ensure(row,assignment);if(!invite||invite.consumed_by||Date.parse(invite.expires_at)<=clock())denied();return invite;}
 return {issue,find,async inbox(uid){
  const rows=result(await admin.from('coaching_remote_sessions').select('id,owner_id,state').contains('state',{pendingTeam:[{recipientId:uid,status:'pending'}]}).order('updated_at',{ascending:false}).limit(100));const invitations=[];
  for(const row of rows){for(const a of row.state.pendingTeam||[]){if(a.recipientId!==uid)continue;const i=await ensure(row,a);if(!i||i.consumed_by||Date.parse(i.expires_at)<=clock())continue;
   const owner=row.state.members.find(m=>m.id===row.owner_id),hidden=row.state.session.mode==='full_blind'&&owner?.role==='traceur';
   invitations.push({sessionId:row.id,role:a.role,organizer:hidden?'Organisateur · identité masquée':owner?.name||'Organisateur',session:'Coaching · '+row.state.session.dog.name,expiresAt:i.expires_at});
  }}return {version:1,invitations};
 },async decline(row,uid,role){
  const a=row?.state.pendingTeam?.find(a=>a.recipientId===uid&&a.role===role);if(!a||!eligible(row,a))denied();const invite=await ensure(row,a);if(!invite||invite.consumed_by)denied();
  if(Date.parse(invite.expires_at)===0)return {declined:true};if(Date.parse(invite.expires_at)<=clock())denied();
  const changed=result(await admin.from('coaching_remote_invites').update({expires_at:refusedAt}).eq('session_id',row.id).eq('recipient_id',uid).eq('role',role).is('consumed_by',null).select('token_hash'));
  if(!changed.length)denied();return {declined:true};
 }};
}
