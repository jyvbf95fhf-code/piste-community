import test from 'node:test';
import assert from 'node:assert/strict';
import {JUMOLF_SYNTHETIC_SEED,generateJumolfSyntheticDataset,getJumolfSyntheticSession} from '../src/jumolf-synthetic-dataset.mjs';
import {buildJumolfSyntheticAnalytics,compareJumolfSyntheticGroups,buildJumolfSyntheticDogProfile,filterJumolfSyntheticSessions,detectJumolfSyntheticAnomalies} from '../src/jumolf-synthetic-analytics.mjs';

test('fixed seed creates exactly 100 training and 50 operational sessions deterministically',()=>{
 const first=generateJumolfSyntheticDataset(),second=generateJumolfSyntheticDataset();
 assert.equal(JUMOLF_SYNTHETIC_SEED,'PISTE-JUMOLF-SYNTHETIC-2026');
 assert.equal(first.sessions.length,150);
 assert.deepEqual(first,second);
 assert.equal(first.sessions.filter(item=>item.kind==='training').length,100);
 assert.equal(first.sessions.filter(item=>item.kind==='operational').length,50);
 assert.equal(new Set(first.sessions.map(item=>item.id)).size,150);
 assert.equal(first.sessions.filter(item=>item.atypicalCode).length,12);
 assert.ok(first.sessions.filter(item=>item.benchmark_session).length>=6);
 assert.ok(first.sessions.some(item=>item.blind_analysis_available));
});

test('synthetic sessions have coherent dates, events, provenance, inputs and no sensitive OPS fields',()=>{
 const {sessions}=generateJumolfSyntheticDataset();
 for(const session of sessions){
  assert.equal(session.synthetic,true);
  assert.equal(session.microSignals.provenance,'synthetic_derived');
  assert.ok(Number.isFinite(session.microSignals.hesitations));
  assert.equal(session.microSignals.turn_directions.length,session.difficulty.turns);
  assert.equal(session.dog.id,'demo-nox');
  assert.ok(Number.isFinite(Date.parse(session.startedAt)));
  assert.ok(['high','medium','low','insufficient'].includes(session.quality.level));
  assert.ok(session.events.some(item=>item.type==='Départ'));
  assert.ok(session.events.some(item=>item.type==='Fin de piste'));
  assert.ok(session.provenance.synthetic);
  if(session.trackAge.status==='unknown')assert.equal(session.trackAge.seconds,null);
  if(session.kind==='operational'){
   const serialized=JSON.stringify(session).toLocaleLowerCase('fr');
   for(const sensitive of ['victime','adresse','téléphone','medical','medicale','vulnérabil','note_operationnelle','risque'])assert.equal(serialized.includes(sensitive),false);
  }
 }
});

test('synthetic analytics are calculated from fixtures and groups expose real derived differences',()=>{
 const sessions=generateJumolfSyntheticDataset().sessions,analytics=buildJumolfSyntheticAnalytics(sessions);
 assert.equal(analytics.totalSessions,150);
 assert.equal(analytics.trainingCount,100);
 assert.equal(analytics.operationalCount,50);
 assert.equal(analytics.totalDistanceM,sessions.reduce((sum,item)=>sum+item.metrics.distanceM,0));
 assert.equal(analytics.totalDurationSeconds,sessions.reduce((sum,item)=>sum+item.metrics.durationSeconds,0));
 assert.equal(analytics.averageConfidence,Number((sessions.reduce((sum,item)=>sum+item.confidence,0)/150).toFixed(1)));
 assert.equal(analytics.trends.confidenceByPhase.length,4);
 assert.ok(analytics.groups.trainingVsOperational.training.count===100);
 assert.ok(analytics.groups.trainingVsOperational.operational.count===50);
 assert.deepEqual(analytics.trends.confidenceByPhase.map(item=>item.label),['Phase initiale','Consolidation','Maturité','Profil confirmé']);
 assert.ok(analytics.trends.confidenceByPhase[3].averageConfidence>analytics.trends.confidenceByPhase[0].averageConfidence);
 assert.ok(analytics.training.averageQuality>analytics.operational.averageQuality);
 assert.ok(analytics.trends.performanceByTrackAge.length>=5);
 assert.ok(analytics.trends.performanceByHumidity.length>=3);
 assert.ok(analytics.trends.performanceByEnvironment.length>=8);
 assert.ok(analytics.trends.performanceByPollution.length===3);
 assert.ok(compareJumolfSyntheticGroups(sessions,'training','operational').length>0);
});

test('longitudinal dog profile derives its trends from sessions and flags synthetic evidence',()=>{
 const sessions=generateJumolfSyntheticDataset().sessions,profile=buildJumolfSyntheticDogProfile(sessions);
 assert.equal(profile.sessionCount,150);
 assert.equal(profile.trainingCount,100);
 assert.equal(profile.operationalCount,50);
 assert.equal(profile.label,'Profil basé sur données synthétiques');
 assert.ok(profile.phases.some(item=>item.sessionCount>0));
 assert.ok(profile.trends.windLateralSensitivity!==undefined);
});

test('filters, page size, benchmarks, blind-ready cases and deterministic anomalies are available',()=>{
 const sessions=generateJumolfSyntheticDataset().sessions;
 assert.ok(sessions.filter(item=>item.benchmark_session).length>=6);
 assert.ok(sessions.some(item=>item.blind_analysis_available));
 assert.deepEqual(detectJumolfSyntheticAnomalies(sessions),detectJumolfSyntheticAnomalies(sessions));
 assert.ok(detectJumolfSyntheticAnomalies(sessions).length>=10);
 assert.ok(detectJumolfSyntheticAnomalies(sessions).every(item=>item.why&&item.synthetic));
 assert.equal(filterJumolfSyntheticSessions(sessions,{type:'training'}).length,100);
 assert.ok(filterJumolfSyntheticSessions(sessions,{quality:'low'}).every(item=>item.quality.level==='low'));
 assert.equal(getJumolfSyntheticSession(sessions[5].id).id,sessions[5].id);
 assert.equal(getJumolfSyntheticSession('missing',sessions),null);
});
