const C='piste-community-v2011';
const A=[
  './',
  './index.html',
  './styles.css?v=1025',
  './v2.css?v=2011',
  './app.js?v=1025',
  './v2.js?v=2010',
  './config.js',
  './manifest.webmanifest',
  './icon.svg'
];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(A)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{
   const x=r.clone();caches.open(C).then(c=>c.put(e.request,x));return r
 }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))))
});
