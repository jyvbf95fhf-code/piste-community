// Account-bound observer reads only; never joins a Coaching session or starts GPS.
export function createFriendLiveClient({ownerId,call,onChange=()=>{},clock=Date.now}={}){
 let disposed=false,inflight=null,last=0,sessions=[],projection=null,selected=null,error='',loading=false,revision=0;
 const view=()=>({ownerId,selected,sessions:structuredClone(sessions),projection:projection?structuredClone(projection):null,error,loading});
 const disconnected={state:'disconnected',label:'Déconnecté · dernière réception conservée'};
 const failed=e=>{if([401,403].includes(e.status)){sessions=[];projection=null;}else{sessions=sessions.map(s=>({...s,activity:disconnected}));if(projection&&!projection.ended)projection={...projection,activity:disconnected};}error=e.message||'Live indisponible.';};
 const changed=()=>{if(!disposed)onChange(view());};
 async function loadProjection(id,ticket){try{const result=await call({operation:'community-live-read',sessionId:id});if(!disposed&&ticket===revision&&selected===id)projection=result.projection||null;}catch(e){if(!disposed&&ticket===revision){failed(e);}}}
 async function refresh(force=false){if(disposed)return;if(inflight)return inflight;if(!force&&clock()-last<15000)return;last=clock();loading=true;
  const ticket=revision;inflight=(async()=>{try{const result=await call({operation:'community-live-list'});if(disposed||ticket!==revision)return;if(result.version!==1||!Array.isArray(result.sessions))throw Error('Liste Live indisponible.');sessions=result.sessions;error='';if(selected)await loadProjection(selected,ticket);}catch(e){if(!disposed&&ticket===revision){failed(e);}}finally{inflight=null;loading=false;changed();}})();changed();return inflight;
 }
 return {view,refresh,async open(id){if(disposed)return;if(selected===id&&projection)return;selected=id;projection=null;error='';const ticket=++revision;await loadProjection(id,ticket);changed();},close(){selected=null;projection=null;revision++;},dispose(){disposed=true;revision++;sessions=[];projection=null;}};
}
