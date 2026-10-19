// Read-only demo viewer on PISTE's existing Leaflet and basemap definitions.
// No sensor, GPS state, account API or storage is used here.
import {GPS_BASE_LAYERS} from './coaching-gps-screen.mjs';
import {drawRouteEndpointMarkers} from './route-endpoint-markers.mjs';
import {escapeHTML as e} from './components.mjs';
import {buildRexDemo} from './jumolf-rex-data.mjs';
export const REX_BASE_LAYERS=Object.freeze({...GPS_BASE_LAYERS,satellite:Object.freeze({url:GPS_BASE_LAYERS.aerial.url.replace('ORTHOIMAGERY.ORTHOPHOTOS','ORTHOIMAGERY.ORTHO-SAT.SPOT.2025'),maxZoom:19,maxNativeZoom:17,attribution:'Satellite SPOT 2025 © Airbus DS / CNES / IGN · <a href="https://www.data.gouv.fr/datasets/ortho-sat" target="_blank" rel="noopener noreferrer">Licence ouverte 2.0</a>'})});
export function rexVisibleSessions({mode='single',selected=0,before=true,after=true}={}){return (mode==='single'?[selected]:mode==='before'?[0]:mode==='after'?[3]:[0,3]).filter(i=>mode==='single'?before:i<3?before:after);}
let mounted=null;
const coordinate=p=>[p.y,p.x];
export function mountRexMaps({document=globalThis.document,L=globalThis.L,ResizeObserver=globalThis.ResizeObserver}={}){
 const element=document?.querySelector('[data-rex-map]');
 if(mounted&&mounted.element!==element){mounted.observer?.disconnect();mounted.map.remove();mounted=null;}
 if(!element||mounted)return;
 const root=element.closest('[data-rex-map-root]'),status=root.querySelector('[data-rex-map-status]');
 if(!L){element.textContent='Carte indisponible : le moteur cartographique n’a pas chargé. Les données fictives restent consultables.';return;}
 const d=buildRexDemo(),map=L.map(element,{zoomControl:false,attributionControl:true,scrollWheelZoom:true}).setView(coordinate(d.sessions[0].trace[0]),17),layers=L.layerGroup().addTo(map);
 const row={element,map,root};mounted=row;root.dataset.rexMapReady='true';
 let tiles=null,selected=Math.max(0,Math.min(5,Number(root.dataset.rexSession)||0)),mode=root.dataset.rexCompare==='true'?'both':'single',eventMarkers=new Map(),playback=null;
 const visible=key=>root.querySelector(`[data-rex-layer="${key}"]`)?.checked!==false;
 const fit=()=>map.fitBounds(d.sessions[0].referenceTrace.map(coordinate),{padding:[28,28],maxZoom:17,animate:false});
 const chooseBase=id=>{
  if(!Object.hasOwn(REX_BASE_LAYERS,id))return;
  const def=REX_BASE_LAYERS[id],next=L.tileLayer(def.url,{maxZoom:def.maxZoom,maxNativeZoom:def.maxNativeZoom||def.maxZoom,attribution:def.attribution});
  const old=tiles;tiles=next;root.dataset.rexBase=id;root.querySelector('[data-rex-base]').value=id;next.addTo(map);if(old)map.removeLayer(old);
  let failed=false;status.textContent=id==='satellite'?'Chargement du satellite SPOT 2025…':id==='aerial'?'Chargement des photos aériennes IGN…':'Chargement du plan…';
  next.on('tileload',()=>{if(tiles===next&&!failed)status.textContent=id==='satellite'?'Satellite SPOT 2025 · imagerie authentique IGN.':id==='aerial'?'Photographies aériennes IGN · ce fond n’est pas satellite.':'Plan OpenStreetMap · ce fond n’est pas satellite.';});
  next.on('tileerror',()=>{if(tiles!==next||mounted!==row||failed)return;failed=true;if(id==='satellite'){chooseBase('aerial');status.textContent='Satellite indisponible · photographies aériennes IGN affichées en remplacement.';}else status.textContent='Fond indisponible. Changez de fond ou réessayez ; les traces fictives ne sont pas perdues.';});
 };
 const replay=()=>{
  const slider=root.querySelector('[data-rex-replay]'),active=rexVisibleSessions({mode,selected,before:visible('before'),after:visible('after')});if(!active.includes(selected)){if(playback)layers.removeLayer(playback);playback=null;slider.disabled=true;root.querySelector('[data-rex-replay-status]').textContent='Relecture masquée : aucune trace de recherche visible.';return;}slider.disabled=false;const session=d.sessions[selected];slider.max=String(session.trace.length-1);const index=Math.min(session.trace.length-1,Math.max(0,Number(slider.value)||0)),point=session.trace[index];
  if(playback)layers.removeLayer(playback);
  playback=L.circleMarker(coordinate(point),{radius:7,color:'#fff',fillColor:'#6cd7e5',fillOpacity:1,weight:2}).bindPopup(`Position simulée · séance ${selected+1} · ${e(point.timestamp.slice(11,19))}`).addTo(layers);
  root.querySelector('[data-rex-replay-status]').textContent=`Séance fictive ${selected+1} · point ${index+1}/${session.trace.length} · ${point.timestamp.slice(11,19)}`;
 };
 const draw=()=>{
  layers.clearLayers();eventMarkers=new Map();playback=null;
  if(visible('reference'))L.polyline(d.sessions[0].referenceTrace.map(coordinate),{color:'#efca74',weight:4,opacity:.95,dashArray:'8 5'}).bindPopup('Piste de référence fictive · chemin agricole et embranchement').addTo(layers);
  const indices=rexVisibleSessions({mode,selected,before:visible('before'),after:visible('after')});
  for(const i of indices){const session=d.sessions[i],color=mode==='single'||i<3?'#ff748b':'#64dce8',shown=visible(i<3?'before':mode==='single'?'before':'after');if(shown)L.polyline(session.trace.map(coordinate),{color,weight:4,opacity:.95}).bindPopup(`Recherche GPS simulée · séance ${i+1}`).addTo(layers);
   if(shown&&visible('events'))for(const event of session.events){const marker=L.circleMarker(coordinate(event.point),{radius:6,color:'#102438',fillColor:event.type==='Rupture'?'#ffb56e':'#b7f5bd',fillOpacity:1,weight:2}).bindPopup(`<strong>${e(event.type)} fictive</strong><br>Séance ${i+1} · ${e(event.timestamp.slice(11,19))}<br>${e(event.id)}<br>Aucune cause olfactive établie.`).addTo(layers);eventMarkers.set(event.id,marker);}
  }
  if(visible('endpoints'))drawRouteEndpointMarkers(L,layers,{phase:'finished',segments:[d.sessions[0].referenceTrace.map(p=>({latitude:p.y,longitude:p.x}))]});
  const events=indices.flatMap(i=>visible(i<3?'before':mode==='single'?'before':'after')&&visible('events')?d.sessions[i].events.map(ev=>({...ev,session:i+1})):[]);
  root.querySelector('[data-rex-events-list]').innerHTML=events.length?events.map(ev=>`<button type="button" data-rex-event="${e(ev.id)}">S${ev.session} · ${e(ev.type)} · ${e(ev.timestamp.slice(11,19))} · fictif</button>`).join(''):'<p>Événements masqués par les couches choisies.</p>';
  if(mode!=='single'&&indices.length)selected=indices[0];
  replay();
 };
 root.addEventListener('click',event=>{const action=event.target.closest('[data-rex-map-action]')?.dataset.rexMapAction;if(action==='center')fit();else if(action==='in')map.zoomIn();else if(action==='out')map.zoomOut();const id=event.target.closest('[data-rex-event]')?.dataset.rexEvent;if(id&&eventMarkers.has(id)){eventMarkers.get(id).openPopup();element.scrollIntoView({block:'nearest',behavior:'smooth'});}});
 root.addEventListener('change',event=>{if(event.target.matches('[data-rex-base]'))chooseBase(event.target.value);else if(event.target.matches('[data-rex-mode]')){mode=event.target.value;draw();}else if(event.target.matches('[data-rex-session-picker]')){selected=Math.max(0,Math.min(5,Number(event.target.value)||0));root.querySelector('[data-rex-replay]').value='0';draw();}else if(event.target.matches('[data-rex-layer]'))draw();});
 root.addEventListener('input',event=>{if(event.target.matches('[data-rex-replay]'))replay();});
 if(ResizeObserver){row.observer=new ResizeObserver(()=>map.invalidateSize());row.observer.observe(element);}
 fit();chooseBase('satellite');draw();
}
