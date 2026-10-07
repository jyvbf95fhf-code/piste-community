const EVENT_TYPES=new Set(['Départ','Rupture','Reprise','Indice','Objet trouvé','Zone particulière','Changement notable','Fin de piste']);
const safePoint=point=>point&&point.space==='mock-map'&&Number.isFinite(Number(point.x))&&Number.isFinite(Number(point.y))?{x:Number(point.x),y:Number(point.y),space:'mock-map'}:null;
const safeState=mission=>mission.status==='En cours'?mission.trackingState==='paused'?'Pause':'En cours':['À compléter','Terminée','Archivée'].includes(mission.status)||mission.trackingState==='stopped'?'Fin de piste':null;

function safeEvents(events,enabled){
 if(!enabled||!Array.isArray(events))return [];
 return events.filter(event=>EVENT_TYPES.has(event?.type)).map(event=>({
  id:String(event.id||''),type:event.type,
  ...(Number.isFinite(event.elapsedMs)&&event.elapsedMs>=0?{elapsedMs:event.elapsedMs}:{}),
  ...(safePoint(event.point)?{point:safePoint(event.point)}:{})
 }));
}

export function projectOpsLiveForObserver(mission,policy={}, {now=Date.now()}={}){
 if(!mission||mission.kind!=='operational'||!mission.id||policy.share_live!==true)return null;
 const options=policy.projectionOptions||{};
 const trace=Array.isArray(mission.trace)?mission.trace.map(point=>({
  ...(Number.isFinite(point?.sequence)?{sequence:point.sequence}:{}),
  ...(safePoint(point)?safePoint(point):{})
 })).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)):[];
 const enabled=true;
 const corridor=enabled&&options.showCorridor===true&&mission.olfactoryCorridorEnabled===true?{enabled:true,label:'Couloir estimé · estimation mock',geometry:'mock-overlay'}:null;
 const elapsed=Number.isFinite(mission.trackingElapsedMs)&&mission.trackingElapsedMs>=0?mission.trackingElapsedMs:null;
 const age=options.showTrackAge===true?String(mission.time?.trackAgeAtStart?.label||'Non renseigné'):'Non renseigné';
 const state=safeState(mission);
 const events=safeEvents(mission.events,options.showEvents===true);
 const id=String(mission.id);
 const map={id,kind:'operational',trackingState:mission.trackingState==='paused'?'paused':mission.trackingState==='stopped'?'stopped':'active',progress:structuredClone(trace),trace:structuredClone(trace),corridor:corridor?{enabled:true,label:corridor.label}:{enabled:false},olfactoryCorridor:corridor?structuredClone(corridor):null,events:structuredClone(events)};
 return {
  sessionId:id,sessionType:'ops',role:'ops_trace_observer',roleLabel:'Observateur de trace OPS',readOnly:true,canAct:false,
  state,
  dogName:enabled&&options.showDog===true?String(mission.dog?.name||'Chien indisponible'):null,
  handlerName:enabled&&options.showHandler===true?String(mission.handler?.name||'Conducteur indisponible'):null,
  trace,events,corridor,
  distance:Number.isFinite(mission.distance)&&mission.distance>=0?mission.distance:null,
  trackingSeconds:elapsed===null?null:Math.floor(elapsed/1000),
  trackAge:age,
  trackAgeSource:options.showTrackAge===true?(['disappearanceAt','lastContactAt'].includes(mission.time?.trackAgeAtStart?.source)?mission.time.trackAgeAtStart.source:null):null,
  map,provenance:'Projection mock · données opérationnelles autorisées uniquement'
 };
}
