import test from 'node:test';import assert from 'node:assert/strict';
import {buildJumolfSources} from '../src/jumolf-adapter.mjs';
test('geographic coordinates and GPS gaps survive the existing JUMOLF projection',()=>{
 const row=buildJumolfSources({sessions:[{id:'real',trace:[{space:'wgs84',x:7,y:48,timestamp:1000},{space:'wgs84',x:8,y:49,breakBefore:true,timestamp:2000}],metrics:{distanceM:12,averageLateralOffset:3},trackAge:{seconds:50}}]}).sessions[0];
 assert.equal(row.trace[0].space,'wgs84');assert.equal(row.trace[1].breakBefore,true);assert.equal(row.metrics.averageLateralOffset,3);assert.equal(row.trackAge.seconds,50);
});
const gps={provenance:'device-geolocation',startedAt:1792150000000,endedAt:1792150060000,elapsedMs:60000,distanceM:24,segments:[[{latitude:48,longitude:7,timestamp:1792150000000},{latitude:48.0001,longitude:7,timestamp:1792150001000}],[{latitude:49,longitude:8,timestamp:1792150060000}]]};
const input=()=>({ownerId:'a',localOwnerId:'a',sharedOwnerId:'a',dogs:[{id:'dog-a',name:'Ninja'}],dogIds:{shared:'dog-a'},sharedSessions:[{id:'shared',phase:'ARCHIVED',dog:'Ninja',pose:gps,search:gps,searchActiveMs:30000,events:[{type:'Rupture',at:1792150001000,note:'PRIVATE NOTE'}]},{id:'blind-live',phase:'SEARCHING',pose:gps,search:gps}],operationalMissions:[{id:'ops',ownerUserId:'a',kind:'operational',status:'Terminée',dog:{id:'dog-a',name:'Ninja'},gpsTrack:gps,trackingElapsedMs:60000,person:{identity:'SECRET DOSSIER'},weatherSnapshot:{weather:{temperature_c:12,humidity_pct:70,wind_speed_kmh:8,wind_direction_deg:90,observedAt:1792150000000,provenance:'estimated'}},events:[{type:'Indice',note:'SECRET OBSERVATION'}]},{id:'foreign',ownerUserId:'b',status:'Terminée',gpsTrack:gps}]});
test('account sources use actual shared and OPS GPS, explicit dog links and available modeled weather',async()=>{
 const {buildAccountAnalysisSources}=await import('../src/account-analysis-sources.mjs');const data=input(),before=structuredClone(data),raw=buildAccountAnalysisSources(data),safe=buildJumolfSources(raw);
 assert.deepEqual(data,before);assert.equal(safe.sessions.length,1);assert.equal(safe.operational.length,1);assert.equal(safe.sessions[0].dogId,'dog-a');assert.equal(safe.sessions[0].trace[2].breakBefore,true);assert.equal(safe.sessions[0].metrics.durationSeconds,30);assert.equal(safe.operational[0].metrics.distanceM,24);assert.equal(safe.operational[0].weather.temperature,12);assert.equal(safe.operational[0].weather.provenance,'estimated');assert.equal(safe.operational[0].provenance.trace,'phone_gps');assert.ok(!JSON.stringify(raw).includes('SECRET'));assert.ok(!JSON.stringify(raw).includes('PRIVATE NOTE'));assert.ok(!JSON.stringify(raw).includes('blind-live'));
});
test('account mismatch, logout, unlinked dogs and unavailable fields fail closed',async()=>{
 const {buildAccountAnalysisSources}=await import('../src/account-analysis-sources.mjs');const data=input();assert.deepEqual(buildAccountAnalysisSources({...data,ownerId:null}),{dogs:[],sessions:[],tracks:[],operational:[]});
 const raw=buildAccountAnalysisSources({...data,sharedOwnerId:'b',localOwnerId:'b'});assert.equal(raw.sessions.length,0);
 const unlinked=buildAccountAnalysisSources({...data,dogIds:{}}).sessions[0];assert.equal(unlinked.dogId,null);
 const source=buildJumolfSources(buildAccountAnalysisSources({...data,operationalMissions:[{...data.operationalMissions[0],gpsTrack:null,weatherSnapshot:null}]})).operational[0];assert.equal(source.trace,null);assert.equal(source.weather,null);assert.equal(source.metrics.distanceM,undefined);
});
test('Science consumes only real account records, updates cohorts and runs without invented confidence',async()=>{
 const {buildAccountAnalysisSources,buildAccountScientificDataset}=await import('../src/account-analysis-sources.mjs');const {createScientificController}=await import('../src/scientific-controller.mjs');const {buildScientificLongitudinal}=await import('../src/scientific-longitudinal.mjs');
 const dataset=buildAccountScientificDataset(buildJumolfSources(buildAccountAnalysisSources(input())),'a'),controller=createScientificController({actor:{name:'Sébastien',permissions:{research:true}},dataset});
 assert.equal(controller.sessions().length,2);const cohort=controller.createCohort({name:'OPS',criteria:{kind:'operational'}});assert.equal(controller.compareCohorts(cohort.id,cohort.id).sampleA,1);
 const run=controller.runAnalysis(dataset.sessions[0].id);assert.equal(run.synthetic,false);assert.equal(run.outputs.hypotheses.length,0);assert.equal(run.outputs.global_confidence,null);assert.equal(buildScientificLongitudinal(dataset.sessions).series.length,2);
 for(const route of ['/scientific','/scientific/sessions','/scientific/longitudinal','/scientific/data-quality','/scientific/session/'+encodeURIComponent(dataset.sessions[0].id)]){const html=controller.screen(route);assert.ok(!html.includes('Nox'),route);assert.ok(!html.includes('150 sessions'),route);assert.ok(!html.includes('Données synthétiques / Démonstration'),route);}
});
test('real JUMOLF compares Coaching and OPS metrics, honors consents and does not mix fake learning',async()=>{
 const {buildAccountAnalysisSources}=await import('../src/account-analysis-sources.mjs');const {createJumolfController}=await import('../src/jumolf-controller.mjs');const {createJumolfStore}=await import('../src/jumolf-store.mjs');
 const store=createJumolfStore({entitlement:'premium',currentUserId:'a'});for(const key of ['gps','weather','dog_history','session_comparison','ai_analysis'])store.setConsent(key,true);store.activate();store.completeOnboarding();let data=input();
 const c=createJumolfController({store,getRawSources:()=>buildAccountAnalysisSources(data),demoMode:false});
 const ids=[c.sources().sessions[0].id,c.sources().operational[0].id];const run=c.analyze(ids[1]);assert.equal(run.metrics.traveled_distance_m.value,24);assert.equal(run.metrics.traveled_distance_m.provenance,'calculated');assert.deepEqual(run.hypotheses,[]);
 assert.equal(c.compare(ids).comparison.traveled_distance_m[1].value,24);assert.ok(!c.screen('/jumolf/dashboard').includes('synthetic-nox'));assert.match(c.screen('/jumolf/session/demo-nox-search'),/Session indisponible/);assert.match(c.screen('/jumolf/session/demo-nox-search?demo=1'),/SCÉNARIO|DÉMONSTRATION|fictif/i);
 store.setConsent('gps',false);const hidden=c.sources();assert.equal(hidden.operational[0].trace,null);assert.equal(hidden.operational[0].metrics,null);assert.ok(!c.screen('/jumolf/session/'+encodeURIComponent(ids[1])).includes('24 m'));assert.ok(!c.screen('/jumolf/compare').includes('<strong>24</strong>'));
 data={...data,ownerId:null};assert.equal(c.sources().sessions.length,0);assert.match(c.screen('/jumolf/session/'+encodeURIComponent(ids[1])),/Session indisponible/);
});
