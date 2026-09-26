/**
 * Provider-neutral base-layer contract. Tile URLs stay here so map screens
 * never need to duplicate provider metadata or attribution text.
 */
export const BASE_LAYER_CATALOG=Object.freeze({
  classic:Object.freeze({
    id:'classic',legacyId:'osm',label:'Classique',type:'raster',
    provider:'openstreetmap',tileUrl:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:'© OpenStreetMap contributors',maxZoom:19,
    availability:'enabled',fallbackId:'classic',previewOnly:false,productionAllowed:true
  }),
  topo:Object.freeze({
    id:'topo',legacyId:'topo',label:'Topo',type:'raster',
    provider:'opentopomap',tileUrl:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:'© OpenStreetMap contributors, SRTM | OpenTopoMap',maxZoom:17,
    availability:'enabled',fallbackId:'classic',previewOnly:false,productionAllowed:true
  }),
  satellite:Object.freeze({
    id:'satellite',legacyId:'satellite',label:'Satellite',type:'raster',
    provider:'esri-world-imagery',tileUrl:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',maxZoom:19,
    availability:'declared',fallbackId:'classic',previewOnly:true,productionAllowed:false
  })
});

export function normalizeBaseLayerId(id){
  if(id==='classic')return'osm';
  if(id==='outdoor')return'topo';
  return id||'osm';
}

export function canonicalBaseLayerId(id){
  return normalizeBaseLayerId(id)==='osm'?'classic':normalizeBaseLayerId(id);
}

export function getBaseLayerDefinition(id){
  return BASE_LAYER_CATALOG[canonicalBaseLayerId(id)]||null;
}
