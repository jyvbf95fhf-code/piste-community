import {escapeHTML as e} from './components.mjs';
let rows=[],observer;
const valid=p=>Number.isFinite(p?.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p?.longitude)&&Math.abs(p.longitude)<=180;
export function ArchiveThumbnail(segments=[]){const good=segments.filter(s=>Array.isArray(s)&&s.length);if(!good.length||!good.every(s=>s.every(valid)))return '<span class="archive-thumbnail archive-thumbnail-empty" aria-label="Tracé indisponible"><span aria-hidden="true">⌁</span></span>';
 const sampled=good.map(s=>s.length<=80?s:Array.from({length:80},(_,i)=>s[Math.round(i*(s.length-1)/79)]));
 return `<span class="archive-thumbnail" data-archive-map="${e(JSON.stringify(sampled))}" role="img" aria-label="Miniature du tracé géographique enregistré"></span>`;
}
export function destroyArchiveMaps(){observer?.disconnect();observer=null;for(const map of rows)map.remove();rows=[];}
export function mountArchiveMaps({document=globalThis.document,L=globalThis.L,IntersectionObserver=globalThis.IntersectionObserver}={}){
 destroyArchiveMaps();if(!L)return;
 const mount=el=>{if(!el.isConnected)return;let segments;try{segments=JSON.parse(el.dataset.archiveMap);}catch{return;}if(!Array.isArray(segments)||!segments.length||!segments.every(s=>Array.isArray(s)&&s.length&&s.every(valid)))return;
  const map=L.map(el,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});rows.push(map);
  const points=segments.flat().map(p=>[p.latitude,p.longitude]);map.setView(points[0],16);if(points.length>1)map.fitBounds(points,{padding:[7,7],maxZoom:17,animate:false});
  L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',{maxZoom:19}).addTo(map);
  for(const segment of segments)if(segment.length>1)L.polyline(segment.map(p=>[p.latitude,p.longitude]),{color:'#87e7d7',weight:3,opacity:1,interactive:false}).addTo(map);
  L.circleMarker(points[0],{radius:3,color:'#091a21',weight:1,fillColor:'#a5f39d',fillOpacity:1,interactive:false}).addTo(map);if(points.length>1)L.circleMarker(points.at(-1),{radius:3,color:'#fff',weight:1,fillColor:'#ff7676',fillOpacity:1,interactive:false}).addTo(map);
 };
 if(IntersectionObserver)observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);mount(entry.target);}},{rootMargin:'160px'});
 for(const el of document?.querySelectorAll('[data-archive-map]')||[])if(observer)observer.observe(el);else mount(el);
}
