// Device-local read receipts, scoped to the signed-in account and event source.
export function createNotificationReceipts(storage){
 const accounts=new Map();
 function receipts(owner){
  if(!accounts.has(owner)){
   let ids=[];try{const saved=JSON.parse(storage?.getItem('piste:notification-receipts:'+owner)||'[]');if(Array.isArray(saved))ids=saved.filter(id=>typeof id==='string');}catch{}
   accounts.set(owner,new Set(ids));
  }
  return accounts.get(owner);
 }
 const key=(source,item)=>JSON.stringify([source,item.id]);
 return {
  project(owner,source,items=[]){const seen=receipts(owner);return items.map(item=>({...item,read:!!item.read||seen.has(key(source,item))}));},
  open(owner,groups=[]){
   const seen=receipts(owner);let changed=false;
   for(const {source,items} of groups)for(const item of items)if(item.id!=null&&!seen.has(key(source,item))){seen.add(key(source,item));changed=true;}
   if(changed)try{storage?.setItem('piste:notification-receipts:'+owner,JSON.stringify([...seen]));}catch{}
  }
 };
}
