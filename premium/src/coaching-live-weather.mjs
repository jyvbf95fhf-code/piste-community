import {escapeHTML as e} from './components.mjs';
import {createCorridorWeatherService} from './coaching-corridor-weather.mjs';

export function localWeatherPosition(navigator=globalThis.navigator){
 return new Promise((resolve,reject)=>{
  if(!navigator?.geolocation){reject(Error('Localisation indisponible sur ce téléphone.'));return;}
  navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude}),error=>reject(Error(error.code===1?'Autorisez la localisation du téléphone pour consulter la météo locale.':'Position indisponible : réessayez à ciel ouvert.')),{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
 });
}
export function weatherDetails(w){
 const number=(v,unit)=>typeof v==='number'&&Number.isFinite(v)?`${v.toLocaleString('fr-FR',{maximumFractionDigits:1})} ${unit}`:'Indisponible';
 return `<dl class="live-weather-grid">${[['Vent venant de',w.wind_direction_deg,'°'],['Vitesse du vent',w.wind_speed_kmh,'km/h'],['Rafales',w.wind_gusts_kmh,'km/h'],['Température',w.temperature_c,'°C'],['Humidité',w.humidity_pct,'%'],['Pluie',w.precipitation_mm,'mm']].map(([label,v,unit])=>`<div><dt>${label}</dt><dd>${e(number(v,unit))}</dd></div>`).join('')}</dl><p>Météo modélisée · Open-Meteo</p><p>${w.stale?'Donnée ancienne · ':''}Données du ${Number.isFinite(w.observedAt)?e(new Date(w.observedAt).toLocaleString('fr-FR')):'relevé non daté'}.</p>`;
}
// Only this device's location is used. No session, reference, or other member's GPS is read.
let dialog,service,epoch=0,opener;
async function refresh(force=false){
 const ticket=++epoch,content=dialog.querySelector('[data-live-weather-content]'),button=dialog.querySelector('[data-live-weather-refresh]');
 button.disabled=true;content.textContent='Localisation du téléphone et récupération de la météo…';
 try{
  const point=await localWeatherPosition();if(ticket!==epoch||!dialog.open)return;
  service??=createCorridorWeatherService();const weather=await service.get(point,{force,throwOnError:true});
  if(ticket!==epoch||!dialog.open)return;if(!weather)throw Error('Météo indisponible : réessayez.');
  content.innerHTML=weatherDetails(weather);
 }catch(error){if(ticket===epoch&&dialog.open)content.textContent=error.message||'Météo indisponible : réessayez.';}
 finally{if(ticket===epoch&&dialog.open)button.disabled=false;}
}
function openWeather(button){
 opener=button;
 if(!dialog){
  dialog=document.createElement('dialog');dialog.className='live-weather-dialog';dialog.setAttribute('aria-labelledby','live-weather-title');
  dialog.innerHTML='<header><div><span class="eyebrow">COACHING · EN DIRECT</span><h2 id="live-weather-title">Météo locale</h2></div><button type="button" data-live-weather-close aria-label="Fermer la météo">✕</button></header><p>Conditions autour de votre téléphone, indépendantes du tracé et du mode aveugle.</p><div data-live-weather-content role="status" aria-live="polite"></div><button type="button" class="button button-gold" data-live-weather-refresh>Actualiser la météo</button>';
  document.body.append(dialog);
  dialog.querySelector('[data-live-weather-close]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-live-weather-refresh]').addEventListener('click',()=>void refresh(true));
  dialog.addEventListener('close',()=>{epoch++;if(opener?.isConnected)opener.focus();});
 }
 if(!dialog.open)dialog.showModal();void refresh();
}
if(typeof document!=='undefined')document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-live-weather-open]');
 if(!button?.closest('.tracer-gps[data-gps-live]'))return;
 event.preventDefault();openWeather(button);
});
