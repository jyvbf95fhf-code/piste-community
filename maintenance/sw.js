/* V1 maintenance only. No account, token, local record or database is changed. */
const CACHE='piste-community-maintenance-20261016';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.add(new Request('/index.html',{cache:'reload'}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('piste-community-')&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
 for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true})){
  if(new URL(client.url).origin===self.location.origin)void client.navigate('/').catch(()=>{});
 }
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin){event.respondWith(Promise.resolve(Response.error()));return;}
 if(event.request.mode==='navigate'){
  event.respondWith(fetch('/index.html',{cache:'no-store'}).catch(()=>caches.match('/index.html')));
  return;
 }
 if(url.pathname==='/icon.svg'||url.pathname==='/sw.js')return;
 event.respondWith(Promise.resolve(new Response('PISTE Community revient prochainement.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Retry-After':'86400'}})));
});
