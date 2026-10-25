import {buildGpsCorridor,corridorPoseSegments,applyWeatherCorrection,cleanCorridorWeather,CORRIDOR_WEATHER_FIELDS} from './coaching-corridor-model.mjs';
import {createCorridorWeatherService} from './coaching-corridor-weather.mjs';
let sharedWeather;
function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
function defaultWeather(){return sharedWeather??=createCorridorWeatherService({storage:browserStorage()});}
const labels={hidden:'Couloir masqué dans ce mode aveugle.',off:'Couloir désactivé.', 'age-unavailable':'Heure de disparition ou de dernier contact inconnue · renseignez-la dans Options terrain.', 'pose-unavailable':'Pose GPS autorisée indisponible · au moins deux points horodatés sont nécessaires.', 'weather-unavailable':'Vent indisponible · récupération automatique ou correction manuelle nécessaire.'};
export function createGpsCorridorController({root,map,L,getSource,weatherService=defaultWeather(),automaticAuthorized=false,clock=Date.now,storage=browserStorage(),schedule=setInterval,cancel=clearInterval}={}){
 const sessionId=root?.dataset?.gpsSessionId||getSource()?.sessionId,key='piste-v2-corridor:'+sessionId;
 let enabled=true,manual=null,automatic=null,disposed=false,busy=false,generation=0;
 try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved?.version===1){enabled=saved.enabled!==false;manual=saved.manual?.manual===true?cleanCorridorWeather(saved.manual):null;}}catch{}
 let pane;
 if(map.createPane){pane='gpsCorridor';const p=map.getPane?.(pane)||map.createPane(pane);if(p?.style)p.style.zIndex='390';}
 const layer=L.layerGroup().addTo(map),form=()=>root.querySelector?.('[data-corridor-form]');
 const allowed=()=>root.dataset.gpsCorridorAllowed==='true';
 const historicalReview=()=>root.dataset.gpsCorridorReview==='true';
 const alive=()=>!disposed&&root.isConnected!==false;
 const save=()=>{try{if(sessionId)storage?.setItem(key,JSON.stringify({version:1,enabled,manual}));}catch{}};
 const text=value=>{const target=root.querySelector?.('[data-corridor-status]');if(target)target.textContent=value;};
 function paint(){
  if(!alive())return;
  const referenceAt=root.dataset.gpsCorridorReferenceAt||null,ops=root.dataset.gpsCorridorBasis==='ops-recorded-path',ageMissing=ops&&(!referenceAt||!Number.isFinite(Date.parse(referenceAt))||Date.parse(referenceAt)>clock());
  const result=historicalReview()?{state:'weather-unavailable',features:[],weather:null,confidence:null}:ageMissing&&allowed()&&enabled?{state:'age-unavailable',features:[],weather:null,confidence:null}:buildGpsCorridor({pose:getSource(),weather:manual||automatic,allowed:allowed(),enabled,now:clock(),referenceAt:ops?referenceAt:null});layer.clearLayers();
  if(result.state==='available')for(const feature of result.features){
   for(const [boundary,opacity] of [['outerBoundary',.09],['innerBoundary',.18]])L.polygon(feature[boundary].map(p=>[p.lat,p.lon]),{...(pane?{pane}:{}),color:'#bca7ef',weight:1,opacity:.45,fillColor:'#bca7ef',fillOpacity:opacity,interactive:false}).addTo(layer);
  }
  const toggle=root.querySelector?.('[data-corridor-toggle]');if(toggle){toggle.disabled=!allowed();toggle.setAttribute('aria-pressed',String(enabled&&result.state==='available'));toggle.textContent=enabled?'Masquer le couloir':'Afficher le couloir';}
  const summary=root.querySelector?.('[data-corridor-summary]');if(summary){summary.setAttribute('aria-label',result.state==='available'?'Couloir olfactif estimé · actif':'Couloir olfactif estimé');summary.dataset.active=String(result.state==='available');}
  const current=manual||automatic;
  if(result.state==='available'){
   const confidence={high:'élevée',medium:'moyenne',low:'faible'}[result.confidence];
   const hour=Number.isFinite(current.observedAt)?new Date(current.observedAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'heure inconnue';
   text(`Couloir estimé · confiance ${confidence}. ${current.source==='Correction manuelle'?'Correction manuelle':'Météo modélisée · Open-Meteo'} · ${hour}${result.weather.stale?' · donnée ancienne':''}. Vent venant de ${current.wind_direction_deg}° · ${current.wind_speed_kmh} km/h.${ops?' Calcul autour du trajet GPS du binôme ; trajectoire de la personne recherchée inconnue.':''}`);
  }else text(historicalReview()?'Couloir historique indisponible : aucun relevé de vent daté de la séance n’est archivé. La pose GPS reste consultable.':result.state==='weather-unavailable'&&!automaticAuthorized?'Météo automatique inactive · renseignez les conditions manuellement.':labels[result.state]);
  const f=form();if(f){f.hidden=!allowed();if(!f.contains?.(root.ownerDocument?.activeElement))for(const input of f.querySelectorAll?.('[data-corridor-field]')||[])input.value=current?.[input.name]??'';}
  return result;
 }
 async function update(){
  if(!alive())return;
  paint();const source=getSource(),segments=allowed()?corridorPoseSegments(source,clock()):[];
  if(historicalReview()||!automaticAuthorized||!allowed()||!enabled||manual||!segments.length||busy)return;
  busy=true;const ticket=++generation;if(!automatic)text('Récupération de la météo…');
  try{const weather=await weatherService.get({latitude:segments[0][0].lat,longitude:segments[0][0].lon});if(alive()&&ticket===generation&&allowed()){automatic=weather;paint();}}
  catch{if(alive()&&ticket===generation)paint();}finally{busy=false;}
 }
 function setEnabled(value){if(!allowed())return;enabled=!!value;save();paint();if(enabled)void update();}
 function correct(patch){if(historicalReview()||!alive()||!allowed())throw Error('Correction non autorisée dans cette vue.');manual=applyWeatherCorrection(manual||automatic,patch,clock());save();paint();}
 async function useAutomatic(){if(!allowed())return;manual=null;save();paint();await update();}
 const click=event=>{if(event.target.closest?.('[data-corridor-toggle]'))setEnabled(!enabled);else if(event.target.closest?.('[data-corridor-auto]'))void useAutomatic();};
 const submit=event=>{const f=event.target.closest?.('[data-corridor-form]');if(!f)return;event.preventDefault();try{const patch=Object.fromEntries([...f.querySelectorAll('[data-corridor-field]')].map(input=>[input.name,input.value]));correct(patch);}catch(error){text(error.message);}};
 root.addEventListener?.('click',click);root.addEventListener?.('submit',submit);
 const timer=schedule(()=>{void update();},60000);
 return {update,setEnabled,correct,useAutomatic,dispose(){disposed=true;generation++;cancel(timer);layer.clearLayers();layer.remove?.();root.removeEventListener?.('click',click);root.removeEventListener?.('submit',submit);}};
}
