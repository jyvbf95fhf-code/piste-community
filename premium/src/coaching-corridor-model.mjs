import {computeScentCorridor} from './scent-corridor-engine.mjs';
export const CORRIDOR_WEATHER_FIELDS=Object.freeze({wind_speed_kmh:[0,150],wind_direction_deg:[0,360],wind_gusts_kmh:[0,200],temperature_c:[-80,80],humidity_pct:[0,100],precipitation_mm:[0,1000]});
const numeric=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function cleanCorridorWeather(input){
 if(!input||typeof input!=='object')return null;
 const out={};for(const [key,[min,max]] of Object.entries(CORRIDOR_WEATHER_FIELDS))if(numeric(input[key],min,max))out[key]=key==='wind_direction_deg'?input[key]%360:input[key];
 return {...out,source:input.source==='Correction manuelle'?'Correction manuelle':'Open-Meteo',provenance:'estimated',observedAt:input.observedAt,fetchedAt:input.fetchedAt,stale:input.stale===true,manual:input.manual===true};
}
export function applyWeatherCorrection(base,patch,now=Date.now()){
 const corrected=cleanCorridorWeather(base)||{};
 let changed=false;for(const [key,[min,max]] of Object.entries(CORRIDOR_WEATHER_FIELDS)){
  const raw=patch?.[key];if(raw===undefined||raw===null||String(raw).trim()==='')continue;
  const value=Number(raw);if(!numeric(value,min,max))throw Error('Valeur météo hors limites : '+key);
  corrected[key]=key==='wind_direction_deg'?value%360:value;changed=true;
 }
 if(!changed)return corrected;
 return {...corrected,source:'Correction manuelle',manual:true,provenance:'estimated',observedAt:now,fetchedAt:now,stale:false};
}
export function corridorPoseSegments(pose,now=Date.now()){
 return (Array.isArray(pose?.segments)?pose.segments:[]).filter(segment=>Array.isArray(segment)&&segment.length>=2&&segment.every((p,i)=>numeric(p?.latitude,-90,90)&&numeric(p?.longitude,-180,180)&&typeof p.timestamp==='number'&&Number.isFinite(p.timestamp)&&p.timestamp>1e12&&p.timestamp<=now&&(i===0||p.timestamp>segment[i-1].timestamp))).map(segment=>segment.map(p=>({lat:p.latitude,lon:p.longitude,recorded_at:new Date(p.timestamp).toISOString(),...(numeric(p.accuracy,0,10000)?{accuracy_m:p.accuracy}:{})})));
}
export function buildGpsCorridor({pose,weather,now=Date.now(),allowed=false,enabled=true}={}){
 const unavailable=state=>({state,features:[],weather:null,confidence:null});
 if(!allowed)return unavailable('hidden');if(!enabled)return unavailable('off');
 const segments=corridorPoseSegments(pose,now);if(!segments.length)return unavailable('pose-unavailable');
 const clean=cleanCorridorWeather(weather);
 if(!clean||!numeric(clean.wind_speed_kmh,0,150)||!numeric(clean.wind_direction_deg,0,360))return unavailable('weather-unavailable');
 const stale=clean.stale||!Number.isFinite(clean.observedAt)||now-clean.observedAt>7200000||clean.observedAt>now+300000;
 const features=segments.map(track=>computeScentCorridor({track,weather:clean,currentTime:new Date(now).toISOString(),trackStartedAt:track[0].recorded_at})).filter(r=>r.geometry);
 const levels={low:0,medium:1,high:2};const confidence=stale?'low':features.reduce((level,r)=>levels[r.confidence.level]<levels[level]?r.confidence.level:level,'high');
 return {state:features.length?'available':'pose-unavailable',features,weather:{...clean,stale},confidence};
}
