import test from 'node:test';
import assert from 'node:assert/strict';
import { createScientificCorpusController } from '../src/scientific-corpus-controller.mjs';
import { scientificCorpusAccessFor } from '../src/scientific-access.mjs';

const fixture={summary:()=>({contributorCount:7,dogCount:11,sessionCount:38,training:37,operational:null,synthetic:true}),view:filters=>filters.environment==='rare'?{displayable:false,rows:[],aggregateAtoms:[],summary:null,suppressionReason:'Résultat masqué : groupe trop petit'}:{displayable:true,rows:[],aggregateAtoms:[],summary:{sessionCount:10,dogCount:4,training:10,operational:null,quality:{high:8},caveat:'Différence observée dans cet échantillon'},suppressionReason:null},cohort:criteria=>criteria.environment==='rare'?{displayable:false,summary:null,suppressionReason:'Échantillon insuffisant para afficher ce résultat.'}:{displayable:true,summary:{sessionCount:8,dogCount:4,training:8,operational:0,caveat:'Différence observée dans cet échantillon'}},compare:(a,b)=>a.displayable&&b.displayable?{displayable:true,sampleA:a.summary.sessionCount,sampleB:b.summary.sessionCount,differencesObserved:[{metric:'sessionCount',delta:a.summary.sessionCount-b.summary.sessionCount}],caveat:'Différence observée dans cet échantillon'}:{displayable:false,caveat:'Échantillon insuffisant pour afficher ce résultat.'}};

test('scientific owner, researcher and reader can inspect only safe corpus views; standard gets none',()=>{
 const actors=[{name:'Sébastien',permissions:{research:true}},{id:'ethologist-demo'},{id:'scientific-reader-demo'}];
 for(const actor of actors){
  const access=scientificCorpusAccessFor(actor),controller=createScientificCorpusController({access,corpusService:fixture});
  assert.equal(access.authorized,true);assert.match(controller.screen('/scientific/corpus'),/Simulation de corpus scientifique/);
 }
 const denied=createScientificCorpusController({access:scientificCorpusAccessFor({name:'Camille',permissions:{research:false}}),corpusService:fixture});
 assert.equal(denied.screen('/scientific/corpus'),'');
});

test('corpus controller validates filters and suppresses risky views before screen rendering',()=>{
 const access=scientificCorpusAccessFor({id:'ethologist-demo'}),controller=createScientificCorpusController({access,corpusService:fixture});
 assert.match(controller.screen('/scientific/corpus?environment=forest'),/Données synthétiques/);
 assert.match(controller.screen('/scientific/corpus?environment=rare'),/Résultat masqué : groupe trop petit/);
 assert.equal(controller.screen('/scientific/sessions'),'');
 assert.doesNotMatch(controller.screen('/scientific/corpus?identity=Camille'),/Camille|Contributeur fictif/);
});

test('cohorts stay thresholded, support local comparison, and read-only members cannot mutate them',()=>{
 const access=scientificCorpusAccessFor({name:'Sébastien',permissions:{research:true}}),paths=[],controller=createScientificCorpusController({access,corpusService:fixture,navigate:path=>paths.push(path),render:()=>{}});
 const form=(kind,values)=>({dataset:{scientificCorpusForm:kind},values,closest:selector=>selector==='[data-scientific-corpus-form]'?formNode:null,preventDefault(){}});let formNode;
 formNode=form('cohort',{name:'Forêt',criteria:'{"environment":"forest"}'});controller.handleSubmit({target:{closest:()=>formNode},preventDefault(){}});
 formNode=form('cohort',{name:'Rare',criteria:'{"environment":"rare"}'});controller.handleSubmit({target:{closest:()=>formNode},preventDefault(){}});
 assert.match(controller.screen('/scientific/corpus'),/Échantillon insuffisant para afficher/);
 formNode=form('compare-cohorts',{first:'contribution-cohort-001',second:'contribution-cohort-002'});controller.handleSubmit({target:{closest:()=>formNode},preventDefault(){}});
 assert.match(controller.screen('/scientific/corpus'),/Échantillon insuffisant pour afficher ce résultat/);
 const reader=createScientificCorpusController({access:scientificCorpusAccessFor({id:'scientific-reader-demo'}),corpusService:fixture});
 const blocked={target:{closest:()=>({dataset:{scientificCorpusForm:'cohort'},values:{name:'Denied',criteria:'{}'}})},preventDefault(){}};reader.handleSubmit(blocked);assert.equal(reader.snapshot().cohortCount,0);
});
