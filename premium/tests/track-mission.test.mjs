import test from 'node:test';import assert from 'node:assert/strict';
import {createTrackDraft,addTrackPoint} from '../src/track-editor.mjs';
import {createJumolfStore} from '../src/jumolf-store.mjs';
const model=await import('../src/track-mission-model.mjs').catch(()=>({}));
const weather=await import('../src/track-mission-weather.mjs').catch(()=>({}));
const start=Date.parse('2026-10-20T10:00:00Z'),end=start+7200000;
function draft(){let d=createTrackDraft({geographic:true});for(const [x,y] of [[7,48],[7.002,48],[7.002,48.002]])d=addTrackPoint(d,{x,y});return d;}
test('animation access checks read a small detached snapshot without scientific histories',()=>{const store=createJumolfStore({entitlement:'premium'});assert.equal(typeof store.accessSnapshot,'function');store.setConsent('weather',true);const value=store.accessSnapshot();assert.equal(Object.hasOwn(value,'analysis_runs'),false);value.consents.weather=false;assert.equal(store.accessSnapshot().consents.weather,true);store.setConsent('weather',false);assert.equal(store.accessSnapshot().consents.weather,false);});
test('planned itinerary measures current geometry and locates existing pedagogical angles',()=>{
 assert.equal(typeof model.missionRoute,'function');const r=model.missionRoute(draft(),{minAngle:45});assert.ok(r.distanceM>300);assert.equal(r.stations.filter(s=>s.kind==='angle').length,1);assert.deepEqual(model.sampleMissionRoute(r,0).coordinate,[7,48]);assert.deepEqual(model.sampleMissionRoute(r,1).coordinate,[7.002,48.002]);
});
test('route interruptions and pending roads are never joined into a simulated trajectory',()=>{
 assert.equal(typeof model.missionRoute,'function');const d=draft();d.points[2].breakBefore=true;const r=model.missionRoute(d);assert.equal(r.segments.length,1);assert.ok(r.distanceM<200);assert.deepEqual(model.sampleMissionRoute(r,1).coordinate,[7.002,48]);
});
test('timeline computes declared track age without guessing missing or inverted times',()=>{
 assert.equal(typeof model.missionTimeline,'function');assert.equal(model.missionTimeline('',end,.5).valid,false);assert.equal(model.missionTimeline(end,start,.5).valid,false);
 const t=model.missionTimeline(start,end,.5);assert.equal(t.at,start+3600000);assert.equal(t.ageSeconds,3600);assert.equal(t.provenance,'calculated-from-declarations');
});
test('wind illustration has no physical width and never uses current weather as historical coverage',()=>{
 assert.equal(typeof model.missionEnvironment,'function');const unavailable=model.missionEnvironment({at:start,rows:[],current:{observedAt:end,wind_direction_deg:90,wind_speed_kmh:8}});assert.equal(unavailable.weather,null);assert.equal(unavailable.direction,null);
 const rows=[{observedAt:start,wind_direction_deg:350,wind_speed_kmh:8,wind_gusts_kmh:13,temperature_c:14,humidity_pct:70,precipitation_mm:.2,source:'Open-Meteo'}];
 const v=model.missionEnvironment({at:start+1000,rows});assert.equal(v.direction,170);assert.equal(v.basis,'provider-model');assert.equal(Object.hasOwn(v,'widthM'),false);assert.equal(model.missionEnvironment({at:end,rows}).weather,null);
 assert.equal(model.missionEnvironment({at:start,manual:{wind_direction_deg:90,wind_speed_kmh:0}}).direction,null);
});
test('hourly provider service validates units, dates and missing fields without interpolating',async()=>{
 assert.equal(typeof weather.createMissionWeatherService,'function');let calls=0,url;
 const service=weather.createMissionWeatherService({clock:()=>start,fetch:async u=>{calls++;url=new URL(u);return {ok:true,json:async()=>({hourly_units:{wind_speed_10m:'km/h',wind_direction_10m:'°',temperature_2m:'°C',relative_humidity_2m:'%',wind_gusts_10m:'km/h',precipitation:'mm'},hourly:{time:[start/1000,(start+3600000)/1000],wind_speed_10m:[10,null],wind_direction_10m:[90,450],temperature_2m:[15,null]}})};}});
 const rows=await service.getTimeline({latitude:48,longitude:7},{start,end});assert.equal(rows.length,2);assert.equal(rows[0].wind_speed_kmh,10);assert.equal(rows[1].wind_speed_kmh,undefined);assert.equal(rows[1].wind_direction_deg,undefined);assert.equal(url.origin,'https://api.open-meteo.com');assert.equal(url.searchParams.get('timeformat'),'unixtime');assert.ok(url.searchParams.get('start_hour'));await service.getTimeline({latitude:48,longitude:7},{start,end});assert.equal(calls,1);
 await assert.rejects(()=>service.getTimeline({latitude:48,longitude:7},{start:start-86400000*20,end}));assert.equal(calls,1);
});
