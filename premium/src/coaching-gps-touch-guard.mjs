// Local touch protection only. No GPS, session or persistence mutation.
export function createGpsTouchGuard({onLock=()=>{},onUnlock=()=>{},setTimeout=globalThis.setTimeout,clearTimeout=globalThis.clearTimeout}={}){
 let locked=false,timer=null,epoch=0;
 const release=()=>{epoch++;if(timer!==null)clearTimeout(timer);timer=null;};
 const unlock=()=>{release();if(!locked)return;locked=false;onUnlock();};
 return {lock(){release();locked=true;onLock();},press(){release();if(!locked)return;const current=epoch;timer=setTimeout(()=>{if(current===epoch&&locked)unlock();},2000);},release,unlock,dispose(){release();locked=false;}};
}

// Keep the hold owned by the button instead of Safari's text/callout gestures.
export function bindGpsTouchUnlock(button,guard){
 let pointerId=null;
 const release=event=>{
  if(pointerId===null||event.pointerId!==pointerId)return;
  const id=pointerId;pointerId=null;guard.release();
  try{if(button.hasPointerCapture?.(id))button.releasePointerCapture(id);}catch{}
 };
 button.addEventListener('pointerdown',event=>{
  if(event.isPrimary===false||event.button!==0||pointerId!==null)return;
  event.preventDefault();pointerId=event.pointerId;
  try{button.setPointerCapture?.(pointerId);}catch{}
  guard.press();
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,release);
 button.addEventListener('pointerleave',event=>{
  if(!button.hasPointerCapture?.(event.pointerId))release(event);
 });
 button.addEventListener('pointermove',event=>{
  if(event.pointerId!==pointerId)return;
  const r=button.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)release(event);
 });
 button.addEventListener('contextmenu',event=>event.preventDefault());
}
