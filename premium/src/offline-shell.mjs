export function registerOfflineShell({navigator=globalThis.navigator,window=globalThis.window}={}){
 const serviceWorker=navigator?.serviceWorker,doc=window?.document;
 if(!serviceWorker||!window.isSecureContext||!doc)return;
 let reloading=false;
 serviceWorker.addEventListener('controllerchange',()=>{if(reloading)window.location.reload();});

 const showUpdate=registration=>{
  if(!serviceWorker.controller||!registration.waiting||doc.querySelector('[data-offline-shell-update]'))return;
  const notice=doc.createElement('aside');
  notice.className='offline-shell-update';
  notice.dataset.offlineShellUpdate='';
  notice.setAttribute('aria-label','Mise à jour de PISTE');
  const reload=doc.createElement('button');
  reload.type='button';
  reload.className='button button-gold';
  reload.textContent='Mettre PISTE à jour';
  reload.addEventListener('click',()=>{
   if(!registration.waiting){window.location.reload();return;}
   reloading=true;
   reload.disabled=true;
   registration.waiting.postMessage({type:'PISTE_ACTIVATE_UPDATE'});
  });
  const close=doc.createElement('button');
  close.type='button';
  close.className='button button-dark';
  close.textContent='Plus tard';
  close.addEventListener('click',()=>notice.remove());
  notice.append('Nouvelle version disponible. Rechargez après votre session.',reload,close);
  doc.body.append(notice);
 };
 const register=async()=>{
  try{
   const registration=await serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
   showUpdate(registration);
   registration.addEventListener('updatefound',()=>{
    registration.installing?.addEventListener('statechange',()=>showUpdate(registration));
   });
  }catch{}
 };
 if(doc.readyState==='complete')void register();else window.addEventListener('load',register,{once:true});
}
