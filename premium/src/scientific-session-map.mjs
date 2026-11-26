import {GPS_BASE_LAYERS} from './coaching-gps-screen.mjs';
import {geographicPoint} from './read-only-real-map.mjs';
import {buildGpsCorridor} from './coaching-corridor-model.mjs';

export const scientificMapLayers=[
 ['pose','Tracé posé','#ff405d'],
 ['search','Suivi GPS','#62c6e5'],
 ['corridor','Couloir olfactif estimé','#bca7ef']
];

function recordedSegments(points=[]){
 const segments=[];
 let segment=[];
 for(const raw of points||[]){
  const point=raw?.space==='wgs84'?geographicPoint(raw):null;
  if(!point||raw.breakBefore){
   if(segment.length>=2)segments.push(segment);
   segment=[];
  }
  if(point)segment.push({latitude:point.latitude,longitude:point.longitude,timestamp:typeof raw.timestamp==='number'?raw.timestamp:Date.parse(raw.timestamp||''),accuracy:raw.accuracy});
 }
 if(segment.length>=2)segments.push(segment);
 return segments;
}

export function scientificSessionGeometry(row){
 if(row.source!=='account')return null;
 const pose=recordedSegments(row.referenceTrace),search=recordedSegments(row.trace);
 if(!pose.length&&!search.length)return null;
 const at=pose.at(-1)?.at(-1)?.timestamp;
 const corridor=Number.isFinite(at)&&row.poseWind?buildGpsCorridor({pose:{segments:pose},weather:row.poseWind,now:at+1000,allowed:true}):null;
 const coords=segments=>segments.map(segment=>segment.map(p=>[p.latitude,p.longitude]));
 return {pose:coords(pose),search:coords(search),corridor:(corridor?.features||[]).flatMap(feature=>[feature.outerBoundary,feature.innerBoundary].map(poly=>poly.map(p=>[p.lat,p.lon])))};
}

let mounted;
export function mountScientificMap(document,{ownerId,L=globalThis.L}={}){
 const element=document.querySelector('[data-scientific-map]');
 if(mounted?.element===element)return;
 if(element&&mounted&&mounted.ownerId===ownerId&&element.dataset.scientificMap===mounted.element.dataset.scientificMap){
  element.parentElement.replaceWith(mounted.element.parentElement);
  mounted.map.invalidateSize();
  return;
 }
 mounted?.map.remove();
 mounted=null;
 if(!element)return;
 if(!L){element.textContent='Carte satellite indisponible.';return;}
 const geometry=JSON.parse(element.dataset.scientificMap);
 const map=L.map(element,{scrollWheelZoom:false});
 mounted={element,map,ownerId};
 const layer=GPS_BASE_LAYERS.aerial;
 L.tileLayer(layer.url,{maxZoom:layer.maxZoom,attribution:layer.attribution}).addTo(map);
 for(const [key,,color] of [...scientificMapLayers].reverse()){
  const group=L.layerGroup().addTo(map);
  for(const coords of geometry[key]){
   const shape=key==='corridor'?L.polygon(coords,{color,weight:1,fillOpacity:.18,interactive:false}):L.polyline(coords,{color,weight:4});
   shape.addTo(group);
  }
  element.parentElement.querySelector(`[data-scientific-layer="${key}"]`)?.addEventListener('change',event=>{
   if(event.target.checked)group.addTo(map);
   else map.removeLayer(group);
  });
 }
 map.fitBounds([...geometry.pose.flat(),...geometry.search.flat(),...geometry.corridor.flat()],{padding:[22,22],maxZoom:17});
}
