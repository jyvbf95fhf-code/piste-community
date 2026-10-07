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
