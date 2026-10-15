// A restored bfcache page keeps its old JS heap. Recreate the disposed transport.
export function bindRemotePageLifecycle({window,controller,reload=()=>window.location.reload()}){
 const hide=()=>controller.destroy(),show=event=>{if(event.persisted)reload();};
 window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
 return ()=>{window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);};
}
export function remoteIdentityInvalidated(event,profileId,session){return event==='SIGNED_OUT'||event==='SIGNED_IN'&&Boolean(profileId)&&session?.user?.id!==profileId;}
