import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';
import {detectJumolfPatterns} from '../src/jumolf-pattern-detector.mjs';
import {buildJumolfTemporalLearning} from '../src/jumolf-learning-engine.mjs';
import {createTargetedJumolfSession,buildJumolfVerificationProtocol} from '../src/jumolf-training-plan.mjs';
import {buildJumolfProgress,classifyJumolfProgress,classifyJumolfHypothesis} from '../src/jumolf-progress-tracker.mjs';
import {createJumolfLearningStore} from '../src/jumolf-discovery-journal.mjs';
import {JumolfLearningDashboard,JumolfLearningScreen} from '../src/jumolf-learning-screen.mjs';

test('conditional discoveries use synthetic session evidence and remain deterministic',()=>{
 const sessions=generateJumolfSyntheticDataset().sessions;
 const first=detectJumolfPatterns(sessions),second=detectJumolfPatterns(sessions);
 assert.deepEqual(first,second);
 assert.ok(first.length>0);
 assert.ok(first.every(item=>item.sessions_count>=6&&item.synthetic===true));
 assert.ok(first.every(item=>item.confidence&&item.data_quality&&item.limiting_factors.length));
});

test('small samples are marked insufficient and do not create reliable recommendations',()=>{
 const sessions=generateJumolfSyntheticDataset().sessions.slice(0,5);
 const findings=detectJumolfPatterns(sessions);
 assert.ok(findings.some(item=>item.priority==='Données insuffisantes'));
 assert.ok(findings.every(item=>item.recommendation===null));
});

test('targeted and verification protocols are editable mock constraints, not routes',()=>{
 const [finding]=detectJumolfPatterns(generateJumolfSyntheticDataset().sessions);
 const plan=createTargetedJumolfSession(finding);
 assert.equal(plan.label,'Séance ciblée JUMOLF');
 assert.equal(plan.constraints.source,'jumolf_recommendation');
 assert.equal(plan.status,'proposed');
 const edited=createTargetedJumolfSession(finding,{...plan.parameters,distance_km:2.4,target_area:'Secteur nord'});
 assert.equal(edited.parameters.distance_km,2.4);
 assert.equal(edited.parameters.target_area,'Secteur nord');
 assert.equal(buildJumolfVerificationProtocol(finding).label,'Protocole de vérification JUMOLF');
});

test('progress never invents before/after values and journal events are append-only',()=>{
 const finding=detectJumolfPatterns(generateJumolfSyntheticDataset().sessions)[0];
 const progress=buildJumolfProgress(finding,[]);
 assert.equal(progress.before_after.status,'Données insuffisantes');
 const store=createJumolfLearningStore();
 const first=store.append({type:'discovery_detected',discovery_id:finding.id});
 const frozen=store.snapshot();
 store.append({type:'recommendation_created',discovery_id:finding.id});
 assert.equal(frozen.length,1);
 assert.equal(store.snapshot().length,2);
 assert.ok(Object.isFrozen(first));
 assert.ok(Object.isFrozen(store.snapshot()[0]));
 assert.equal(classifyJumolfProgress({before:38,after:21,sampleCount:8}),'Tendance en amélioration');
 assert.equal(classifyJumolfHypothesis({comparableCount:4,supportingCount:3}),'Hypothèse renforcée');
 assert.equal(classifyJumolfHypothesis({comparableCount:4,contradictoryCount:2}),'Hypothèse non confirmée');
 assert.equal(classifyJumolfHypothesis({comparableCount:0}),'Données insuffisantes');
 assert.equal(classifyJumolfProgress({before:null,after:null,sampleCount:0}),'Données insuffisantes');
 const temporal=buildJumolfTemporalLearning(generateJumolfSyntheticDataset().sessions);
 assert.equal(temporal.synthetic,true);
 assert.ok(temporal.sample_before>=8&&temporal.sample_after>=8);
});

test('dashboard surfaces discoveries and learning pages explain, plan, progress and journal',()=>{
 const discoveries=detectJumolfPatterns(generateJumolfSyntheticDataset().sessions),first=discoveries[0];
 assert.match(JumolfLearningDashboard({discoveries}),/Ce que JUMOLF a appris sur mon chien/);
 assert.match(JumolfLearningScreen({route:{type:'discovery',id:first.id},discoveries}),/Facteurs pouvant fausser/);
 assert.match(JumolfLearningScreen({route:{type:'targeted',id:first.id},discoveries}),/PROTOCOLE PROPOSÉ PAR JUMOLF/);
 assert.match(JumolfLearningScreen({route:{type:'progress'},discoveries,journal:[]}),/Données insuffisantes/);
 assert.match(JumolfLearningScreen({route:{type:'journal'},discoveries,journal:[]}),/Journal JUMOLF/);
});
