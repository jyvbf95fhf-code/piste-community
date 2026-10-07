const clone=value=>structuredClone(value);
const available=value=>value!==null&&value!==undefined&&value!=='';
function projectPoints(value){
 const points=Array.isArray(value)?value:Array.isArray(value?.points)?value.points:null;
 if(!points?.length)return null;
 return points.map(point=>Object.fromEntries([
  ['sequence',point.sequence],['x',point.x],['y',point.y],['timestamp',point.timestamp||point.at],['distanceM',point.distanceM],['breakBefore',typeof point.breakBefore==='boolean'?point.breakBefore:undefined]
 ].filter(([,field])=>available(field))));
}
function projectSession(record){
 const session=record?.session||record||{}, search=record?.searchState||{};
 const dog=session.dog||record?.dog||null;
 const trace=projectPoints(session.searchTrace||session.trace||record?.searchTrace||search.trace||search.path);
 const referenceTrace=projectPoints(session.referenceTrace||session.reference?.geometry||record?.referenceTrace);
 const weather=session.weather||record?.weather||null;
 return {
  id:String(session.id||record?.id||''),kind:'coaching',title:session.title||session.name||'Session',status:session.status||null,
  dog:dog?{...(available(dog.id)?{id:dog.id}:{}),...(available(dog.name)?{name:dog.name}:{}),...(available(dog.breed)?{breed:dog.breed}:{}),...(available(dog.age)?{age:dog.age}:{})}:null,
  dogId:session.dogId||dog?.id||null,startedAt:session.startedAt||session.started_at||null,finishedAt:session.finishedAt||session.finished_at||null,
  terrain:session.terrain||session.environment||null,weather:weather?{...(available(weather.temperature)?{temperature:weather.temperature}:{}),...(available(weather.humidity)?{humidity:weather.humidity}:{}),...(available(weather.label)?{label:weather.label}:{}),...(available(weather.provenance)?{provenance:weather.provenance}:{})}:null,
  wind:session.wind||weather?.wind||null,trace,referenceTrace,
  events:Array.isArray(session.events)?session.events.map(item=>({type:item.type||item.label||null,timestamp:item.timestamp||item.at||null,...(item.point&&Number.isFinite(item.point.x)&&Number.isFinite(item.point.y)?{point:{x:item.point.x,y:item.point.y}}:{})})):[],
  corridor:session.corridor&&Array.isArray(session.corridor.geometry)?{geometry:projectPoints(session.corridor.geometry),provenance:'estimated'}:null,
  probableZones:projectPoints(session.probableZones),uncertaintyZones:projectPoints(session.uncertaintyZones),
  metrics:session.metrics?{...(available(session.metrics.durationSeconds)?{durationSeconds:session.metrics.durationSeconds}:{}),...(available(session.metrics.distanceM)?{distanceM:session.metrics.distanceM}:{})}:null,
  provenance:{...clone(session.provenance||record?.provenance||{})}
 };
}
function projectTrack(track){
 return {id:String(track.id),kind:'track',title:track.name||'Tracé',dogId:track.dogId||null,terrain:track.environment||track.category||null,trace:projectPoints(track.geometry),referenceTrace:null,weather:null,wind:null,events:[],metrics:track.metrics?clone(track.metrics):null,provenance:{trace:track.provenance||track.source||'manual'}};
}
function projectOperational(mission){
 const age=mission.time?.trackAgeAtStart||mission.time?.trackAgeAtSearchStart||null;
 return {
  id:String(mission.id),kind:'operational',title:'Mission OPS',status:mission.status||null,trackingState:mission.trackingState||null,
  dog:mission.dog?{...(available(mission.dog.id)?{id:mission.dog.id}:{}),...(available(mission.dog.name)?{name:mission.dog.name}:{}),...(available(mission.dog.breed)?{breed:mission.dog.breed}:{})}:null,
  dogId:mission.dogId||mission.dog?.id||null,
  handlerName:mission.handler?.name||null,
  startedAt:mission.trackingStartedAt||mission.startedAt||null,finishedAt:mission.finishedAt||null,
  trackAge:age?{...(available(age.label)?{label:age.label}:{}),...(available(age.seconds)?{seconds:age.seconds}:{}),provenance:'calculated'}:null,
  trace:projectPoints(mission.trace),referenceTrace:projectPoints(mission.referenceTrace),
  events:Array.isArray(mission.events)?mission.events.filter(item=>item?.shareable===true).map(item=>({...Object.fromEntries([['type',item.type||item.label],['timestamp',item.timestamp||item.at]].filter(([,value])=>available(value))),...(item.point&&Number.isFinite(item.point.x)&&Number.isFinite(item.point.y)?{point:{x:item.point.x,y:item.point.y}}:{})})):[],
  weather:mission.weatherDemo?{label:mission.weatherDemo.label||'Démonstration · non mesuré',provenance:'estimated'}:null,
  wind:null,terrain:mission.context?.environment||mission.context?.terrain||null,
  corridor:mission.olfactoryCorridorEnabled===true?{status:'enabled',provenance:'estimated'}:null,
  metrics:{...(Number.isFinite(mission.trackingElapsedMs)?{durationSeconds:mission.trackingElapsedMs/1000}:{}),...(Number.isFinite(mission.distanceM)?{distanceM:mission.distanceM}:{})},
  provenance:{trace:mission.provenance?.trace||'manual',trackAge:age?'calculated':null}
 };
}

export function buildJumolfSources({dogs=[],sessions=[],tracks=[],operational=[]}={}){
 const safeDogs=clone(dogs).map(dog=>({id:String(dog.id),name:dog.name||null,breed:dog.breed||null,age:dog.age||null,specialty:dog.specialty||null,disciplines:Array.isArray(dog.disciplines)?[...dog.disciplines]:[]}));
 return {dogs:safeDogs,sessions:clone(sessions).map(projectSession).filter(row=>row.id),tracks:clone(tracks).map(projectTrack).filter(row=>row.id),operational:clone(operational).map(projectOperational).filter(row=>row.id)};
}
