import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './coaching-exit-fixtures.mjs';
import {simulate} from '../src/coaching-preparation.mjs';
import {debriefView} from '../src/coaching-session-flow.mjs';
import {DebriefScreen} from '../src/coaching-debrief-screen.mjs';
function setup(mode='normal',phase='DEBRIEF'){
 const r=fixture({mode,role:'coach',phase});
 r.tracerState.gpsPose={phase:'finished',elapsedMs:60000,distanceM:1234,segments:[]};
 r.searchState.gpsSearch={phase:'finished',elapsedMs:90000,distanceM:2345,segments:[]};
 Object.assign(r.searchState,{searchActiveDurationMs:75000,searchPausedDuration:15,searchPauseCount:1,trackAgeAtSearchStart:120});
 return r;
}
test('science reuses GPS measurements and local time with explicit provenance',()=>{
 const r=setup(),v=debriefView(r.searchState,r.preparationState,r.tracerState);
 assert.equal(v.science.layingDuration.value,60);
 assert.equal(v.science.layingDuration.status,'GPS réel');
 assert.equal(v.science.search.duration.value,75);
 assert.equal(v.science.search.distance.value,2345);
 assert.equal(v.science.search.provenance,'GPS réel');
 const h=DebriefScreen(r.searchState,r.preparationState,r.tracerState,{tab:'science'});
 assert.match(h,/00:01:15/);assert.match(h,/2,35 km/);assert.match(h,/1,23 km/);
 assert.match(h,/Durée cumulée des pauses/);assert.match(h,/00:00:15/);
 assert.doesNotMatch(h,/16 °C|64 %|5 km\/h|compteur mock|data-gps-map/);
});
test('science never substitutes current or OPS weather for missing session weather',()=>{
 const r=setup(),v=debriefView(r.searchState,r.preparationState,r.tracerState);
 assert.equal(v.science.weather.temperature.value,null);
 assert.equal(v.science.weather.humidity.value,null);
 assert.equal(v.science.weather.wind.value,null);
 assert.equal(v.science.corridor.status,'indisponible');
 assert.match(DebriefScreen(r.searchState,r.preparationState,r.tracerState,{tab:'science'}),/Météo de session indisponible/);
});
test('mixed and scenario sources stay explicit without invented GPS measurements',()=>{
 const r=setup();delete r.tracerState.gpsPose;
 let v=debriefView(r.searchState,r.preparationState,r.tracerState);
 assert.equal(v.science.layingDuration.status,'Démonstration');assert.equal(v.science.search.provenance,'GPS réel');
 delete r.searchState.gpsSearch;v=debriefView(r.searchState,r.preparationState,r.tracerState);
 assert.equal(v.science.search.provenance,'Démonstration');
 assert.equal(v.science.search.distance.value,r.searchState.distance);
});
test('science preserves pose masks before debrief and releases them afterward for all modes',()=>{
 for(const mode of ['normal','simple_blind','full_blind']){
  const r=setup(mode),v=debriefView(r.searchState,r.preparationState,r.tracerState);
  assert.equal(v.science.layingDuration.value,60);
 }
 for(const mode of ['simple_blind','full_blind']){
  const r=setup(mode,'SEARCH_FINISHED'),p=simulate(r.preparationState,{viewerRole:'driver'});
  const v=debriefView(r.searchState,p,r.tracerState);
  assert.equal(v.science.layingDuration.value,null);
  const h=DebriefScreen(r.searchState,p,r.tracerState,{tab:'science'});
  assert.doesNotMatch(h,/1,23 km|00:01:00/);
 }
});
test('missing pose and malformed real measurements render unavailable, never zero or NaN',()=>{
 const r=setup();r.tracerState.gpsPose.distanceM=NaN;r.searchState.gpsSearch.distanceM=null;
 const h=DebriefScreen(r.searchState,r.preparationState,r.tracerState,{tab:'science'});
 assert.doesNotMatch(h,/NaN|0,00 km/);assert.match(h,/Indisponible/);
 const missing=setup();delete missing.tracerState.gpsPose;missing.preparationState.session.layingRecorder=null;missing.tracerState.segments=[];missing.searchState.layingSegments=[];
 const v=debriefView(missing.searchState,missing.preparationState,missing.tracerState);
 assert.equal(v.science.layingDistance.value,null);assert.equal(v.science.layingDuration.value,null);assert.equal(v.science.layingDuration.status,'indisponible');
});
