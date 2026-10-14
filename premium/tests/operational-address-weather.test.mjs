import {test} from 'node:test';import assert from 'node:assert/strict';
import {createOperationalWeatherController,geocodeIntervention,OperationalWeatherMarkup} from '../src/operational-weather.mjs';
const now=Date.parse('2026-10-14T10:00:00Z');
const location={id:'one',label:'Rue Foch 67730 Châtenois',latitude:48.27,longitude:7.39,score:.96};
const weather={wind_speed_kmh:12,wind_direction_deg:270,temperature_c:18,humidity_pct:65,observedAt:now,fetchedAt:now,source:'Open-Meteo'};
function setup(extra={}){
 let context={user:{user_id:'u'},route:{type:'mission',missionId:'m'},mission:{id:'m',kind:'operational',ownerUserId:'u',status:'Brouillon',places:{interventionAddress:'Rue Foch 67730 Châtenois'}}};
 let geoCalls=0,weatherCalls=0;
 const controller=createOperationalWeatherController({getContext:()=>context,clock:()=>now,document:null,geocode:async()=>{geoCalls++;return [location];},weatherService:{get:async()=>{weatherCalls++;return weather;}},...extra});
 return {controller,setContext:value=>context=value,context:()=>context,counts:()=>[geoCalls,weatherCalls]};
}
test('address weather loads from the geocoded intervention location without inventing GPS',async()=>{
 const f=setup();await f.controller.load();const v=f.controller.view();
 assert.equal(v.state,'available');assert.equal(v.location.label,location.label);assert.equal(v.weather.temperature_c,18);
 assert.deepEqual(f.counts(),[1,1]);assert.equal(f.context().mission.gpsTrack,undefined);
 await f.controller.load();assert.deepEqual(f.counts(),[1,1]);
});
test('missing address never calls services and still permits a manual correction',async()=>{
 const f=setup();f.setContext({...f.context(),mission:{...f.context().mission,places:{}}});
 await f.controller.load();assert.equal(f.controller.view().state,'missing-address');assert.deepEqual(f.counts(),[0,0]);
 f.controller.correct({wind_speed_kmh:'10',wind_direction_deg:'90'});assert.equal(f.controller.view().weather.manual,true);
 assert.throws(()=>f.controller.correct({humidity_pct:101}),/limites/);
});
test('ambiguous place needs an explicit selection before requesting weather',async()=>{
 const f=setup({geocode:async()=>[location,{...location,id:'two',label:'Autre commune',score:.94}]});
 await f.controller.load();assert.equal(f.controller.view().state,'choose-place');assert.equal(f.counts()[1],0);
 await f.controller.select(1);assert.equal(f.controller.view().location.id,'two');assert.equal(f.counts()[1],1);
});
test('an address change or profile switch rejects late weather responses',async()=>{
 let finish;const f=setup({weatherService:{get:()=>new Promise(resolve=>finish=resolve)}});
 const pending=f.controller.load();await new Promise(resolve=>setImmediate(resolve));
 f.setContext({...f.context(),mission:{...f.context().mission,places:{interventionAddress:'Autre adresse'}}});
 f.controller.view();finish(weather);await pending;assert.equal(f.controller.view().weather,null);
 f.setContext({...f.context(),user:{user_id:'other'}});await f.controller.load();assert.equal(f.controller.view().state,'unavailable');
});
test('manual values remain explicit, can return to automatic and do not mutate the mission',async()=>{
 const f=setup();await f.controller.load();const before=JSON.stringify(f.context().mission);
 f.controller.correct({temperature_c:'21'});assert.equal(f.controller.view().weather.source,'Correction manuelle');
 assert.equal(f.controller.view().weather.wind_speed_kmh,12);assert.equal(JSON.stringify(f.context().mission),before);
 await f.controller.automatic();assert.equal(f.controller.view().weather.manual,false);
});
test('network failure stays unavailable without fabricated weather',async()=>{
 const f=setup({geocode:async()=>{throw Error('offline');}});await f.controller.load();
 assert.equal(f.controller.view().state,'unavailable');assert.equal(f.controller.view().weather,null);
 assert.doesNotMatch(OperationalWeatherMarkup(f.controller.view()),/DÉMONSTRATION|valeurs mock/);
});
test('geocoder validates geographic points and sends only the address to the fixed IGN endpoint',async()=>{
 let url,options;
 const out=await geocodeIntervention('Rue Foch 67730 Châtenois',{fetch:async(u,o)=>{url=new URL(u);options=o;return {ok:true,json:async()=>({features:[{geometry:{type:'Point',coordinates:[7.39,48.27]},properties:{id:'one',label:'Châtenois',score:.96}},{geometry:{type:'Point',coordinates:[999,48]},properties:{id:'bad',label:'bad',score:1}}]})};}});
 assert.equal(out.length,1);assert.equal(url.origin,'https://data.geopf.fr');assert.equal(url.searchParams.get('q'),'Rue Foch 67730 Châtenois');
 assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
});
test('manual weather restores only for its owner, mission and unchanged address',async()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 const first=setup({storage});first.controller.correct({temperature_c:21});
 const second=setup({storage});assert.equal(second.controller.view().weather.temperature_c,21);await second.controller.load();assert.deepEqual(second.counts(),[0,0]);
 second.setContext({...second.context(),mission:{...second.context().mission,places:{interventionAddress:'Autre lieu'}}});assert.equal(second.controller.view().weather,null);
 second.setContext({...second.context(),user:{user_id:'other'}});assert.equal(second.controller.view().weather,null);
});
test('finalized missions have read-only weather and reject late automatic responses',async()=>{
 let finish;const f=setup({weatherService:{get:()=>new Promise(resolve=>finish=resolve)}});
 const pending=f.controller.load();await new Promise(resolve=>setImmediate(resolve));
 f.setContext({...f.context(),mission:{...f.context().mission,status:'Terminée'}});f.controller.view();finish(weather);await pending;
 assert.equal(f.controller.view().weather,null);assert.throws(()=>f.controller.correct({temperature_c:20}),/autorisée/);
 assert.doesNotMatch(OperationalWeatherMarkup(f.controller.view()),/data-ops-weather-form|data-ops-weather-auto/);
});
test('actual GPS mission details display the new address weather card and never the demo control',async()=>{
 const {OperationalScreen}=await import('../src/operational-screen.mjs');
 const {createOperationalMissionStore}=await import('../src/operational-missions.mjs');
 const {operationalMissionView}=await import('../src/operational-views.mjs');
 const store=createOperationalMissionStore({ownerId:'u',idFactory:()=> 'm'});store.createDraft({dog:{id:'d',name:'Nox'},handler:{id:'u',name:'Moi'}});store.enableGps('m','u');
 const f=setup();await f.controller.load();
 const html=OperationalScreen({route:{type:'mission',missionId:'m'},view:operationalMissionView(store.get('m')),ui:{showDetails:true,weather:f.controller.view()}});
 assert.match(html,/MÉTÉO DU LIEU/);assert.match(html,/Rue Foch 67730 Châtenois/);
 assert.doesNotMatch(html,/MÉTÉO · DÉMONSTRATION|data-operational-weather-toggle/);
});
