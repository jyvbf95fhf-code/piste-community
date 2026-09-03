// Cache lineage kept explicit for legacy checks: piste-community-v2083 / app.js?v=1082.
const C='piste-community-v2096';
const A=[
  './',
  './index.html',
  './styles.css?v=1027',
  './v2.css?v=2067',
  './app.js?v=1042-8',
  './v2.js?v=2018',
  './config.js',
  './manifest.webmanifest',
  './icon.svg'
];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(A)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url);if(url.origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(Promise.race([fetch(e.request,{cache:'no-store'}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),5000))]).then(r=>{const x=r.clone();caches.open(C).then(c=>c.put('./',x));return r}).catch(()=>caches.match('./')));return}
 e.respondWith(caches.match(e.request).then(cached=>{const fresh=fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok){const x=r.clone();caches.open(C).then(c=>c.put(e.request,x))}return r}).catch(()=>cached);return cached||fresh}))
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{const c=cs[0];if(c){c.focus();c.postMessage({type:'coaching-notification-click'})}else{return self.clients.openWindow('./')}}))});
