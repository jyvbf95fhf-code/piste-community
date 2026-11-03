import {escapeHTML as e} from './components.mjs';
import {createArchiveThumbnailCache,thumbnailCacheKey} from './archive-thumbnail-cache.mjs';
let rows=[],observer,epoch=0;
const snapshots=createArchiveThumbnailCache();
const valid=p=>Number.isFinite(p?.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p?.longitude)&&Math.abs(p.longitude)<=180;
export function ArchiveThumbnail(segments=[]){const good=segments.filter(s=>Array.isArray(s)&&s.length);if(!good.length||!good.every(s=>s.every(valid)))return '<span class="archive-thumbnail archive-thumbnail-empty" aria-label="Tracé indisponible"><span aria-hidden="true">⌁</span></span>';
 const sampled=good.map(s=>s.length<=80?s:Array.from({length:80},(_,i)=>s[Math.round(i*(s.length-1)/79)]));
 return `<span class="archive-thumbnail" data-archive-map="${e(JSON.stringify(sampled))}" role="img" aria-label="Miniature du tracé géographique enregistré"></span>`;
}
export function destroyArchiveMaps(){epoch++;observer?.disconnect();observer=null;for(const row of rows){row.map?.remove();for(const url of row.urls)URL.revokeObjectURL(url);}rows=[];}
export function mountArchiveMaps({document=globalThis.document,L=globalThis.L,IntersectionObserver=globalThis.IntersectionObserver,getOwnerId=()=>null,cache=snapshots}={}){
 destroyArchiveMaps();const generation=epoch,owner=getOwnerId();
 const mount=async el=>{
  let segments;try{segments=JSON.parse(el.dataset.archiveMap);}catch{return;}if(!Array.isArray(segments)||!segments.length||!segments.every(s=>Array.isArray(s)&&s.length&&s.every(valid)))return;
  const current=()=>generation===epoch&&el.isConnected&&owner===getOwnerId();if(!current())return;
  const row={map:null,urls:new Set()};rows.push(row);
  const width=el.clientWidth,height=el.clientHeight;let key=null;
  try{if(owner)key=await thumbnailCacheKey(segments,width,height);}catch{}
  const paint=blob=>new Promise(resolve=>{
   if(!current())return resolve(false);const img=document.createElement('img'),url=URL.createObjectURL(blob);row.urls.add(url);img.alt='';img.setAttribute('aria-hidden','true');img.dataset.archiveSnapshot='true';
   img.onload=()=>{if(!current())return resolve(false);row.map?.remove();row.map=null;el.replaceChildren(img);resolve(true);};
   img.onerror=()=>{URL.revokeObjectURL(url);row.urls.delete(url);resolve(false);};img.src=url;
  });
  if(key){let saved;try{saved=await cache.get(owner,key);}catch{}if(!current())return;if(saved){if(await paint(saved))return;if(!current())return;try{await cache.remove?.(owner,key);}catch{}}}
  if(!current()||!L)return;
  const map=L.map(el,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});row.map=map;
  const points=segments.flat().map(p=>[p.latitude,p.longitude]);map.setView(points[0],16);if(points.length>1)map.fitBounds(points,{padding:[7,7],maxZoom:17,animate:false});
  const tileUrl='https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}';const tiles=L.tileLayer(tileUrl,{maxZoom:19,...(key?{crossOrigin:'anonymous'}:{})});let failed=false;
  tiles.on('tileerror',()=>{failed=true;});
  if(key)tiles.once('load',async()=>{
   if(!current())return;
   if(failed){await Promise.resolve();if(!current())return;tiles.remove();L.tileLayer(tileUrl,{maxZoom:19}).addTo(map);return;}
   try{
    const images=[...el.querySelectorAll('img.leaflet-tile')];if(!images.length||images.some(img=>!img.complete||!img.naturalWidth))return;
    const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.scale(2,2);ctx.fillStyle='#173a42';ctx.fillRect(0,0,width,height);
    const rect=el.getBoundingClientRect(),left=rect.left+el.clientLeft,top=rect.top+el.clientTop;
    for(const img of images){const tile=img.getBoundingClientRect();ctx.drawImage(img,tile.left-left,tile.top-top,tile.width,tile.height);}
    ctx.strokeStyle='#87e7d7';ctx.lineWidth=3;ctx.lineJoin=ctx.lineCap='round';
    for(const segment of segments)if(segment.length>1){ctx.beginPath();segment.forEach((p,i)=>{const point=map.latLngToContainerPoint([p.latitude,p.longitude]);if(i)ctx.lineTo(point.x,point.y);else ctx.moveTo(point.x,point.y);});ctx.stroke();}
    const marker=(p,fill,stroke)=>{const point=map.latLngToContainerPoint(p);ctx.beginPath();ctx.arc(point.x,point.y,3,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();};marker(points[0],'#a5f39d','#091a21');if(points.length>1)marker(points.at(-1),'#ff7676','#fff');
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.86));if(!blob||!current())return;
    if(await paint(blob)){if(current())try{await cache.put(owner,key,blob);}catch{}}
   }catch{/* A tainted canvas or denied storage leaves the geographic map usable. */}
  });
  tiles.addTo(map);
  for(const segment of segments)if(segment.length>1)L.polyline(segment.map(p=>[p.latitude,p.longitude]),{color:'#87e7d7',weight:3,opacity:1,interactive:false}).addTo(map);
  L.circleMarker(points[0],{radius:3,color:'#091a21',weight:1,fillColor:'#a5f39d',fillOpacity:1,interactive:false}).addTo(map);if(points.length>1)L.circleMarker(points.at(-1),{radius:3,color:'#fff',weight:1,fillColor:'#ff7676',fillOpacity:1,interactive:false}).addTo(map);
 };
 if(IntersectionObserver)observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);void mount(entry.target).catch(()=>{});}},{rootMargin:'160px'});
 for(const el of document?.querySelectorAll('[data-archive-map]')||[])if(observer)observer.observe(el);else void mount(el).catch(()=>{});
}
