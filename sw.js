const C='piste-community-v2081';
const A=[
  './',
  './index.html',
  './styles.css?v=1027',
  './v2.css?v=2064',
  './app.js?v=1080',
  './v2.js?v=2017',
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
