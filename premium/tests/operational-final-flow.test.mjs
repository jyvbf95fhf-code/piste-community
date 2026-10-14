import {test} from 'node:test';import assert from 'node:assert/strict';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
import {operationalMissionView,operationalReplayView} from '../src/operational-views.mjs';
import {OperationalScreen,OperationalSessionDetailScreen} from '../src/operational-screen.mjs';
import {OperationalReplayScreen} from '../src/operational-replay-screen.mjs';
import {OperationalMap} from '../src/operational-map.mjs';
import {mountGpsMaps,destroyGpsMaps} from '../src/coaching-gps-screen.mjs';
import {createOperationalWeatherController} from '../src/operational-weather.mjs';
function fixture(){
 let now=Date.parse('2026-10-14T10:00:00Z');const start=now,cache=new Map(),storage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)};
 const store=createOperationalMissionStore({ownerId:'u',idFactory:()=> 'ops',storage,clock:()=>now});
 store.createDraft({dog:{id:'d',name:'Ninja'},handler:{id:'u',name:'Moi'},places:{interventionAddress:'67730 Châtenois'}});
 const fix=lon=>({timestamp:now,coords:{latitude:48.29,longitude:lon,accuracy:5}});
 store.enableGps('ops','u');store.startTracking('ops');store.appendGpsPoint('ops',fix(7.39));
 now+=10000;store.appendGpsPoint('ops',fix(7.391));store.addGpsEvent('ops',{type:'Indice',note:'Lisière',position:fix(7.391)});store.pauseTracking('ops');
 now+=10000;store.appendGpsPoint('ops',fix(7.4));store.resumeTracking('ops');
 now+=5000;store.appendGpsPoint('ops',fix(7.392));now+=10000;store.appendGpsPoint('ops',fix(7.393));now+=25000;store.stopTracking('ops');
 return {store,storage,start,clock:()=>now};
}
test('stop, complete, archive and reload preserve real GPS segments, active metrics and events',()=>{
 const f=fixture(),stopped=f.store.get('ops');assert.equal(stopped.status,'À compléter');assert.equal(stopped.trackingElapsedMs,50000);
 assert.equal(stopped.gpsTrack.segments.length,2);assert.equal(stopped.gpsTrack.segments.flat().length,4);
 const html=OperationalScreen({route:{type:'mission',missionId:'ops'},view:operationalMissionView(stopped)});
 assert.match(html,/data-operational-action="complete"/);assert.doesNotMatch(html,/SIMULATION · AUCUN GPS|MISSION OPÉRATIONNELLE · MOCK/);
 f.store.updateDetails('ops',{result:'Personne retrouvée',observations:'Lisière'});f.store.saveEvaluation('ops',{dog:{motivation:4}});
 f.store.complete('ops');f.store.archive('ops');
 const restored=createOperationalMissionStore({ownerId:'u',storage:f.storage,clock:f.clock}).get('ops');
 assert.equal(restored.status,'Archivée');assert.deepEqual(restored.gpsTrack,stopped.gpsTrack);assert.equal(restored.trackingElapsedMs,50000);
 assert.deepEqual(restored.events,stopped.events);assert.equal(restored.details.result,'Personne retrouvée');assert.equal(restored.dogEvaluation.motivation,4);
 assert.throws(()=>f.store.appendGpsPoint('ops',{timestamp:f.clock()}));assert.throws(()=>f.store.updateDetails('ops',{result:'changed'}));
});
test('replay and session summary show actual distance and precise active time',()=>{
 const f=fixture();f.store.complete('ops');const mission=f.store.get('ops');
 const html=OperationalReplayScreen(operationalReplayView(mission));
 assert.match(html,/Distance GPS/);assert.match(html,/00:50/);assert.match(html,/10 s/);assert.match(html,/Lisière/);
 assert.doesNotMatch(html,/data-operational-action=|10 s · simulation/);
 const detail=OperationalSessionDetailScreen(mission);assert.match(detail,/00:50/);assert.match(detail,/data-real-map-reader/);
});
test('recorded reader fits the whole real route and preserves cyan segments, D/A and event position',()=>{
 const f=fixture();f.store.complete('ops');const v=operationalReplayView(f.store.get('ops')),html=OperationalMap(v);
 assert.match(html,/data-real-map-reader/);assert.match(html,/data-gps-kind="search"/);
 let bounds;const paths=[],markers=[],events=[];
 const root={dataset:{gpsKind:'search'},matches:s=>s==='[data-real-map-reader]',querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 const element={dataset:{gpsPose:JSON.stringify(v.gpsTrack),gpsEvents:JSON.stringify(v.events)},closest:s=>s==='[data-real-map-reader]'?root:null};
 const map={setView(){return this;},fitBounds:p=>bounds=p,remove(){},getZoom:()=>17};
 const layer=()=>({addTo(){return this;},on(){},clearLayers(){}});
 const L={map:()=>map,layerGroup:layer,tileLayer:layer,circle:layer,divIcon:x=>x,marker:(p,o)=>({addTo:()=>markers.push({p,o})}),polyline:(p,o)=>({addTo:()=>paths.push({p,o})}),circleMarker:(p,o)=>({addTo:()=>events.push({p,o})})};
 try{mountGpsMaps({document:{querySelectorAll:()=>[element]},L});assert.equal(bounds.length,4);assert.equal(paths.length,2);assert.ok(paths.every(p=>p.o.color==='#62c6e5'));
 assert.deepEqual(markers.map(x=>x.o.title),['Départ','Arrivée']);assert.deepEqual(markers[0].p,[48.29,7.39]);assert.deepEqual(markers[1].p,[48.29,7.393]);
 assert.ok(events.some(x=>x.p[1]===7.391&&x.o.radius===5));
 }finally{destroyGpsMaps();}
});
test('final weather snapshot is available in both consultations without starting services',()=>{
 const f=fixture();const c=()=>({user:{user_id:'u'},route:{type:'mission',missionId:'ops'},mission:f.store.get('ops')});
 const weather=createOperationalWeatherController({getContext:c,document:null,storage:f.storage,clock:f.clock});
 weather.correct({temperature_c:18,wind_speed_kmh:12});f.store.complete('ops');
 const snapshot=weather.snapshot(f.store.get('ops'));assert.equal(snapshot.readOnly,true);assert.equal(snapshot.weather.temperature_c,18);
 const html=OperationalReplayScreen(operationalReplayView(f.store.get('ops')),{weather:snapshot});
 assert.match(html,/Correction manuelle/);assert.doesNotMatch(html,/data-ops-weather-auto|data-ops-weather-form/);
 const other=createOperationalWeatherController({getContext:()=>({user:{user_id:'other'}}),document:null,storage:f.storage});
 assert.equal(other.snapshot(f.store.get('ops')).weather,null);
});
