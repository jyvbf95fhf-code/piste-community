import {test} from 'node:test';import assert from 'node:assert/strict';
import {fixture} from './coaching-exit-fixtures.mjs';
import {simulate} from '../src/coaching-preparation.mjs';
import {debriefView,sessionView} from '../src/coaching-session-flow.mjs';
import {DebriefScreen} from '../src/coaching-debrief-screen.mjs';
import {SessionOverview} from '../src/coaching-session-screen.mjs';
import {createGpsPose,startGpsPose,appendGpsFix,finishGpsPose} from '../src/coaching-gps-model.mjs';
import {mountGpsMaps,destroyGpsMaps} from '../src/coaching-gps-screen.mjs';
function setup(mode='normal',phase='DEBRIEF'){
 const r=fixture({mode,role:'coach',phase});
 const track=(actor,latitude)=>{
  let p=startGpsPose(createGpsPose(r.session.id,actor),1000000);
  p=appendGpsFix(p,{timestamp:1000000,coords:{latitude,longitude:7,accuracy:5}},1000000);
  p=appendGpsFix(p,{timestamp:1005000,coords:{latitude:latitude+.001,longitude:7,accuracy:5}},1005000);
  return finishGpsPose(p,1060000);
 };
 r.tracerState.gpsPose=track(r.session.roles.traceur,48.1);
 r.searchState.gpsSearch=track(r.session.roles.driver,48.2);
 r.searchState.searchActiveDurationMs=45000;r.searchState.searchPausedDuration=15;r.searchState.searchPauseCount=1;
 return r;
}
test('debrief uses measured GPS distances and active search time instead of scenario counters',()=>{
 const r=setup(),v=debriefView(r.searchState,r.preparationState,r.tracerState);
 assert.equal(v.summary.layingSeconds,60);assert.equal(v.summary.searchSeconds,45);assert.equal(v.summary.totalSeconds,105);
 assert.equal(v.summary.layingDistance,r.tracerState.gpsPose.distanceM);assert.equal(v.summary.searchDistance,r.searchState.gpsSearch.distanceM);
 assert.equal(v.summary.layingProvenance,'gps');assert.equal(v.summary.searchProvenance,'gps');assert.equal(v.map.poseUnavailable,false);
});
test('all debrief modes lift geography only after the existing debrief boundary',()=>{
 for(const mode of ['normal','simple_blind','full_blind']){
  const r=setup(mode),html=DebriefScreen(r.searchState,r.preparationState,r.tracerState,{tab:'map'});
  assert.equal((html.match(/class="gps-map" data-gps-map/g)||[]).length,1);assert.match(html,/48\.1/);assert.match(html,/48\.2/);
  assert.doesNotMatch(html,/data-gps-live/);assert.match(html,/data-real-map-reader/);
 }
});
test('summary has actual metrics and no extra map, and mixed provenance never adds GPS to mock time',()=>{
 const r=setup(),html=DebriefScreen(r.searchState,r.preparationState,r.tracerState);
 assert.match(html,/Durée active recherche/);assert.doesNotMatch(html,/data-gps-map|Les distances et compteurs d’action restent des données mock/);
 const v=debriefView(r.searchState,r.preparationState,{...r.tracerState,gpsPose:undefined});
 assert.equal(v.summary.totalSeconds,null);
});
test('live Coach and Observer retain their current masks while permitted metrics use GPS',()=>{
 for(const mode of ['normal','simple_blind','full_blind'])for(const role of ['coach','observer']){
  const r=setup(mode,'SEARCH_RUNNING'),p=simulate(r.preparationState,{viewerRole:role});
  r.searchState.search_started_at=new Date(1000000).toISOString();r.searchState.searchTotalPausedMs=15000;r.searchState.searchPausedAt=null;
  const v=sessionView(r.searchState,p,r.tracerState,{now:1060000});
  if(mode==='full_blind'){assert.equal(v.laying,null);if(role==='coach')assert.equal(v.search,null);}
  else{assert.equal(v.laying.seconds,60);assert.equal(v.laying.distance,r.tracerState.gpsPose.distanceM);assert.equal(v.search.seconds,45);}
  const h=SessionOverview(r.searchState,p,r.tracerState,{observer:role==='observer'});
  if(mode!=='full_blind')assert.doesNotMatch(h,/progression mock/);
 }
});
test('blind pre-debrief never serializes the hidden GPS pose in a report',()=>{
 const r=setup('full_blind','SEARCH_FINISHED'),h=DebriefScreen(r.searchState,r.preparationState,r.tracerState,{tab:'map'});
 assert.doesNotMatch(h,/48\.1|gps-report|data-gps-pose/);
 const v=debriefView(r.searchState,r.preparationState,r.tracerState);assert.equal(v.summary.layingSeconds,null);assert.equal(v.summary.totalSeconds,null);
 const simple=setup('simple_blind','SEARCH_FINISHED'),driver=simulate(simple.preparationState,{viewerRole:'driver'});
 const masked=debriefView(simple.searchState,driver,simple.tracerState);assert.equal(masked.summary.layingDistance,null);assert.equal(masked.summary.totalSeconds,null);
});
test('single debrief map fits both recorded routes, keeps red/cyan and endpoint markers',()=>{
 const r=setup(),v=debriefView(r.searchState,r.preparationState,r.tracerState),lines=[],markers=[];let bounds;
 const root={dataset:{gpsKind:'search'},matches:s=>s==='[data-real-map-reader]',querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 const element={dataset:{gpsPose:JSON.stringify(v.map.gpsSearch),gpsReference:JSON.stringify(v.map.gpsPose)},closest:s=>s==='[data-real-map-reader]'?root:null};
 const layer=()=>({addTo(){return this;},clearLayers(){},on(){}});
 const L={map:()=>({setView(){return this;},fitBounds:p=>bounds=p,remove(){}}),tileLayer:layer,layerGroup:layer,circle:layer,circleMarker:layer,polyline:(p,o)=>({addTo:()=>lines.push(o.color)}),divIcon:x=>x,marker:(p,o)=>({addTo:()=>markers.push(o.title)})};
 try{mountGpsMaps({document:{querySelectorAll:()=>[element]},L});assert.equal(bounds.length,4);assert.deepEqual(lines,['#ff405d','#62c6e5']);assert.deepEqual(markers,['Départ','Arrivée','Départ','Arrivée']);}finally{destroyGpsMaps();}
});
