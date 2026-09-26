const MAPLIBRE_VERSION = '4.7.1';
const MAPLIBRE_SCRIPT = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
const MAPLIBRE_STYLE = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
const DEM_TILES = 'https://demotiles.maplibre.org/terrain-tiles/tiles.json';
const DEM_ATTRIBUTION = '<a href="https://earth.jaxa.jp/en/data/policy/">AW3D30 (JAXA)</a>';
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION = '© Esri, Maxar, Earthstar Geographics';

function supportsWebGL(){
  try{const canvas=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(canvas.getContext('webgl')||canvas.getContext('experimental-webgl')))}catch{return false}
}
function loadStyle(){
  if(document.querySelector(`link[data-maplibre-prototype="${MAPLIBRE_VERSION}"]`))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href=MAPLIBRE_STYLE;link.dataset.maplibrePrototype=MAPLIBRE_VERSION;document.head.append(link);
}
function loadScript(){
  if(window.maplibregl)return Promise.resolve(window.maplibregl);
  const existing=document.querySelector(`script[data-maplibre-prototype="${MAPLIBRE_VERSION}"]`);
  if(existing)return new Promise((resolve,reject)=>{existing.addEventListener('load',()=>resolve(window.maplibregl),{once:true});existing.addEventListener('error',()=>reject(new Error('MapLibre indisponible')),{once:true})});
  return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=MAPLIBRE_SCRIPT;script.async=true;script.dataset.maplibrePrototype=MAPLIBRE_VERSION;script.onload=()=>window.maplibregl?resolve(window.maplibregl):reject(new Error('MapLibre non chargé'));script.onerror=()=>reject(new Error('MapLibre indisponible'));document.head.append(script)});
}
function pointFeature(point,properties={}){return Number.isFinite(Number(point?.lat))&&Number.isFinite(Number(point?.lon))?{type:'Feature',geometry:{type:'Point',coordinates:[Number(point.lon),Number(point.lat)]},properties}:null}
function lineFeature(points,properties={}){const coordinates=(Array.isArray(points)?points:[]).filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon))).map(p=>[Number(p.lon),Number(p.lat)]);return{type:'Feature',geometry:{type:'LineString',coordinates:coordinates.length>1?coordinates:[]},properties}}
function featureCollection(features){return{type:'FeatureCollection',features:features.filter(Boolean)}}
function styleForPrototype(){return{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors',maxzoom:19},satellite:{type:'raster',tiles:[SATELLITE_TILES],tileSize:256,attribution:SATELLITE_ATTRIBUTION,maxzoom:19},terrainSource:{type:'raster-dem',url:DEM_TILES,tileSize:256,attribution:DEM_ATTRIBUTION}},layers:[{id:'osm',type:'raster',source:'osm',layout:{visibility:'visible'}},{id:'satellite',type:'raster',source:'satellite',layout:{visibility:'none'}}],terrain:{source:'terrainSource',exaggeration:1.15},sky:{}}}

function mapErrorKind(event,{loaded=false}={}){
  const error=event?.error||event||{};
  const message=String(error?.message||error||'MapLibre error');
  const lower=message.toLowerCase();
  const sourceId=String(event?.sourceId||event?.source?.id||'');
  const source=sourceId.toLowerCase();
  const dem=source.includes('terrain')||source.includes('dem')||lower.includes('terrain')||lower.includes('raster-dem')||lower.includes('elevation')||lower.includes('demotiles');
  const tile=Boolean(event?.tile||event?.coord)||lower.includes('tile')||lower.includes('network')||lower.includes('cors')||/\b(4\d\d|5\d\d)\b/.test(lower);
  const webgl=lower.includes('webgl')||lower.includes('context lost')||lower.includes('gpu')||lower.includes('failed to initialize');
  const style=lower.includes('style')&&(!loaded||lower.includes('failed')||lower.includes('parse'));
  const fatal=webgl||(!loaded&&style)||(!loaded&&lower.includes('cannot create'));
  return {kind:fatal?'fatal':dem?'dem':tile?'tile':'nonfatal',fatal,sourceId,message,type:error?.name||event?.type||'MapLibreError',phase:loaded?'runtime':'load'};
}

export async function createReplay3DPrototype({container,dataset,onStatus=()=>{},onReady=()=>{},onError=()=>{},onDiagnostic=()=>{},onBaseLayerChange=()=>{}}={}){
  if(!container)throw new Error('Conteneur 3D absent');
  if(!supportsWebGL()){onStatus('3D indisponible sur cet appareil');return null}
  loadStyle();
  const maplibregl=await loadScript();
  const all=[...(dataset?.tracks?.traceur||[]),...(dataset?.tracks?.driver||[]),...(dataset?.tracks?.planned||[]),...(dataset?.events||[])].filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon)));
  const center=all[0]?[Number(all[0].lon),Number(all[0].lat)]:[7.45,48.3];
  const map=new maplibregl.Map({container,style:styleForPrototype(),center,zoom:13,pitch:62,bearing:0,maxPitch:80,attributionControl:{compact:true},touchZoomRotate:true,dragRotate:true,cooperativeGestures:false});
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}), 'top-right');
  let loaded=false,lastState=null,followMode='free',destroyed=false,terrainDisabled=false,fatalReported=false,baseLayer='classic';
  const diagnostic=info=>{if(destroyed)return;console.warn('[Replay3D]',info);onDiagnostic(info)};
  const disableTerrain=info=>{if(terrainDisabled)return;terrainDisabled=true;try{if(loaded&&typeof map.setTerrain==='function')map.setTerrain(null)}catch(error){diagnostic({kind:'nonfatal',phase:'terrain-disable',message:error.message,type:error.name||'Error',fatal:false})}onStatus('Relief temporairement indisponible');diagnostic({...info,kind:'dem',phase:'terrain',fatal:false})};
  const setData=(id,data)=>{const source=map.getSource(id);if(source)source.setData(data)};
  const applyState=state=>{
    if(destroyed||!state)return;lastState=state;if(!loaded)return;
    for(const actor of ['traceur','driver']){
      const points=dataset?.tracks?.[actor]||[],played=points.filter(p=>Number.isFinite(p.timestamp)&&p.timestamp<=state.currentTime),position=state.positions?.[actor];
      setData(`replay3d-${actor}-played`,lineFeature(played,{actor}));setData(`replay3d-${actor}-cursor`,featureCollection([pointFeature(position,{actor})]));
      if(followMode===actor&&position)map.easeTo({center:[Number(position.lon),Number(position.lat)],duration:240,essential:true});
    }
    const events=(dataset?.events||[]).filter(e=>Number.isFinite(Number(e.lat))&&Number.isFinite(Number(e.lon))).map(e=>pointFeature(e,{type:e.type||'event',active:Number.isFinite(e.timestamp)&&state.currentTime>=e.timestamp&&state.currentTime<=e.timestamp+5000?1:0}));setData('replay3d-events',featureCollection(events));
  };
  const fitAll=()=>{if(all.length>1)map.fitBounds([[Math.min(...all.map(p=>Number(p.lon))),Math.min(...all.map(p=>Number(p.lat)))],[Math.max(...all.map(p=>Number(p.lon))),Math.max(...all.map(p=>Number(p.lat)))]],{padding:45,duration:500})};
  const setBaseLayer=mode=>{const next=mode==='satellite'?'satellite':'classic';if(!loaded){baseLayer=next;onBaseLayerChange(baseLayer);return baseLayer}try{map.setLayoutProperty('osm','visibility','none');map.setLayoutProperty('satellite','visibility','none');map.setLayoutProperty(next==='satellite'?'satellite':'osm','visibility','visible');baseLayer=next;onBaseLayerChange(baseLayer);onStatus(next==='satellite'?'Satellite · relief actif':'Classique · relief actif')}catch(error){diagnostic({kind:'tile',sourceId:'satellite',phase:'baselayer',message:error.message,type:error.name||'Error',fatal:false});baseLayer='classic';try{map.setLayoutProperty('satellite','visibility','none');map.setLayoutProperty('osm','visibility','visible')}catch{}onBaseLayerChange(baseLayer)}return baseLayer};
  const onMapError=event=>{if(destroyed)return;const info=mapErrorKind(event,{loaded});diagnostic(info);if(info.sourceId==='satellite'){if(baseLayer==='satellite'&&loaded){try{map.setLayoutProperty('satellite','visibility','none');map.setLayoutProperty('osm','visibility','visible')}catch{}baseLayer='classic';onBaseLayerChange(baseLayer);onStatus('Satellite indisponible · fond classique utilisé')}return}if(info.kind==='dem'){disableTerrain(info);return}if(info.kind==='tile'){onStatus(info.sourceId==='osm'?'Fond raster temporairement indisponible':'Relief temporairement indisponible');return}if(info.fatal&&!fatalReported){fatalReported=true;onError(Object.assign(new Error(info.message),info))}};
  map.on('error',onMapError);
  map.once('load',()=>{if(destroyed)return;loaded=true;if(terrainDisabled)try{map.setTerrain(null)}catch{};setBaseLayer(baseLayer);onStatus(terrainDisabled?'Carte prête · relief indisponible':baseLayer==='satellite'?'Satellite · relief actif':'Carte prête · relief prêt');
    for(const actor of ['traceur','driver']){const points=dataset?.tracks?.[actor]||[];map.addSource(`replay3d-${actor}-full`,{type:'geojson',data:lineFeature(points,{actor})});map.addSource(`replay3d-${actor}-played`,{type:'geojson',data:lineFeature([],{actor})});map.addSource(`replay3d-${actor}-cursor`,{type:'geojson',data:featureCollection([])});map.addLayer({id:`replay3d-${actor}-full-line`,type:'line',source:`replay3d-${actor}-full`,paint:{'line-color':actor==='traceur'?'#58d6a4':'#ff9e54','line-width':4,'line-opacity':.42,'line-blur':.5}});map.addLayer({id:`replay3d-${actor}-played-line`,type:'line',source:`replay3d-${actor}-played`,paint:{'line-color':actor==='traceur'?'#58d6a4':'#ff9e54','line-width':6,'line-opacity':.98}});map.addLayer({id:`replay3d-${actor}-cursor-circle`,type:'circle',source:`replay3d-${actor}-cursor`,paint:{'circle-color':actor==='traceur'?'#58d6a4':'#ff9e54','circle-radius':8,'circle-stroke-color':'#ffffff','circle-stroke-width':2}})}
    map.addSource('replay3d-events',{type:'geojson',data:featureCollection([])});map.addLayer({id:'replay3d-events-circle',type:'circle',source:'replay3d-events',paint:{'circle-color':'#f0c969','circle-radius':6,'circle-opacity':['case',['==',['get','active'],1],1,.45],'circle-stroke-color':'#10242d','circle-stroke-width':2}});
    const reference=dataset?.tracks?.driver?.length?dataset.tracks.driver:dataset?.tracks?.traceur||[];const endpoints=reference.length?[pointFeature(reference[0],{label:'D'}),pointFeature(reference.at(-1),{label:'A'})]:[];map.addSource('replay3d-endpoints',{type:'geojson',data:featureCollection(endpoints)});map.addLayer({id:'replay3d-endpoints-circle',type:'circle',source:'replay3d-endpoints',paint:{'circle-color':'#10242d','circle-radius':9,'circle-stroke-color':['match',['get','label'],'D','#58d6a4','#ff9e54'],'circle-stroke-width':3}});map.addLayer({id:'replay3d-endpoints-label',type:'symbol',source:'replay3d-endpoints',layout:{'text-field':['get','label'],'text-size':11,'text-font':['Open Sans Bold'],'text-allow-overlap':true},paint:{'text-color':'#ffffff'}});fitAll();applyState(lastState);onReady({map,fitAll,setFollowMode:mode=>{followMode=['free','traceur','driver'].includes(mode)?mode:'free'},getFollowMode:()=>followMode})
  });
  return {map,update:applyState,fitAll,setBaseLayer,getBaseLayer:()=>baseLayer,setFollowMode:mode=>{followMode=['free','traceur','driver'].includes(mode)?mode:'free'},getFollowMode:()=>followMode,destroy(){destroyed=true;map.off('error',onMapError);map.remove()}};
}
export {MAPLIBRE_VERSION,MAPLIBRE_SCRIPT,DEM_TILES,DEM_ATTRIBUTION,SATELLITE_TILES,SATELLITE_ATTRIBUTION,supportsWebGL,mapErrorKind};
