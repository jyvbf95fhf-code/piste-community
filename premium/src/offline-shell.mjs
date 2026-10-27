export function registerOfflineShell({navigator=globalThis.navigator,window=globalThis.window}={}){
 if(!navigator?.serviceWorker||!window?.isSecureContext)return;
 const register=()=>navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
 if(window.document?.readyState==='complete')void register();else window.addEventListener('load',register,{once:true});
}
