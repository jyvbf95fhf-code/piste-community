// Local touch protection only. No GPS, session or persistence mutation.
export function createGpsTouchGuard({onLock=()=>{},onUnlock=()=>{},setTimeout=globalThis.setTimeout,clearTimeout=globalThis.clearTimeout}={}){
 let locked=false,timer=null,epoch=0;
 const release=()=>{epoch++;if(timer!==null)clearTimeout(timer);timer=null;};
 const unlock=()=>{release();if(!locked)return;locked=false;onUnlock();};
 return {lock(){release();locked=true;onLock();},press(){release();if(!locked)return;const current=epoch;timer=setTimeout(()=>{if(current===epoch&&locked)unlock();},2000);},release,unlock,dispose(){release();locked=false;}};
}
