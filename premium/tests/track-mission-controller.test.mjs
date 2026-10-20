import test from 'node:test';import assert from 'node:assert/strict';
import {createTrackDraft,addTrackPoint} from '../src/track-editor.mjs';
const api=await import('../src/track-mission-controller.mjs').catch(()=>({}));
const t=Date.parse('2026-10-20T10:00:00Z');
function setup(service){let d=createTrackDraft({geographic:true});for(const [x,y] of [[7,48],[7.002,48],[7.002,48.002]])d=addTrackPoint(d,{x,y});let context={ownerId:'u',key:'route',draft:d,options:{minAngle:45},weatherAllowed:true};assert.equal(typeof api.createMissionController,'function');const c=api.createMissionController({getContext:()=>context,clock:()=>t,weatherService:service||{getTimeline:async()=>[]}});return {c,get context(){return context;},setContext:v=>context=v};}
test('no weather request occurs without declared valid times and consent',async()=>{
 let calls=0;const s=setup({getTimeline:async()=>{calls++;return [];}});await s.c.fetchWeather();assert.equal(calls,0);s.c.setTimes(t,t+3600000);s.setContext({...s.context,weatherAllowed:false});await s.c.fetchWeather();assert.equal(calls,0);assert.equal(s.c.snapshot().environment.weather,null);
});
test('late weather cannot cross account, point, time or consent changes',async()=>{
 for(const change of ['owner','point','time','consent']){let finish;const s=setup({getTimeline:()=>new Promise(r=>finish=r)});s.c.setTimes(t,t+3600000);const pending=s.c.fetchWeather();if(change==='owner')s.setContext({...s.context,ownerId:'other'});if(change==='point'){const d=structuredClone(s.context.draft);d.points[0].x=8;s.setContext({...s.context,draft:d});}if(change==='time')s.c.setTimes(t+3600000,t+7200000);if(change==='consent')s.setContext({...s.context,weatherAllowed:false});s.c.reconcile();finish([{observedAt:t,wind_speed_kmh:8,wind_direction_deg:90}]);await pending;assert.equal(s.c.snapshot().environment.weather,null,change);assert.equal(s.c.snapshot().busy,false);}
});
test('simulation pause resumes planned progress; reduced motion uses explicit steps',()=>{
 const {c}=setup();assert.equal(c.snapshot().timeline.valid,false);c.play();c.advance(3);const p=c.snapshot().progress;assert.ok(p>0);c.pause();c.advance(3);assert.equal(c.snapshot().progress,p);c.play();c.advance(3);assert.ok(c.snapshot().progress>p);c.setReducedMotion(true);assert.equal(c.snapshot().playing,false);const before=c.snapshot().progress;c.play();assert.equal(c.snapshot().playing,false);assert.ok(c.snapshot().progress>before);c.setProgress(1);assert.equal(c.snapshot().sample.distanceM,c.snapshot().route.distanceM);
});
test('manual environment is an explicit constant declaration and clears on access loss',()=>{
 const s=setup();s.c.setManual({wind_speed_kmh:'8',wind_direction_deg:'90'});assert.equal(s.c.snapshot().environment.basis,'declared-constant');assert.equal(s.c.snapshot().environment.direction,270);assert.throws(()=>s.c.setManual({wind_speed_kmh:'-1'}));s.setContext(null);assert.equal(s.c.snapshot().active,false);assert.equal(s.c.snapshot().environment.weather,null);
});
