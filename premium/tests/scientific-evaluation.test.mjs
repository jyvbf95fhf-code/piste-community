import test from 'node:test';
import assert from 'node:assert/strict';
import {createScientificStore} from '../src/scientific-store.mjs';
import {appendScientificFeedback,classifyScientificError} from '../src/scientific-evaluation.mjs';
import {createResearchHypothesis,cohortCriteriaFromHypothesis} from '../src/scientific-hypotheses.mjs';

test('feedback appends evaluation labels and never changes analysis runs',()=>{
 const store=createScientificStore({actor:{id:'ethologist-demo'},clock:()=> '2026-10-07T10:00:00Z'}),run=store.appendRun({id:'source-run',outputs:{hypotheses:[{title:'Hypothèse'}]}});
 appendScientificFeedback(store,{sessionId:'s1',runId:run.id,hypothesis:'Hypothèse',rating:'partially_relevant',comment:'À confirmer'});
 assert.equal(store.snapshot().runs.length,1);assert.equal(store.snapshot().evaluations[0].rating,'partially_relevant');
 assert.equal(classifyScientificError({type:'confidence_excessive'}).label,'Confiance excessive');
});

test('research hypothesis uses cautious status language and produces cohort filters',()=>{
 const hypothesis=createResearchHypothesis({title:'Carrefour gauche rural',status:'synthetic_confirmed',criteria:{kind:'training',environment:'rural'}});
 assert.equal(hypothesis.status,'Confirmé dans dataset synthétique');assert.match(hypothesis.limitations,/pas une validation scientifique/);
 assert.deepEqual(cohortCriteriaFromHypothesis(hypothesis),{kind:'training',environment:'rural'});
});
