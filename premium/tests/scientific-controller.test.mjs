import test from 'node:test';
import assert from 'node:assert/strict';
import {createScientificController} from '../src/scientific-controller.mjs';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';

test('controller builds routes from the shared dataset and creates scientific records locally',()=>{
 const dataset=generateJumolfSyntheticDataset(),paths=[],controller=createScientificController({actor:{name:'Sébastien',permissions:{research:true}},dataset,navigate:path=>paths.push(path),clock:()=> '2026-10-07T08:00:00Z'});
 assert.match(controller.screen('/scientific'),/Espace scientifique privé/);
 assert.equal(controller.sessions().length,150);
 const cohort=controller.createCohort({name:'Training',criteria:{kind:'training'}});assert.ok(cohort.id);
 const run=controller.runAnalysis(dataset.sessions[0].id);assert.ok(run.id);assert.equal(controller.snapshot().runs.length,1);
 controller.createHypothesis({title:'À vérifier',criteria:{kind:'training'}});assert.equal(controller.snapshot().hypotheses.length,1);
});
test('controller denies data and mutations to a standard account',()=>{
 const controller=createScientificController({actor:{name:'Camille',permissions:{research:false}},dataset:generateJumolfSyntheticDataset()});
 assert.equal(controller.authorized(),false);assert.equal(controller.sessions().length,0);assert.throws(()=>controller.createCohort({}),/Accès scientifique refusé/);
});

test('evaluation submission appends a local scientific record without changing source sessions',()=>{
 const dataset=generateJumolfSyntheticDataset(),before=structuredClone(dataset.sessions),controller=createScientificController({actor:{name:'Sébastien',permissions:{research:true}},dataset,clock:()=> '2026-10-07T08:00:00Z'});
 const form={dataset:{scientificForm:'evaluation'},closest(){return this;},elements:[]};
 const entries={sessionId:dataset.sessions[0].id,runId:'run-0001',hypothesis:'Hypothèse prudente',rating:'partially_relevant',comment:'À confirmer'};
 const OriginalFormData=globalThis.FormData;globalThis.FormData=class{constructor(){ }entries(){return Object.entries(entries)[Symbol.iterator]();}};
 let prevented=false;try{assert.equal(controller.handleSubmit({target:form,preventDefault(){prevented=true;}}),true);assert.equal(prevented,true);}finally{globalThis.FormData=OriginalFormData;}
 assert.equal(controller.snapshot().evaluations[0].rating,'partially_relevant');assert.deepEqual(dataset.sessions,before);
});

test('anomaly route receives explanatory details linked to their source sessions',()=>{
 const dataset=generateJumolfSyntheticDataset(),controller=createScientificController({actor:{name:'Sébastien',permissions:{research:true}},dataset});
 const html=controller.screen('/scientific/anomalies');assert.match(html,/SIGNAL DÉTECTÉ/);assert.match(html,/Session <a href="\/scientific\/session\//);
});
