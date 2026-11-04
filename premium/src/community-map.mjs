import {GPS_BASE_LAYERS} from './coaching-gps-screen.mjs';
const mounted=new Map();
export function mountCommunityMaps(root=globalThis.document,{L=globalThis.L,IntersectionObserver=globalThis.IntersectionObserver}={}){
 for(const [element,row] of mounted)if(!element.isConnected){row.observer?.disconnect();row.map?.remove();mounted.delete(element);}
 for(const element of root.querySelectorAll('[data-community-map]')){
  if(mounted.has(element))continue;const row={};mounted.set(element,row);
  const mount=()=>{if(!element.isConnected||row.map)return;let geometry;try{geometry=JSON.parse(element.dataset.communityMap);}catch{return;}if(!L){element.textContent='Carte indisponible. Réessayez après actualisation.';return;}
   const map=L.map(element,{scrollWheelZoom:false});row.map=map;const layer=GPS_BASE_LAYERS.plan;L.tileLayer(layer.url,{maxZoom:layer.maxZoom,attribution:layer.attribution}).addTo(map);const bounds=[];
   for(const segment of geometry.segments||[]){const coords=segment.map(p=>[p.y,p.x]);if(coords.length<2)continue;L.polyline(coords,{color:'#e7ba62',weight:4}).addTo(map);bounds.push(...coords);L.circleMarker(coords[0],{radius:7,color:'#fff',fillColor:'#328b58',fillOpacity:1}).addTo(map).bindTooltip('Départ');L.circleMarker(coords.at(-1),{radius:7,color:'#fff',fillColor:'#bf5555',fillOpacity:1}).addTo(map).bindTooltip('Arrivée');}if(bounds.length)map.fitBounds(bounds,{padding:[24,24],maxZoom:17});map.invalidateSize();};
  if(IntersectionObserver){row.observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){row.observer.disconnect();mount();}},{rootMargin:'200px'});row.observer.observe(element);}else mount();
 }
}
export function disposeCommunityMaps(){for(const row of mounted.values()){row.observer?.disconnect();row.map?.remove();}mounted.clear();}
