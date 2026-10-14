import {escapeHTML as e} from './components.mjs';
import {createCorridorWeatherService} from './coaching-corridor-weather.mjs';
import {applyWeatherCorrection,cleanCorridorWeather,CORRIDOR_WEATHER_FIELDS} from './coaching-corridor-model.mjs';

const labels={wind_direction_deg:'Vent venant de (°)',wind_speed_kmh:'Vent (km/h)',wind_gusts_kmh:'Rafales (km/h)',temperature_c:'Température (°C)',humidity_pct:'Humidité (%)',precipitation_mm:'Pluie (mm)'};
const addressOf=mission=>{
 const address=String(mission?.places?.interventionAddress||'').trim();
 const commune=String(mission?.places?.interventionCommune||'').trim();
 return (address&&commune&&!address.toLocaleLowerCase('fr').includes(commune.toLocaleLowerCase('fr'))?address+', '+commune:address||commune).slice(0,300);
};
export async function geocodeIntervention(address,{fetch:fetcher=globalThis.fetch,signal}={}){
 const q=String(address||'').trim().slice(0,300);if(q.length<3)return [];
 const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,8000);
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 try{
  const url=new URL('https://data.geopf.fr/geocodage/search');
  url.search=new URLSearchParams({q,index:'address',limit:'3'}).toString();
  const response=await fetcher(url.href,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw Error('Localisation indisponible');
  const data=await response.json(),seen=new Set(),out=[];
  for(const f of (Array.isArray(data.features)?data.features:[]).slice(0,3)){
   const [longitude,latitude]=f.geometry?.coordinates||[],p=f.properties||{};
   if(f.geometry?.type!=='Point'||!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180||typeof p.label!=='string'||!Number.isFinite(p.score)||p.score<.45||p.score>1)continue;
   const id=String(p.id||latitude+','+longitude);if(seen.has(id))continue;seen.add(id);
   out.push({id,label:p.label.slice(0,300),latitude,longitude,score:p.score});
  }
  return out.sort((a,b)=>b.score-a.score);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}

export function OperationalWeatherMarkup(v={}){
 const weather=v.weather,notices={'missing-address':'Renseignez une adresse ou une commune dans la fiche mission pour obtenir la météo du lieu.','loading':'Récupération de la météo du lieu…','choose-place':'Plusieurs lieux correspondent. Choisissez le lieu d’intervention.','unavailable':'Météo automatique indisponible. Précisez le lieu, réessayez ou renseignez les conditions manuellement.','idle':'Météo du lieu en attente.'};
 const time=Number.isFinite(weather?.observedAt)?new Date(weather.observedAt).toLocaleString('fr-FR'):'Heure indisponible';
 return '<h2>Vent et conditions</h2><span class="eyebrow">MÉTÉO DU LIEU</span>'+
  (v.location?'<p class="ops-weather-location">'+e(v.location.label)+'</p>':'')+
  (weather?'<p>'+e(weather.manual?'Correction manuelle':'Météo modélisée · Open-Meteo')+' · '+e(time)+(weather.stale?' · donnée ancienne':'')+'</p><dl class="ops-weather-values">'+Object.entries(labels).map(([key,label])=>'<div><dt>'+e(label)+'</dt><dd>'+e(Number.isFinite(weather[key])?String(weather[key]):'Indisponible')+'</dd></div>').join('')+'</dl>':'<p role="status">'+e(notices[v.state]||notices.unavailable)+'</p>')+
  (v.state==='choose-place'?'<div class="ops-weather-places">'+(v.candidates||[]).map((p,i)=>'<button type="button" data-ops-weather-place="'+i+'">'+e(p.label)+'</button>').join('')+'</div>':'')+
  (v.readOnly?'':'<button type="button" class="button button-dark" data-ops-weather-auto '+(v.state==='loading'?'disabled':'')+'>'+(weather?.manual?'Revenir à la météo automatique':'Actualiser la météo')+'</button><details data-ops-weather-correction><summary>Corriger les conditions météo</summary><form data-ops-weather-form>'+Object.entries(labels).map(([key,label])=>{const [min,max]=CORRIDOR_WEATHER_FIELDS[key];return '<label>'+e(label)+'<input type="number" name="'+key+'" min="'+min+'" max="'+max+'" step="any" inputmode="decimal" value="'+(Number.isFinite(weather?.[key])?weather[key]:'')+'"></label>';}).join('')+'<p>Les champs vides conservent les valeurs disponibles.</p><button class="button button-dark" type="submit">Appliquer les corrections</button></form></details>')+
  '<p class="ops-weather-note">L’adresse est localisée par IGN ; les coordonnées du lieu servent à la météo Open-Meteo. Aucune identité ni position GPS du téléphone n’est transmise par ce bloc.</p>';
}

export function createOperationalWeatherController({getContext,document=globalThis.document,storage=null,clock=Date.now,geocode=geocodeIntervention,weatherService=createCorridorWeatherService({storage}),onError=()=>{}}={}){
 const records=new Map(),bound=new WeakSet();let current=null,ticket=0,request=null;
 const contextKey=c=>c?.user?.user_id&&c.route?.type==='mission'&&c.route.missionId===c.mission?.id&&c.mission?.kind==='operational'&&c.mission.ownerUserId===c.user.user_id?JSON.stringify([c.user.user_id,c.mission.id]):null;
 const storageKey=key=>'piste-v2-ops-place-weather:'+encodeURIComponent(key);
 function sync(){
  const c=getContext(),key=contextKey(c),address=addressOf(c?.mission),signature=JSON.stringify([key,address,['Terminée','Archivée'].includes(c?.mission?.status)]);
  if(current?.signature===signature)return current;
  ticket++;request?.abort();request=null;
  let record=records.get(signature);
  if(!record){record={key,signature,address,state:key?(address?'idle':'missing-address'):'unavailable',weather:null,location:null,candidates:[],attempted:false};
   if(key)try{const saved=JSON.parse(storage?.getItem(storageKey(key))||'null');if(saved?.version===1&&saved.address===address&&Number.isFinite(saved.weather?.observedAt)&&saved.weather.observedAt<=clock()+300000){
    record.weather=cleanCorridorWeather(saved.weather);record.state='available';
    const p=saved.location;if(p&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180&&typeof p.label==='string')record.location={...p,label:p.label.slice(0,300)};
    if(record.weather.manual)record.attempted=true;
   }}catch{}
   records.set(signature,record);if(records.size>32)records.delete(records.keys().next().value);
  }
  current=record;return record;
 }
 const readOnly=()=>['Terminée','Archivée'].includes(getContext()?.mission?.status);
 function view(){const r=sync();return structuredClone({...r,readOnly:readOnly(),weather:r.weather?{...r.weather,stale:r.weather.stale||clock()-r.weather.observedAt>7200000}:null});}
 function save(r){if(r.key&&r.weather)try{storage?.setItem(storageKey(r.key),JSON.stringify({version:1,address:r.address,location:r.location,weather:r.weather}));}catch{}}
 function paint(){
  const panel=document?.querySelector?.('[data-operational-weather]');
  if(!panel||panel.dataset.operationalWeatherMission!==getContext()?.mission?.id)return;
  const opened=panel.querySelector?.('[data-ops-weather-correction]')?.open;
  panel.innerHTML=OperationalWeatherMarkup(view());if(opened){const details=panel.querySelector('[data-ops-weather-correction]');if(details)details.open=true;}
 }
 const alive=(r,n)=>sync()===r&&ticket===n;
 async function fetchWeather(r,n){
  try{const weather=await weatherService.get(r.location);if(!alive(r,n))return;
   r.weather=cleanCorridorWeather(weather);r.state=r.weather?'available':'unavailable';save(r);
  }catch{if(alive(r,n))r.state='unavailable';}
  if(alive(r,n))paint();
 }
 async function load(force=false){
  const r=sync();if(!r.key||readOnly()||(!force&&r.attempted))return;
  if(!r.address){r.state='missing-address';paint();return;}
  if(!force&&r.weather?.manual)return;
  request?.abort();request=new AbortController();const n=++ticket;r.attempted=true;r.state='loading';paint();
  try{const candidates=await geocode(r.address,{signal:request.signal});if(!alive(r,n))return;
   r.candidates=candidates;if(!candidates.length){r.weather=null;r.location=null;r.state='unavailable';paint();return;}
   const first=candidates[0],confident=first.score>=.75&&(candidates.length===1||first.score-candidates[1].score>=.1);
   if(!confident){r.weather=null;r.location=null;r.state='choose-place';paint();return;}
   r.location=first;await fetchWeather(r,n);
  }catch{if(alive(r,n)){r.state='unavailable';paint();}}
 }
 async function select(index){
  const r=sync();if(!r.key||readOnly()||r.state!=='choose-place'||!Number.isInteger(index)||!r.candidates[index])return;
  r.location=r.candidates[index];r.state='loading';paint();await fetchWeather(r,++ticket);
 }
 function correct(patch){
  const r=sync();if(!r.key||readOnly())throw Error('Correction météo non autorisée.');
  const corrected=applyWeatherCorrection(r.weather,patch,clock());if(!corrected.manual)throw Error('Renseignez au moins une condition météo.');
  ticket++;request?.abort();r.weather=corrected;r.state='available';r.attempted=true;save(r);paint();
 }
 async function automatic(){
  const r=sync();if(!r.key||readOnly())return;
  r.weather=null;r.attempted=false;try{storage?.removeItem(storageKey(r.key));}catch{}
  await load(true);
 }
 function mount(){
  const r=sync(),panel=document?.querySelector?.('[data-operational-weather]');
  if(!panel||panel.dataset.operationalWeatherMission!==getContext()?.mission?.id||!r.key)return;
  if(!bound.has(panel)){bound.add(panel);
   panel.addEventListener('click',event=>{const place=event.target.closest('[data-ops-weather-place]');if(place)void select(Number(place.dataset.opsWeatherPlace));else if(event.target.closest('[data-ops-weather-auto]'))void automatic();});
   panel.addEventListener('submit',event=>{if(!event.target.matches('[data-ops-weather-form]'))return;event.preventDefault();try{correct(Object.fromEntries(new FormData(event.target)));}catch(error){onError(error.message);}});
  }
  void load();
 }
 function snapshot(mission){
  const c=getContext(),key=contextKey({user:c?.user,route:{type:'mission',missionId:mission?.id},mission});
  const address=addressOf(mission),empty={state:'unavailable',weather:null,location:null,candidates:[],readOnly:true};
  if(!key)return empty;
  const existing=records.get(JSON.stringify([key,address,false]))||records.get(JSON.stringify([key,address,true]));
  if(existing?.weather)return structuredClone({...empty,state:'available',location:existing.location,weather:existing.weather});
  try{
   const saved=JSON.parse(storage?.getItem(storageKey(key))||'null');
   if(saved?.version===1&&saved.address===address&&Number.isFinite(saved.weather?.observedAt)&&saved.weather.observedAt<=clock()+300000){
    const p=saved.location,location=p&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180&&typeof p.label==='string'?{...p,label:p.label.slice(0,300)}:null;
    return {...empty,state:'available',location,weather:cleanCorridorWeather(saved.weather)};
   }
  }catch{}
  return empty;
 }
 return {view,load,select,correct,automatic,mount,snapshot};
}
