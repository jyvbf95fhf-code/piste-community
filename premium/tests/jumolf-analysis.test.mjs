import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeJumolfSnapshot} from '../src/jumolf-analysis-engine.mjs';
import {createJumolfStore} from '../src/jumolf-store.mjs';

const source={id:'session-1',kind:'coaching',dog:{id:'nox',name:'Nox'},trace:[{x:0,y:0},{x:10,y:0}],referenceTrace:null,terrain:'lisière',weather:null,wind:null,events:[{type:'rupture',timestamp:'2026-10-07T08:10:00Z'}],metrics:{distanceM:240,durationSeconds:600},provenance:{trace:'phone_gps'}};

test('analysis is deterministic, versioned, provenance-aware and has qualified competing hypotheses',()=>{
 const args={engineVersion:'jumolf-test',generatedAt:'2026-10-07T09:00:00.000Z'};
 const a=analyzeJumolfSnapshot(source,args),b=analyzeJumolfSnapshot(source,args);
 assert.deepEqual(a,b);
 assert.equal(a.engine_version,'jumolf-test');
 assert.equal(a.source_snapshot_id,'session-1');
 assert.equal(a.provenance_summary.trace,'phone_gps');
 assert.equal(a.hypotheses.length,3);
 assert.equal(a.hypotheses.reduce((sum,item)=>sum+item.relative_weight_percent,0),100);
 assert.match(a.hypotheses[0].title,/compatible|possible/i);
 assert.ok(a.hypotheses.every(item=>item.limiting_factors.length>0));
});

test('missing geometry and environmental values stay unavailable instead of being invented',()=>{
 const result=analyzeJumolfSnapshot({id:'summary-only',dog:null,trace:null,referenceTrace:null,terrain:null,weather:null,wind:null,events:[],metrics:null},{generatedAt:'2026-10-07T09:00:00.000Z'});
 assert.equal(result.input_quality.level,'insufficient');
 assert.equal(result.metrics.distance_to_reference_m.value,null);
 assert.equal(result.metrics.average_lateral_offset_m.value,null);
 assert.equal(result.metrics.track_age.value,null);
 assert.equal(result.weather.value,null);
 assert.ok(result.missing_inputs.includes('weather'));
 assert.match(result.limitations.join(' '),/insuffisant|indisponible/i);
});

test('anomaly output is a neutral signal and never an error attributed to the dog',()=>{
 const result=analyzeJumolfSnapshot({...source,metrics:{distanceM:5000,durationSeconds:600}},{generatedAt:'2026-10-07T09:00:00.000Z'});
 assert.ok(result.anomaly_signals.every(signal=>signal.label==='Signal détecté'));
 assert.doesNotMatch(JSON.stringify(result.anomaly_signals),/erreur du chien/i);
});

test('analysis feedback supports three states and annotations remain linked',()=>{
 const store=createJumolfStore();
 store.addAnalysis(analyzeJumolfSnapshot(source,{generatedAt:'2026-10-07T09:00:00.000Z',analysisId:'analysis-1'}));
 store.setFeedback('analysis-1','partially_relevant');
 store.addAnnotation({id:'note-1',analysis_id:'analysis-1',text:' À revoir près de la lisière '});
 assert.equal(store.snapshot().analysis_runs[0].feedback,'partially_relevant');
 assert.equal(store.snapshot().annotations[0].text,'À revoir près de la lisière');
});

test('recalculation appends a new run without replacing source or prior analysis',()=>{
 const store=createJumolfStore();
 store.addAnalysis(analyzeJumolfSnapshot(source,{generatedAt:'2026-10-07T09:00:00.000Z',analysisId:'analysis-1'}));
 store.addAnalysis(analyzeJumolfSnapshot(source,{generatedAt:'2026-10-07T10:00:00.000Z',analysisId:'analysis-2',analysisVersion:'analysis-mock-2'}));
 assert.deepEqual(store.snapshot().analysis_runs.map(run=>run.id),['analysis-1','analysis-2']);
 assert.equal(source.id,'session-1');
 assert.throws(()=>store.addAnalysis({id:'analysis-1'}),/existe déjà/i);
});
