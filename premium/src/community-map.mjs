import {GPS_BASE_LAYERS} from './coaching-gps-screen.mjs';
const mounted=new Map();
let overlay=null;
function paint(element,L,geometry,{fullscreen=false}={}){
 const map=L.map(element,{scrollWheelZoom:fullscreen,zoomControl:true});
 const layer=GPS_BASE_LAYERS.aerial;
 let tiles=L.tileLayer(layer.url,{maxZoom:layer.maxZoom,attribution:layer.attribution}).addTo(map);
 const bounds=[];
 for(const segment of geometry.segments||[]){
  const coords=segment.filter(p=>Number.isFinite(p.y)&&Number.isFinite(p.x)).map(p=>[p.y,p.x]);
  if(coords.length<2)continue;
  L.polyline(coords,{color:'#e7ba62',weight:4}).addTo(map);
  bounds.push(...coords);
  L.circleMarker(coords[0],{radius:7,color:'#fff',fillColor:'#328b58',fillOpacity:1}).addTo(map).bindTooltip('Départ');
  L.circleMarker(coords.at(-1),{radius:7,color:'#fff',fillColor:'#bf5555',fillOpacity:1}).addTo(map).bindTooltip('Arrivée');
 }
 if(bounds.length)map.fitBounds(bounds,{padding:[24,24],maxZoom:17});
 const switchLayer=id=>{const next=GPS_BASE_LAYERS[id];if(!next)return;const newTiles=L.tileLayer(next.url,{maxZoom:next.maxZoom,attribution:next.attribution});newTiles.addTo(map);map.removeLayer(tiles);tiles=newTiles;};
 return {map,switchLayer};
}
function closeOverlay(){if(!overlay)return;overlay.row.map.remove();overlay.element.remove();overlay=null;}
function openOverlay(element,L){
 closeOverlay();let geometry;try{geometry=JSON.parse(element.dataset.communityMap);}catch{return;}
 const panel=document.createElement('section');panel.className='community-map-fullscreen';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Carte de la publication en grand écran');
 const toolbar=document.createElement('div');toolbar.className='community-map-fullscreen-toolbar';
 const close=document.createElement('button');close.type='button';close.textContent='✕ Fermer la carte';close.addEventListener('click',closeOverlay);
 const layer=document.createElement('button');layer.type='button';layer.textContent='Fond : satellite';
 let aerial=true;layer.addEventListener('click',()=>{aerial=!aerial;overlay?.row.switchLayer(aerial?'aerial':'plan');layer.textContent=aerial?'Fond : satellite':'Fond : plan';});
 toolbar.append(close,layer);
 const mapElement=document.createElement('div');mapElement.className='community-map-fullscreen-canvas';
 const stats=document.createElement('div');stats.className='community-map-fullscreen-stats';
 const attachment=element.closest('.community-attachment');
 const fields=[...attachment?.querySelectorAll('.community-attachment-copy span')||[]].filter(el=>/Distance|Âge de piste|Durée|Temps|Délai/i.test(el.textContent||''));
 for(const field of fields){const item=document.createElement('span');item.textContent=field.textContent;stats.append(item);}
 const corridor=document.createElement('span');corridor.textContent='Couloir olfactif : indisponible dans les données partagées';stats.append(corridor);
 panel.append(mapElement,toolbar,stats);document.body.append(panel);
 overlay={element:panel,row:paint(mapElement,L,geometry,{fullscreen:true})};
 requestAnimationFrame(()=>overlay?.row.map.invalidateSize());
 const key=e=>{if(e.key==='Escape'){closeOverlay();document.removeEventListener('keydown',key);}};document.addEventListener('keydown',key,{once:false});
}
export function mountCommunityMaps(root=globalThis.document,{L=globalThis.L,IntersectionObserver=globalThis.IntersectionObserver}={}){
 for(const [element,row] of mounted)if(!element.isConnected){row.observer?.disconnect();row.map?.remove();mounted.delete(element);}
 for(const element of root.querySelectorAll('[data-community-map]')){
  if(mounted.has(element))continue;const row={};mounted.set(element,row);
  const mount=()=>{if(!element.isConnected||row.map)return;let geometry;try{geometry=JSON.parse(element.dataset.communityMap);}catch{return;}if(!L){element.textContent='Carte indisponible. Réessayez après actualisation.';return;}
   row.map=paint(element,L,geometry).map;row.map.invalidateSize();};
  const button=document.createElement('button');button.type='button';button.className='community-map-expand';button.textContent='⛶ Agrandir la carte';button.addEventListener('click',()=>openOverlay(element,L));
  element.parentElement?.insertBefore(button,element.nextSibling);
  if(IntersectionObserver){row.observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){row.observer.disconnect();mount();}},{rootMargin:'200px'});row.observer.observe(element);}else mount();
 }
}
export function disposeCommunityMaps(){closeOverlay();for(const row of mounted.values()){row.observer?.disconnect();row.map?.remove();}mounted.clear();}
