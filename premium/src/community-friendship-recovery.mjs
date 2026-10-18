// A local snapshot is never evidence of server-side acceptance. No network or writes.
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function planLocalFriendshipRecovery(snapshot,ownerId){
 const result={candidates:[],unverifiable:[],autoConfirmed:0};
 const seen=new Set();for(const relation of snapshot?.contacts||[]){
  const ids=relation?.userIds;
  if(!uuid(ownerId)||snapshot.viewerId!==ownerId||!Array.isArray(ids)||ids.length!==2||ids[0]===ids[1]||!ids.includes(ownerId)||ids.some(id=>!uuid(id))){result.unverifiable.push({reason:'Identité locale non vérifiable'});continue;}
  const peerId=ids.find(id=>id!==ownerId);if(seen.has(peerId))continue;seen.add(peerId);
  result.candidates.push({peerId,nextAction:'contact-request',requiresUserConfirmation:true,requiresRecipientAcceptance:true,quickCoachingDefault:false});
 }
 return result;
}
