// Browser capability boundary. No location access until the user's explicit start.
export function createGpsSensor({navigator=globalThis.navigator,document=globalThis.document,onFix=()=>{},onStatus=()=>{},onGap=()=>{}}={}){
 let watchId=null,epoch=0,wake=null,active=false;
 const stop=()=>{epoch++;active=false;if(watchId!==null)navigator?.geolocation?.clearWatch(watchId);watchId=null;const lock=wake;wake=null;lock?.release().catch(()=>{});};
 const start=()=>{if(active)return;if(document?.visibilityState==='hidden'){onStatus('hidden');return;}if(!navigator?.geolocation){onStatus('unsupported');return;}const token=++epoch;active=true;onStatus('acquiring');
  try{watchId=navigator.geolocation.watchPosition(position=>{if(active&&token===epoch)onFix(position);},error=>{if(!active||token!==epoch)return;stop();onGap();onStatus(error.code===1?'denied':error.code===3?'stale':'unavailable');},{enableHighAccuracy:true,maximumAge:0,timeout:15000});}catch{stop();onGap();onStatus('unavailable');return;}
  if(navigator.wakeLock?.request)navigator.wakeLock.request('screen').then(lock=>{if(active&&token===epoch){wake=lock;onStatus('wake-active');lock.addEventListener?.('release',()=>{if(wake===lock){wake=null;onStatus('wake-unavailable');}});}else lock.release().catch(()=>{});}).catch(()=>onStatus('wake-unavailable'));else onStatus('wake-unavailable');
 };
 const visibility=()=>{if(document.visibilityState==='hidden'&&active){stop();onGap();onStatus('hidden');}};
 document?.addEventListener('visibilitychange',visibility);
 return {start,stop,running:()=>active,destroy(){stop();document?.removeEventListener('visibilitychange',visibility);}};
}
