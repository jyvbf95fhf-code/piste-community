import {segmentCoordinates,routeForSegment} from './track-route-segments.mjs';
import {GPS_BASE_LAYERS} from './coaching-gps-screen.mjs';
import {endpointBadge} from './route-endpoint-markers.mjs';
let mounted=null;
export function disposeTrackEditorMap(){if(mounted){mounted.disposed=true;mounted.observer?.disconnect();mounted.map.remove();mounted=null;}}
export function mountTrackEditorMap({document=globalThis.document,L=globalThis.L,draft,mission=false,previewReadOnly=false,selectedPointId=null,onAdd=()=>{},onMove=()=>{},onSelect=()=>{},onView=()=>{},ResizeObserver=globalThis.ResizeObserver}={}){
 disposeTrackEditorMap();const element=document?.querySelector('[data-editor-real-map]');if(!element)return;
 let route=draft;const storedReadOnly=element.dataset.readonly==='true',readOnly=storedReadOnly||previewReadOnly;if(storedReadOnly){try{route=JSON.parse(element.dataset.route);}catch{return;}}
 if(!L){element.textContent='Carte indisponible. Le brouillon reste conservé.';return;}
 const points=route?.points||[],view=route?.mapView;const map=L.map(element,{doubleClickZoom:false,zoomControl:!element.closest?.('[data-track-cockpit]')}).setView(view?.center||[46.6,2.5],view?.zoom||6),layers=L.layerGroup().addTo(map),row={map,layers,L,element,disposed:false};mounted=row;
 const notice=message=>{const status=element.parentElement.querySelector('[data-editor-map-status]');if(status)status.textContent=message;};
 const basemap=route?.basemap==='satellite'?'aerial':'plan';const base=id=>{const def=GPS_BASE_LAYERS[id],tiles=L.tileLayer(def.url,{maxZoom:def.maxZoom,attribution:def.attribution}).addTo(map);row.tiles=tiles;tiles.on('tileerror',()=>{if(row.disposed||row.tiles!==tiles)return;if(id==='aerial'){map.removeLayer(tiles);base('plan');notice('Vue aérienne indisponible · fond Plan affiché.');}else notice('Fond indisponible · vérifiez la connexion. Les points restent conservés.');});};base(basemap);
 if(points.length&&!view)map.fitBounds(points.map(p=>[p.y,p.x]),{padding:[30,30],maxZoom:17});
 const lineStyle={color:'#63ff70',weight:6,opacity:1,className:'premium-neon-track'};
 const addTrackLine=(coordinates,options={})=>{L.polyline(coordinates,{...lineStyle,...options}).addTo(layers);};
 let free=[];const flushFree=()=>{if(free.length>1)addTrackLine(free);free=[];};
 for(let i=1;i<points.length;i++){
 const a=points[i-1],b=points[i];if(b.breakBefore){flushFree();continue;}
 const coordinates=segmentCoordinates(a,b);if(coordinates.length<2){flushFree();addTrackLine([[a.y,a.x],[b.y,b.x]],{dashArray:'7 7',opacity:0.75,className:'track-pending-route'});continue;}
 const routed=routeForSegment(a,b);
 if(routed){flushFree();addTrackLine(routed.coordinates.map(c=>[c[1],c[0]]));
  for(const pair of [[[a.x,a.y],routed.coordinates[0]],[routed.coordinates.at(-1),[b.x,b.y]]])L.polyline(pair.map(c=>[c[1],c[0]]),{color:'#9dd7df',weight:2,dashArray:'3 5'}).addTo(layers);
 }else{if(!free.length)free.push([a.y,a.x]);free.push([b.y,b.x]);}
 }
 flushFree();
 for(const [index,p] of points.entries()){
 if(points.length>250&&index!==0&&index!==points.length-1&&!p.breakBefore&&!points[index+1]?.breakBefore&&p.id!==selectedPointId)continue;
 const label=p.kind==='start'?'D':p.kind==='arrival'?'A':null;
 const html=label?endpointBadge(label):`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="30" height="30"><circle cx="16" cy="16" r="8" fill="#9dd7df" stroke="#102438" stroke-width="2"/></svg>`;
 const marker=L.marker([p.y,p.x],{draggable:!readOnly,icon:L.divIcon({className:'gps-endpoint-marker',html,iconSize:label?[36,36]:[30,30],iconAnchor:label?[18,18]:[15,15]}),title:label==='D'?'Départ':label==='A'?'Arrivée':`Étape ${index}`,keyboard:true}).addTo(layers);
 if(!readOnly){marker.on('click',()=>{if(!row.disposed)onSelect(p.id);});marker.on('dragend',()=>{if(row.disposed)return;const pos=marker.getLatLng();onMove(p.id,{x:pos.lng,y:pos.lat});});}
 }
 if(!readOnly)map.on('click',event=>{if(row.disposed||event.originalEvent?.target?.closest?.('.leaflet-marker-icon,.mission-poi'))return;onAdd({x:event.latlng.lng,y:event.latlng.lat});});
 map.on('moveend',()=>{if(row.disposed||readOnly)return;const center=map.getCenter();onView({center:[center.lat,center.lng],zoom:map.getZoom()});});
 if(!readOnly){const center=map.getCenter();onView({center:[center.lat,center.lng],zoom:map.getZoom()});}
 if(ResizeObserver){row.observer=new ResizeObserver(()=>{if(!row.disposed)map.invalidateSize();});row.observer.observe(element);}
}
export function recenterTrackEditorMap(){if(!mounted)return false;if(mounted.mission?.preview){mounted.map.fitBounds(mounted.mission.route.segments.flat().map(p=>[p[1],p[0]]),{padding:[65,65],maxZoom:17});return true;}const markers=[];mounted.layers.eachLayer(layer=>{if(layer.getLatLng)markers.push(layer.getLatLng());});if(markers.length)mounted.map.fitBounds(markers,{padding:[30,30],maxZoom:17});else mounted.map.setView([46.6,2.5],6);return true;}
export function centerTrackEditorMap(latitude,longitude){if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('Coordonnées de centrage invalides.');if(mounted)mounted.map.setView([latitude,longitude],16);}

// Presentation overlays on the same editor map. All widths are screen pixels.
export function paintTrackMissionMap({route,environment,corridor=false,sample,preview=false}={}){
 const row=mounted;if(!row||!row.L||!route?.valid)return;const {map,L}=row;
 const xy=p=>[p[1],p[0]];
 if(row.mission?.route!==route){row.mission?.group.remove();const group=L.layerGroup().addTo(map),progress=[];row.mission={route,group,progress,preview,environmentKey:null};
  if(preview){for(const segment of route.segments)L.polyline(segment.map(xy),{color:'#63ff70',weight:5,className:'mission-reference'}).addTo(group);map.fitBounds(route.segments.flat().map(xy),{padding:[65,65],maxZoom:17});}
  for(const s of route.stations){const mark=L.circleMarker(xy(s.coordinate),{radius:s.kind==='angle'?6:5,color:'#15283d',weight:2,fillColor:'#e4d2ab',fillOpacity:1,className:'mission-poi',bubblingMouseEvents:false});mark.bindTooltip(s.label+' · point d’observation prévu, cause olfactive inconnue.');mark.addTo(group);}
  for(const segment of route.segments)progress.push(L.polyline([],{color:'#aaffb0',weight:6,opacity:.95,interactive:false,className:'mission-progress-line'}).addTo(group));
  row.mission.cursor=L.circleMarker(xy(route.segments[0][0]),{radius:7,color:'#e4d2ab',weight:3,fillColor:'#0d2237',fillOpacity:1,interactive:false}).addTo(group);row.mission.cursor.bindTooltip('Repère virtuel du parcours prévu · aucun déplacement réel du chien.');
 }
 const m=row.mission,key=JSON.stringify([corridor,environment?.direction]);
 if(m.environmentKey!==key){m.environmentKey=key;m.environmentLayer?.remove();m.environmentLayer=L.layerGroup().addTo(m.group);
  if(corridor){for(const segment of route.segments)L.polyline(segment.map(xy),{color:'#aaa1ff',weight:36,opacity:.13,lineCap:'round',dashArray:environment?.direction===null?'6 12':null,interactive:false,className:'mission-hypothesis-ribbon premium-smoke-corridor'}).addTo(m.environmentLayer);
   if(Number.isFinite(environment?.direction)){const anchors=route.samples.filter((_,i)=>i%Math.max(1,Math.ceil(route.samples.length/9))===0).slice(0,9);for(const p of anchors){const html=`<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><g transform="rotate(${environment.direction} 16 16)" fill="none" stroke="#d9c9ff" stroke-width="2"><path d="M16 27V5m-7 8 7-8 7 8"/></g></svg>`;L.marker(xy(p.coordinate),{interactive:false,icon:L.divIcon({className:'mission-wind-arrow',html,iconSize:[32,32],iconAnchor:[16,16]})}).addTo(m.environmentLayer);}}
  }
 }
 for(let i=0;i<m.progress.length;i++){const coordinates=route.samples.filter(p=>p.segment===i&&p.distanceM<=sample?.distanceM).map(p=>p.coordinate);if(sample?.coordinate&&sample.segment===i)coordinates.push(sample.coordinate);m.progress[i].setLatLngs(coordinates.map(xy));}
 if(sample?.coordinate)m.cursor.setLatLng(xy(sample.coordinate));
}
