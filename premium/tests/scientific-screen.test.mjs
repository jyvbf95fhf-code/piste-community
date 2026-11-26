import test from 'node:test';
import assert from 'node:assert/strict';
import {ScientificScreen} from '../src/scientific-screen.mjs';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';
import {buildScientificDatasetView} from '../src/scientific-dataset.mjs';
import {buildScientificLongitudinal} from '../src/scientific-longitudinal.mjs';

const dataset=generateJumolfSyntheticDataset(),data={view:buildScientificDatasetView(dataset),longitudinal:buildScientificLongitudinal(dataset.sessions),cohorts:[],runs:[],annotations:[],blindRecords:[],evaluations:[],hypotheses:[],errors:[],anomalies:[],benchmarks:[],filterOptions:{environments:[],substrates:[]},filters:{},filtered:dataset.sessions,pageRows:dataset.sessions.slice(0,20),page:1,pageCount:8,blindCandidates:[],comparison:null,runComparison:{metrics:[]}};
test('scientific dashboard, explorer, session detail and advanced collections are distinct views',()=>{
 assert.match(ScientificScreen({route:{type:'dashboard'},data}),/Espace scientifique privé/);
 assert.match(ScientificScreen({route:{type:'dashboard'},data}),/Corpus scientifique · contributions pseudonymisées/);
 assert.match(ScientificScreen({route:{type:'sessions'},data}),/Filtrer les sessions/);
 assert.match(ScientificScreen({route:{type:'session',id:dataset.sessions[0].id},data,session:dataset.sessions[0]}),/Données synthétiques/);
 for(const type of ['cohorts','compare','annotations','benchmarks','blind','runs','data-quality','longitudinal','evaluation','errors','hypotheses'])assert.ok(ScientificScreen({route:{type},data}).length>100,type);
});
test('session detail preserves missing fields and separates measured and estimated map layers',()=>{
 const row=dataset.sessions.find(item=>!item.weather),html=ScientificScreen({route:{type:'session',id:row.id},data,session:row});
 assert.match(html,/Indisponible/);assert.match(html,/Couloir estimé/);assert.match(html,/Trace de référence/);assert.match(html,/Voir la provenance/);
});
test('cohort comparison exposes sample sizes, missing values and distribution spread fields',()=>{
 const html=ScientificScreen({route:{type:'compare'},data:{...data,comparison:{sampleA:12,sampleB:8,qualityA:{mean:80},qualityB:{mean:70},caveat:'Différence observée dans cet échantillon.',metrics:[{label:'Confiance',first:{n:10,missing:2,min:20,q1:40,median:60,q3:75,max:90,mean:58,spread:70},second:{n:7,missing:1,min:30,q1:45,median:65,q3:80,max:95,mean:63,spread:65},difference:5}]}}});
 assert.match(html,/manquants A/);assert.match(html,/Q1 A/);assert.match(html,/Q3 B/);assert.match(html,/Différence observée dans cet échantillon/);
});

test('research dashboard, dossier and filters agree on complete archived Coaching inputs',async()=>{
 const {filterScientificSessions}=await import('../src/scientific-cohorts.mjs');
 const complete={
  ...dataset.sessions[0],source:'account',synthetic:false,
  trace:[{},{}],referenceTrace:[{},{}],trackAge:{seconds:0},
  poseWind:{wind_speed_kmh:0,wind_direction_deg:0}
 };
 const incomplete={...complete,id:'incomplete',poseWind:null};
 const view=buildScientificDatasetView({mode:'account',sessions:[complete,incomplete]});
 const accountData={...data,view};
 assert.match(ScientificScreen({data:accountData}),/Voir 1 séance/);
 assert.deepEqual(filterScientificSessions(view.sessions,{observation:true}).map(row=>row.id),[complete.id]);
 const detail=ScientificScreen({route:{type:'session'},data:accountData,session:incomplete});
 assert.match(detail,/Vent archivé pour la pose<\/dt><dd>Indisponible/);
 const page=ScientificScreen({route:{type:'sessions'},data:{...accountData,pageCount:2},query:{observation:'true'}});
 assert.match(page,/observation=true&amp;page=2/);
});

test('archived weather reaches Science without duplicating pose GPS and builds a map only on request',async()=>{
 const {buildAccountAnalysisSources,buildAccountScientificDataset}=await import('../src/account-analysis-sources.mjs');
 const {buildJumolfSources}=await import('../src/jumolf-adapter.mjs');
 const {filterScientificSessions}=await import('../src/scientific-cohorts.mjs');
 const t=1795509000000;
 const weather={source:'Open-Meteo',provenance:'estimated',observedAt:t,capturedAt:t+10000,wind_speed_kmh:12.9,wind_direction_deg:113};
 const gps=(from,lat)=>({provenance:'device-geolocation',startedAt:from,endedAt:from+60000,segments:[[
  {latitude:lat,longitude:1.2,timestamp:from},{latitude:lat+.001,longitude:1.201,timestamp:from+60000}
 ]]});
 const raw=buildAccountAnalysisSources({ownerId:'account',sharedOwnerId:'account',sharedSessions:[{
  id:'vol-fixture',phase:'ARCHIVED',mode:'normal',role:'observer',dog:'Volverine',
  pose:gps(t+10000,48.1),search:gps(t+22000000,48.1001),weatherHistory:[{kind:'pose',weather}]
 }]});
 assert.equal(buildJumolfSources(raw).sessions[0].poseWind,undefined);
 const sources=buildJumolfSources(raw,{forScience:true});
 assert.equal(sources.sessions[0].communityCorridorPose,undefined);
 const view=buildScientificDatasetView(buildAccountScientificDataset(sources,'account'));
 const [session]=view.sessions;
 assert.equal(session.poseWind.wind_direction_deg,113);
 assert.equal(filterScientificSessions(view.sessions,{input:'wind',availability:'present'}).length,1);
 assert.equal(filterScientificSessions(view.sessions,{input:'wind',availability:'missing'}).length,0);
 const input={route:{type:'session'},data:{...data,view},session};
 assert.doesNotMatch(ScientificScreen(input),/data-scientific-map/);
 const opened=ScientificScreen({...input,query:{map:'1'}});
 assert.match(opened,/data-scientific-map/);
 assert.equal((opened.match(/data-scientific-layer=/g)||[]).length,3);
 assert.match(opened,/12\.9 km\/h · venant de 113°/);
});

test('statistics use every filtered session and preserve filters on tabs, axes and comparison',()=>{
 const filtered=Array.from({length:23},(_,index)=>({
  id:'row-'+index,title:'Séance '+index,kind:'training',trackAge:{seconds:12000+index},durationMinutes:index,
  weather:{windSpeedKmh:5,windDirection:'face'}
 }));
 const query={kind:'training',environment:'Forêt',view:'statistics',page:'2'};
 const html=ScientificScreen({route:{type:'sessions'},data:{...data,filtered,pageRows:filtered.slice(20),filters:{kind:'training',environment:'Forêt'}},query});
 assert.match(html,/23 séances avec les deux mesures/);
 assert.match(html,/href="\/scientific\/session\/row-0"/);
 assert.match(html,/href="\/scientific\/session\/row-22"/);
 assert.match(html,/name="environment" value="Forêt"/);
 assert.match(html,/\/scientific\/compare\?kind=training&amp;environment=For%C3%AAt&amp;terrain=For%C3%AAt/);
 assert.doesNotMatch(html,/data-scientific-map|20 par page/);
});
