import {cleanCorridorWeather,CORRIDOR_WEATHER_FIELDS} from './coaching-corridor-model.mjs';
export const MISSION_WEATHER_FIELDS={wind_speed_kmh:'wind_speed_10m',wind_direction_deg:'wind_direction_10m',wind_gusts_kmh:'wind_gusts_10m',temperature_c:'temperature_2m',humidity_pct:'relative_humidity_2m',precipitation_mm:'precipitation'};
const units={wind_speed_10m:'km/h',wind_direction_10m:'°',wind_gusts_10m:'km/h',temperature_2m:'°C',relative_humidity_2m:'%',precipitation:'mm'};
export function createMissionWeatherService({fetch:fetcher=globalThis.fetch,clock=Date.now}={}){
 const cache=new Map();
 return {async getTimeline(point,{start,end,signal}={}){
  const now=clock();if(!Number.isFinite(point?.latitude)||Math.abs(point.latitude)>90||!Number.isFinite(point?.longitude)||Math.abs(point.longitude)>180)throw Error('Départ géographique indisponible.');
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start||start<now-5*86400000||end>now+7*86400000)throw Error('Météo horaire indisponible pour cette période : fenêtre limitée à 5 jours passés et 7 jours futurs. Aucun historique n’est inventé.');
  const hour=t=>new Date(Math.floor(t/3600000)*3600000).toISOString().slice(0,16),lat=point.latitude.toFixed(2),lon=point.longitude.toFixed(2),key=JSON.stringify([lat,lon,hour(start),hour(end)]),saved=cache.get(key);
  if(saved&&now-saved.fetchedAt<600000)return structuredClone(saved.rows);
  const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();const timer=setTimeout(cancel,8000);
  try{const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:lat,longitude:lon,hourly:Object.values(MISSION_WEATHER_FIELDS).join(','),start_hour:hour(start),end_hour:hour(end),timezone:'UTC',timeformat:'unixtime',wind_speed_unit:'kmh',temperature_unit:'celsius',precipitation_unit:'mm'});
   const response=await fetcher(url.href,{signal:abort.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('Météo horaire indisponible.');const data=await response.json();if(abort.signal.aborted)throw Error('Météo annulée.');
   const h=data.hourly;if(!Array.isArray(h?.time)||h.time.length>300)throw Error('Série météo incomplète ou trop longue.');
   const rows=[],seen=new Set();for(let i=0;i<h.time.length;i++){const observedAt=h.time[i]*1000;if(typeof h.time[i]!=='number'||!Number.isFinite(observedAt)||observedAt<Math.floor(start/3600000)*3600000||observedAt>end||seen.has(observedAt))continue;seen.add(observedAt);
    const input={observedAt,fetchedAt:now,source:'Open-Meteo'};for(const [k,f] of Object.entries(MISSION_WEATHER_FIELDS)){const [min,max]=CORRIDOR_WEATHER_FIELDS[k],v=h[f]?.[i];if(data.hourly_units?.[f]===units[f]&&typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max)input[k]=v;}
    rows.push({...cleanCorridorWeather(input),basis:'provider-model'});
   }
   rows.sort((a,b)=>a.observedAt-b.observedAt);cache.set(key,{fetchedAt:now,rows});if(cache.size>8)cache.delete(cache.keys().next().value);return structuredClone(rows);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }};
}
