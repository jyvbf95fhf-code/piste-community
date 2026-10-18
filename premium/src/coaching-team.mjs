// Shared validation of intentions only; this never grants membership or delegation.
import {roleTypes} from './coaching.mjs';
const uuid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const fail=message=>{throw Object.assign(Error(message),{status:400});};
export function coachingTeamContacts(contacts,ownerId){
 if(!uuid(ownerId)||!Array.isArray(contacts)||contacts.length>200)fail('Catalogue de contacts indisponible.');
 const ids=new Set();return contacts.map(c=>{if(!uuid(c?.id)||c.id===ownerId||ids.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>80||c.quick_coaching_invite_authorized!==true)fail('Contact Coaching non autorisé.');ids.add(c.id);return {id:c.id,name:c.name.trim(),quick_coaching_invite_authorized:true};});
}
export function normalizeCoachingTeam({assignments,contacts,ownerId,creatorRole,scenario}){
 const allowed=coachingTeamContacts(contacts,ownerId),ids=new Set(),assigned=new Set();
 if(!Array.isArray(assignments)||assignments.length>32)fail('Affectations invalides.');
 return assignments.map(a=>{
  if(!a||!roleTypes.some(r=>r.id===a.role)||!allowed.some(c=>c.id===a.recipientId)||ids.has(a.recipientId)||a.role===creatorRole||a.role==='traceur'&&scenario!=='connected_traceur'||a.role==='driver'&&scenario!=='connected_traceur'||a.role!=='observer'&&assigned.has(a.role))fail('Contact, fonction ou cumul non autorisé.');
  ids.add(a.recipientId);assigned.add(a.role);return {recipientId:a.recipientId,role:a.role};
 });
}
export function coachingDraftAssignments(d){return roleTypes.flatMap(r=>(r.id==='observer'?d.roles.observers:[d.roles[r.id]]).filter(id=>id&&id!=='self'&&!id.startsWith('pending-')).map(recipientId=>({recipientId,role:r.id})));}
