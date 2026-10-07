import test from 'node:test';
import assert from 'node:assert/strict';
import {createJumolfController} from '../src/jumolf-controller.mjs';
import {createJumolfStore} from '../src/jumolf-store.mjs';
import {JumolfScreen} from '../src/jumolf-screen.mjs';
import {getJumolfDemoSource,listJumolfDemoSources} from '../src/jumolf-demo-fixtures.mjs';
import {buildJumolfDemoAnalysis,buildJumolfDemoComparison} from '../src/jumolf-demo-analysis.mjs';

const enabledStore=()=>{
 const store=createJumolfStore({entitlement:'premium'});
 store.activate();store.completeOnboarding();
 for(const key of ['gps','weather','dog_history','ai_analysis','session_comparison'])store.setConsent(key,true);
 return store;
};

test('demo fixtures are fictional, independent snapshots with distinct environmental conditions',()=>{
 const sources=listJumolfDemoSources();
 assert.equal(sources.length,2);
 assert.equal(sources[0].demo.isFictional,true);
 assert.equal(sources[0].dog.name,'Nox');
 assert.equal(sources[0].trace.length>=5,true);
 assert.notDeepEqual(sources[0].corridor.geometry,sources[0].trace);
 assert.notEqual(sources[0].weather.label,sources[1].weather.label);
 sources[0].trace[0].x=999;
 assert.notEqual(getJumolfDemoSource(sources[0].id).trace[0].x,999);
});

test('demo analysis carries provenance, confidence and complete fictive events without external engines',()=>{
 const source=getJumolfDemoSource('demo-nox-search'),analysis=buildJumolfDemoAnalysis(source.id);
 assert.equal(analysis.global_confidence,78);
 assert.equal(analysis.demo_quality_label,'Bonne');
 assert.equal(analysis.provenance_summary.corridor,'estimated');
 assert.equal(analysis.metrics.traveled_distance_m.value,2800);
 assert.equal(analysis.metrics.ruptures.value,2);
 assert.deepEqual(analysis.hypotheses.map(item=>item.relative_weight_percent),[78,61,49]);
 assert.ok(source.demo.timeline.some(item=>item.time==='05:42'));
 assert.ok(source.demo.timeline.some(item=>item.time==='08:16'));
 assert.match(analysis.limitations.join(' '),/fictif/);
});

test('comparison is stable A/B output and exposes all requested context fields',()=>{
 const comparison=buildJumolfDemoComparison();
 assert.equal(comparison.demo,true);
 assert.equal(comparison.sessions.length,2);
 assert.equal(comparison.status_label,'Partiellement comparable');
 assert.equal(comparison.sessions[0].globalConfidence,78);
 assert.equal(comparison.sessions[1].trackAge.label,'2 h 18');
 assert.equal(comparison.sessions[0].corridor.provenance,'estimated');
});

test('dashboard exposes an explicit fictional combined-analysis demo and comparison',()=>{
 const html=JumolfScreen({route:{type:'dashboard'},state:{jumolf_entitlement:'premium',jumolf_enabled:true,jumolf_onboarding_completed:true,analysis_runs:[]},sources:{dogs:[],sessions:[],tracks:[],operational:[]}});
 assert.match(html,/Voir une démonstration JUMOLF/);
 assert.match(html,/href="\/jumolf\/session\/demo-nox-search"/);
 assert.match(html,/href="\/jumolf\/compare\/demo"/);
});

test('fictional session analysis includes map, mock metrics, hypotheses, provenance and timeline',()=>{
 const store=enabledStore(),controller=createJumolfController({store});
 const html=controller.screen('/jumolf/session/demo-nox-search');
 for(const text of ['DÉMO · SCÉNARIO FICTIF','Nox','Sébastien','1 h 42','78 %','2,8 km','Couloir estimé','Hypothèses olfactives','Données combinées','05:42','07:24','08:16'])assert.ok(html.includes(text),`missing ${text}`);
 assert.match(html,/Trace mock terrain/);
 assert.match(html,/Couloir olfactif · Estimé/);
 assert.match(html,/Déplacement probable vers la lisière nord-est/);
});

test('Nox profile uses the synthetic longitudinal dataset and comparison renders A and B scenarios',()=>{
 const controller=createJumolfController({store:enabledStore()});
 const dog=controller.screen('/jumolf/dog/demo-nox');
 assert.match(dog,/Profil basé sur données synthétiques/);
 assert.match(dog,/150 sessions synthétiques/);
 const compare=controller.screen('/jumolf/compare/demo');
 assert.ok(compare.includes('Comparaison fictive · A / B'));
 assert.match(compare,/Recherche différée · lisière/);
 assert.match(compare,/Recherche différée · sous-bois humide/);
 assert.match(compare,/Partiellement comparable/);
});

test('demo screens leave Coaching, OPS, Sessions and Tracks source snapshots unchanged',()=>{
 const raw={
  dogs:[{id:'dog-source',name:'Source dog'}],
  sessions:[{id:'session-source',dog_id:'dog-source',status:'completed',events:[{type:'start'}]}],
  tracks:[{id:'track-source',points:[{lat:1,lng:2}]}],
  operational:[{id:'ops-source',mission:{private_note:'keep'}}],
 };
 const before=structuredClone(raw),controller=createJumolfController({store:enabledStore(),getRawSources:()=>raw});
 controller.screen('/jumolf/session/demo-nox-search');
 controller.screen('/jumolf/compare/demo');
 controller.screen('/jumolf/dog/demo-nox');
 assert.deepEqual(raw,before);
});
