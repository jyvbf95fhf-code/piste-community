/* Static shell only. Never cache account API responses, GPS, reports or tokens. */
const CACHE='piste-v2-static-20261027-pilot-1';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/index.html','/src/tokens.css','/src/styles.css']))));
// No skipWaiting/clients.claim: an open terrain session keeps its current worker.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('piste-v2-static-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.search)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.match('/index.html').then(value=>value||Response.error())));return;
 }
 if(!url.pathname.startsWith('/src/')||!(/\.(mjs|js|css|svg|png|webmanifest)$/.test(url.pathname)))return;
 event.respondWith(fetch(request).then(response=>{if(response.ok&&response.type==='basic'){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;}).catch(()=>caches.match(request).then(value=>value||Response.error())));
});

self.addEventListener('push',event=>{event.waitUntil((async()=>{let data={};try{data=event.data?.json()||{};}catch{}await self.registration.showNotification('PISTE COMMUNITY',{body:['Vous avez reçu une demande de contact.','Vous avez reçu une invitation Coaching.'].includes(data.body)?data.body:'Une notification vous attend dans PISTE.',icon:'/src/assets/brand/icons/icon-192.png',tag:data.tag==='piste-contact'?'piste-contact':'piste-coaching',data:{url:'/notifications'}});})());});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const current=windows.find(w=>{const url=new URL(w.url);return url.origin===self.location.origin&&url.pathname==='/notifications';});if(current)return current.focus();return self.clients.openWindow('/notifications');})());});
