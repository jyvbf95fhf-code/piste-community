import {GPS_BASE_LAYERS} from './coaching-gps-screen.mjs';
import {endpointBadge} from './route-endpoint-markers.mjs';
let mounted=null;
export function disposeTrackEditorMap(){if(mounted){mounted.disposed=true;mounted.observer?.disconnect();mounted.map.remove();mounted=null;}}
export function mountTrackEditorMap({document=globalThis.document,L=globalThis.L,draft,onAdd=()=>{},onMove=()=>{},onSelect=()=>{},onView=()=>{},ResizeObserver=globalThis.ResizeObserver}={}){
 disposeTrackEditorMap();const element=document?.querySelector('[data-editor-real-map]');if(!element)return;
 let route=draft;const readOnly=element.dataset.readonly==='true';if(readOnly){try{route=JSON.parse(element.dataset.route);}catch{return;}}
 if(!L){element.textContent='Carte indisponible. Le brouillon reste conservé.';return;}
 const points=route?.points||[],view=route?.mapView;const map=L.map(element,{doubleClickZoom:false,zoomControl:!element.closest?.('[data-track-cockpit]')}).setView(view?.center||[46.6,2.5],view?.zoom||6),layers=L.layerGroup().addTo(map),row={map,layers,element,disposed:false};mounted=row;
 const notice=message=>{const status=element.parentElement.querySelector('[data-editor-map-status]');if(status)status.textContent=message;};
 const basemap=route?.basemap==='satellite'?'aerial':'plan';const base=id=>{const def=GPS_BASE_LAYERS[id],tiles=L.tileLayer(def.url,{maxZoom:def.maxZoom,attribution:def.attribution}).addTo(map);row.tiles=tiles;tiles.on('tileerror',()=>{if(row.disposed||row.tiles!==tiles)return;if(id==='aerial'){map.removeLayer(tiles);base('plan');notice('Vue aérienne indisponible · fond Plan affiché.');}else notice('Fond indisponible · vérifiez la connexion. Les points restent conservés.');});};base(basemap);
 if(points.length&&!view)map.fitBounds(points.map(p=>[p.y,p.x]),{padding:[30,30],maxZoom:17});
 let segment=[];const draw=()=>{if(segment.length>1)L.polyline(segment,{color:'#e5c17c',weight:4}).addTo(layers);};
 for(const p of points){if(p.breakBefore){draw();segment=[];}segment.push([p.y,p.x]);}draw();
 for(const [index,p] of points.entries()){
 const label=p.kind==='start'?'D':p.kind==='arrival'?'A':null;
 const html=label?endpointBadge(label):`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="30" height="30"><circle cx="16" cy="16" r="8" fill="#9dd7df" stroke="#102438" stroke-width="2"/></svg>`;
 const marker=L.marker([p.y,p.x],{draggable:!readOnly,icon:L.divIcon({className:'gps-endpoint-marker',html,iconSize:[30,30],iconAnchor:[15,15]}),title:label==='D'?'Départ':label==='A'?'Arrivée':`Étape ${index}`,keyboard:true}).addTo(layers);
 if(!readOnly){marker.on('click',()=>{if(!row.disposed)onSelect(p.id);});marker.on('dragend',()=>{if(row.disposed)return;const pos=marker.getLatLng();onMove(p.id,{x:pos.lng,y:pos.lat});});}
 }
 if(!readOnly)map.on('click',event=>{if(row.disposed||event.originalEvent?.target?.closest?.('.leaflet-marker-icon'))return;onAdd({x:event.latlng.lng,y:event.latlng.lat});});
 map.on('moveend',()=>{if(row.disposed)return;const center=map.getCenter();onView({center:[center.lat,center.lng],zoom:map.getZoom()});});
 if(!readOnly){const center=map.getCenter();onView({center:[center.lat,center.lng],zoom:map.getZoom()});}
 if(ResizeObserver){row.observer=new ResizeObserver(()=>{if(!row.disposed)map.invalidateSize();});row.observer.observe(element);}
}
export function recenterTrackEditorMap(){if(!mounted)return false;const markers=[];mounted.layers.eachLayer(layer=>{if(layer.getLatLng)markers.push(layer.getLatLng());});if(markers.length)mounted.map.fitBounds(markers,{padding:[30,30],maxZoom:17});else mounted.map.setView([46.6,2.5],6);return true;}
export function centerTrackEditorMap(latitude,longitude){if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('Coordonnées de centrage invalides.');if(mounted)mounted.map.setView([latitude,longitude],16);}
