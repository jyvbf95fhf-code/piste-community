const copy=value=>value?structuredClone(value):null;
const hasGeometry=value=>Array.isArray(value)&&value.length>0;
const layer=(geometry,provenance,label,visible=true,available=Boolean(geometry))=>({geometry:copy(geometry),provenance:provenance||'unknown',label,visible:Boolean(visible),available:Boolean(available),status:available?provenance||'disponible':'indisponible'});

export function createJumolfMapProjection(source={},layerState={}){
 const trace=hasGeometry(source.trace)?source.trace:null;
 const reference=hasGeometry(source.referenceTrace)?source.referenceTrace:null;
 const events=Array.isArray(source.events)&&source.events.length?source.events:null;
 const corridorGeometry=source.corridor?.geometry||null;
 const provenance=source.provenance||{};
 return {
  sourceId:source.id||null,
  layers:{
   referenceTrace:layer(reference,provenance.referenceTrace||'unknown','Trace de référence',layerState.referenceTrace!==false,Boolean(reference)),
   trace:layer(trace,provenance.trace||'unknown','Trace source',layerState.trace!==false,Boolean(trace)),
   start:layer(trace?.[0]||null,provenance.trace||'unknown','Départ D',layerState.start!==false,Boolean(trace?.[0])),
   finish:layer(trace?.at(-1)||null,provenance.trace||'unknown','Arrivée / fin',layerState.finish!==false,Boolean(trace?.length>1)),
   events:layer(events,provenance.events||'manual','Événements',layerState.events!==false,Boolean(events)),
   wind:layer(source.wind,provenance.wind||source.wind?.provenance||'unknown','Vent',layerState.wind!==false,Boolean(source.wind)),
   weather:layer(source.weather,provenance.weather||source.weather?.provenance||'unknown','Météo',layerState.weather!==false,Boolean(source.weather)),
   corridor:{...layer(corridorGeometry,'estimated','Couloir olfactif · Estimé',layerState.corridor!==false,Boolean(corridorGeometry)),status:source.corridor?'estimé':'indisponible',label:'Couloir olfactif · Estimé',geometry:copy(corridorGeometry),provenance:'estimated',visualizationOnly:!corridorGeometry},
   probableZones:layer(source.probableZones||null,'ai_generated','Zones probables',layerState.probableZones!==false,Boolean(source.probableZones)),
   uncertaintyZones:layer(source.uncertaintyZones||null,'estimated','Zones d’incertitude',layerState.uncertaintyZones!==false,Boolean(source.uncertaintyZones))
  },
  limitation:'Le couloir et les zones estimées ne constituent pas une mesure. La trace reste une couche distincte.'
 };
}
