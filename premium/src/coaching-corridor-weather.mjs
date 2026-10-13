import {cleanCorridorWeather} from './coaching-corridor-model.mjs';
const TTL=600000,PREFIX='piste-v2-weather-grid:';
const fields={wind_speed_kmh:'wind_speed_10m',wind_direction_deg:'wind_direction_10m',wind_gusts_kmh:'wind_gusts_10m',temperature_c:'temperature_2m',humidity_pct:'relative_humidity_2m',precipitation_mm:'precipitation'};
export function createCorridorWeatherService({fetch:fetcher=globalThis.fetch,clock=Date.now,storage=null}={}){
 const cache=new Map(),pending=new Map(),attempts=new Map();
 return {async get(point){
  if(!Number.isFinite(point?.latitude)||Math.abs(point.latitude)>90||!Number.isFinite(point?.longitude)||Math.abs(point.longitude)>180)return null;
  const lat=point.latitude.toFixed(2),lon=point.longitude.toFixed(2),key=lat+','+lon,now=clock();
  let previous=cache.get(key);if(!previous){try{const raw=JSON.parse(storage?.getItem(PREFIX+key)||'null');if(raw&&Number.isFinite(raw.fetchedAt)&&Number.isFinite(raw.observedAt)&&raw.fetchedAt<=now+300000)previous=cleanCorridorWeather(raw);}catch{}if(previous)cache.set(key,previous);}
  if(previous&&now-previous.fetchedAt<TTL)return {...previous,stale:now-previous.observedAt>7200000};
  if(pending.has(key))return pending.get(key);
  if(attempts.has(key)&&now-attempts.get(key)<TTL)return previous?{...previous,stale:true}:null;
  attempts.set(key,now);
  const work=(async()=>{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
   try{
    const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:lat,longitude:lon,current:Object.values(fields).join(','),wind_speed_unit:'kmh',temperature_unit:'celsius',precipitation_unit:'mm',timeformat:'unixtime',timezone:'UTC'}).toString();
    const response=await fetcher(url.href,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('Météo indisponible');
    const data=await response.json(),current=data.current;
    if(!Number.isFinite(current?.time)||current.time*1000>clock()+300000)throw Error('Météo non datée');
    const out={observedAt:current.time*1000,fetchedAt:clock(),source:'Open-Meteo',provenance:'estimated'};
    for(const [key,field] of Object.entries(fields))if(typeof current[field]==='number'&&Number.isFinite(current[field]))out[key]=current[field];
    const snapshot=cleanCorridorWeather(out);snapshot.stale=clock()-snapshot.observedAt>7200000;
    cache.set(key,snapshot);try{storage?.setItem(PREFIX+key,JSON.stringify(snapshot));}catch{}
    if(cache.size>32){const oldest=cache.keys().next().value;cache.delete(oldest);attempts.delete(oldest);}
    return snapshot;
   }catch{return previous?{...previous,stale:true}:null;}finally{clearTimeout(timeout);pending.delete(key);}
  })();pending.set(key,work);return work;
 }};
}
