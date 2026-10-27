// A shared throttle for foreground-only reads. No timers, identity or transport owned here.
export function createForegroundRefresh({clock=Date.now,interval=60000}={}){
 let owner=null,last=-Infinity,pending=null;
 return {async run({ownerId,visible,refresh,force=false}={}){
  if(ownerId!==owner){owner=ownerId;last=-Infinity;pending=null;}
  if(!ownerId||!visible||typeof refresh!=='function')return false;
  if(pending)return pending;
  if(!force&&clock()-last<interval)return false;
  last=clock();const work=Promise.resolve().then(refresh).then(()=>true,()=>false);
  pending=work;try{return await work;}finally{if(pending===work)pending=null;}
 }};
}
