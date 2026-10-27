import {cleanCorridorWeather} from './coaching-corridor-model.mjs';
// API estimates captured during a session are historical snapshots, never observations at the collar.
export function historicalWeather(input,{now=Date.now()}={}){
 if(!input||input.source!=='Open-Meteo'||input.provenance!=='estimated'||!Number.isFinite(input.observedAt)||!Number.isFinite(input.fetchedAt)||input.observedAt>now+300000||input.observedAt<now-7200000||input.fetchedAt>now+300000||input.fetchedAt<now-900000)throw Error('Météo absente, ancienne ou non datée.');
 const weather=cleanCorridorWeather(input);
 if(!['temperature_c','humidity_pct','wind_speed_kmh','wind_direction_deg'].some(k=>Number.isFinite(weather[k])))throw Error('Conditions météo absentes.');
 return {...weather,source:'Open-Meteo',provenance:'estimated',capturedAt:now,verification:'participant-transmitted'};
}
export function appendHistoricalWeather(history=[],weather,{kind,actorId,now=Date.now()}={}){
 if(!['pose','search'].includes(kind)||typeof actorId!=='string'||!actorId)throw Error('Contexte météo invalide.');
 const clean=historicalWeather(weather,{now});const rows=history.filter(x=>x.kind!==kind||x.weather.observedAt!==clean.observedAt);
 if(rows.length>=120)return history;
 return [...rows,{kind,actorId,weather:clean}];
}
export function selectHistoricalWeather(history,at){
 if(!Number.isFinite(at))return null;
 return (Array.isArray(history)?history:[]).map(row=>row?.weather).filter(w=>w?.source==='Open-Meteo'&&w.provenance==='estimated'&&Number.isFinite(w.observedAt)&&Number.isFinite(w.capturedAt)&&w.observedAt<=at+300000&&w.observedAt>=at-7200000).sort((a,b)=>Math.abs(a.observedAt-at)-Math.abs(b.observedAt-at))[0]||null;
}
