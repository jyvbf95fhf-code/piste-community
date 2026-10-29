// Reuse the existing OPS read command. Reading never accepts an invitation.
export function createNotificationReadSync({ownerId,getOwnerId,receipts,remote}){
 const acknowledged=new Set();let pending=null;
 return {flush(){
  if(pending)return pending;
  pending=(async()=>{
   for(const item of remote.view().notifications||[]){
    if(getOwnerId()!==ownerId)return;
    if(item.read||!item.session_id||acknowledged.has(item.id)||!receipts.project(ownerId,'ops',[item])[0].read)continue;
    try{await remote.markRead(item.session_id);if(getOwnerId()===ownerId)acknowledged.add(item.id);}catch{/* Keep the local receipt and retry on the next refresh. */}
   }
  })().finally(()=>{pending=null;});return pending;
 }};
}
