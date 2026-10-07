import test from 'node:test';
import assert from 'node:assert/strict';
import {createJumolfController} from '../src/jumolf-controller.mjs';
import {createJumolfStore} from '../src/jumolf-store.mjs';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';

function controllerWithDemoAccess(){
 const store=createJumolfStore({entitlement:'premium'});store.activate();store.completeOnboarding();
 for(const consent of ['gps','weather','dog_history','ai_analysis','session_comparison'])store.setConsent(consent,true);
 return {store,controller:createJumolfController({store})};
}

test('dataset dashboard is explicitly synthetic and separates its 100 training and 50 operational sessions',()=>{
 const {controller}=controllerWithDemoAccess(),dashboard=controller.screen('/jumolf/dashboard'),html=controller.screen('/jumolf/dataset');
 assert.match(dashboard,/Dataset de démonstration — 150 sessions/);
 assert.match(dashboard,/href="\/jumolf\/dataset"/);
 for(const copy of ['MODE DÉMONSTRATION','150 sessions','100 entraînements','50 opérationnelles','Données entièrement synthétiques','Filtres'])assert.ok(html.includes(copy),`missing ${copy}`);
});

test('synthetic session routes use JUMOLF analysis without adding data to the source store',()=>{
 const {store}=controllerWithDemoAccess(),source=generateJumolfSyntheticDataset().sessions[0],raw={dogs:[{id:'real-dog',name:'Real dog'}],sessions:[{id:'real-session',status:'completed',dog:{id:'real-dog',name:'Real dog'}}],tracks:[],operational:[]},before=structuredClone(raw);
 const controller=createJumolfController({store,getRawSources:()=>raw}),storeBefore=store.snapshot();
 const html=controller.screen(`/jumolf/session/${source.id}`);
 for(const copy of ['Données synthétiques','Analyse JUMOLF','MODE DÉMONSTRATION',source.title,'Estimé'])assert.ok(html.includes(copy),`missing ${copy}`);
 assert.deepEqual(store.snapshot(),storeBefore);
 assert.deepEqual(raw,before);
 assert.deepEqual(controller.sources().sessions.map(item=>item.id),['real-session']);
});

test('Nox profile aggregates the longitudinal synthetic dataset, not the two scenario samples',()=>{
 const {controller}=controllerWithDemoAccess(),html=controller.screen('/jumolf/dog/demo-nox');
 for(const copy of ['Profil basé sur données synthétiques','150 sessions','100 entraînements','50 opérationnelles','Tendances calculées'])assert.ok(html.includes(copy),`missing ${copy}`);
});

test('filters and pagination affect only the isolated synthetic dataset view',()=>{
 const {controller}=controllerWithDemoAccess(),training=controller.screen('/jumolf/dataset?type=training&page=2');
 assert.match(training,/100 résultats/);
 assert.match(training,/Page 2/);
 assert.match(training,/synthetic-nox-/);
 assert.doesNotMatch(training,/Mission OPS/);
});
