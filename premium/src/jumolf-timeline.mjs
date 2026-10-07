const missing=()=>({value:null,status:'indisponible'});
const value=(v,status='disponible')=>v===null||v===undefined||v===''?missing():({value:structuredClone(v),status});
export function jumolfTimelineAt(source={},requestedIndex=0){
 const points=Array.isArray(source.trace)?source.trace:[];
 if(!points.length)return {index:0,length:0,position:missing(),elapsedSeconds:null,trackAge:missing(),wind:missing(),weather:missing(),event:null,corridor:{value:null,status:source.corridor?'estimé':'indisponible'},observation:missing()};
 const index=Math.max(0,Math.min(points.length-1,Number.isFinite(Number(requestedIndex))?Math.trunc(Number(requestedIndex)):0));
 const point=points[index],event=(source.events||[]).find(item=>item.timestamp&&item.timestamp===(point.timestamp||point.at))||null;
 const position=Number.isFinite(point.x)&&Number.isFinite(point.y)?{x:point.x,y:point.y,sequence:point.sequence??null,status:'disponible'}:missing();
 const trackAge=point.trackAgeSeconds??source.trackAge?.seconds??null;
 return {
  index,length:points.length,position,
  elapsedSeconds:Number.isFinite(point.elapsedSeconds)?point.elapsedSeconds:null,
  trackAge:value(trackAge,trackAge===null?'indisponible':source.trackAge?.provenance||'calculé'),
  wind:value(point.wind||source.wind,source.wind?.provenance||'indisponible'),
  weather:value(point.weather||source.weather,source.weather?.provenance||'indisponible'),
  event:event?structuredClone(event):null,
  corridor:{value:source.corridor||null,status:source.corridor?'estimé':'indisponible'},
  observation:value(point.observation||null,point.observation?'user_confirmed':'indisponible')
 };
}
