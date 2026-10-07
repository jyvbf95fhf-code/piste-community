import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/coaching.mjs';
import {CoachingScreen} from '../src/coaching-screen.mjs';
const setup=()=>{return model.createDraft({id:'self',name:'Sébastien'},[{id:'nox',name:'Nox'}]);};
test('single dog is preselected and flow skips dog step; multiple dogs require explicit selection',()=>{
 const d=setup();assert.equal(d.dogId,'nox');assert.deepEqual(model.steps(d),['intro','mode','scenario','trace','roles','review']);
 const multi=model.createDraft({id:'self',name:'Sébastien'},[{id:'nox',name:'Nox'},{id:'uma',name:'Uma'}]);assert.equal(multi.dogId,null);assert.ok(model.steps(multi).includes('dog'));
});
test('scenario and preparation decisions are separate consecutive wizard steps',()=>{
 const d=setup();
 assert.deepEqual(model.steps(d).slice(1,4),['mode','scenario','trace']);
 const scenario=model.goToStep(d,'scenario'),prep=model.goToStep(d,'trace');
 assert.equal(scenario.step,'scenario');assert.equal(prep.step,'trace');
 const scenarioHtml=CoachingScreen(scenario),prepHtml=CoachingScreen(prep);
 assert.equal((scenarioHtml.match(/data-wizard-option="scenario"/g)||[]).length,4);
 assert.match(scenarioHtml,/Qui réalise la pose\s*\?/);assert.match(scenarioHtml,/Il réalise et enregistre la pose\./);
 assert.doesNotMatch(scenarioHtml,/data-wizard-option="preparation"/);
 assert.equal((prepHtml.match(/data-wizard-option="preparation"/g)||[]).length,4);
 assert.match(prepHtml,/Comment préparer la piste\s*\?/);assert.match(prepHtml,/Utiliser un fichier GPX\./);
 assert.doesNotMatch(prepHtml,/data-wizard-option="scenario"/);
 const blind=model.goToStep(model.updateDraft(d,{mode:'full_blind'}),'scenario');
 const blindHtml=CoachingScreen(blind);
 assert.match(blindHtml,/data-value="self_trace"[^>]*disabled/);
 assert.match(blindHtml,/data-value="external_driver_recorded"[^>]*disabled/);
 assert.throws(()=>model.goToStep(d,'prepare'),/Étape inconnue/);
});
test('blind visibility follows existing role matrix without exposing reference geometry',()=>{
 setup();
 for(const [mode,role,expected] of [['normal','driver',true],['normal','observer',true],['simple_blind','driver',false],['simple_blind','coach',true],['simple_blind','observer',true],['full_blind','driver',false],['full_blind','coach',false],['full_blind','observer',false],['full_blind','traceur',true]])assert.equal(model.canSeeReference(mode,role),expected,`${mode} ${role}`);
});
test('same person can hold successive functions in normal; blind knowledge conflicts block creation',()=>{
 let d=setup();d=model.updateDraft(d,{mode:'normal',traceType:'prepared'});d=model.assignRole(d,'traceur','self');d=model.selectPreparation(d,{id:'test',name:'Piste mock',source:'draw'});assert.deepEqual(model.validateDraft(d),[]);
 d=model.updateDraft(d,{mode:'simple_blind'});assert.ok(model.validateDraft(d).some(x=>x.code==='driver_knows_trace'));
 d=model.assignRole(d,'driver','camille');d=model.selectCreatorRole(d,'traceur');d=model.assignRole(d,'coach','self');d=model.updateDraft(d,{mode:'full_blind'});assert.deepEqual(model.validateDraft(d),[]);assert.equal(model.canSeeReference('full_blind','coach',true),true);
});
test('double blind coach with separate tracer delegates all route methods; missing route is allowed',()=>{
 let d=setup();d=model.selectCreatorRole(d,'coach');d=model.updateDraft(d,{mode:'full_blind',traceType:'gpx'});
 assert.equal(model.preparation(d),'delegated');assert.deepEqual(model.validateDraft(d),[]);
 d=model.updateDraft(d,{traceType:'none'});assert.deepEqual(model.validateDraft(d),[]);
});
test('incomplete drafts cannot create, observer cannot be principal creator, unknown options are rejected',()=>{
 const d=setup();assert.throws(()=>model.createSession(d),/compléter/i);
 assert.throws(()=>model.selectCreatorRole(d,'observer'),/principal/i);
 assert.throws(()=>model.updateDraft(d,{mode:'fake'}),/mode/i);
 assert.throws(()=>model.assignRole(d,'driver','outsider'),/participant/i);
 const ready=model.updateDraft(d,{mode:'normal',traceType:'none'});assert.ok(model.validateDraft(model.assignRole(ready,'driver',null)).some(x=>x.code==='driver_required'));
});
test('creation is an idempotent in-memory snapshot with no compulsory estimates and editing preserves choices',()=>{
 let d=setup();d=model.updateDraft(d,{mode:'normal',traceType:'direct'});d=model.setObservers(d,['lea']);
 const result=model.createSession(d);assert.equal(result.session.dog.name,'Nox');assert.equal(result.session.traceType,'direct');assert.deepEqual(result.session.roles.observers,['lea']);assert.equal(result.session.prototype,true);
 assert.equal(model.createSession(result).session.id,result.session.id);
 assert.deepEqual(Object.keys(result.session).sort(),['creatorRole','dog','id','code','mode','participants','preparation','prototype','roles','traceType','scenario','scentActor','layingRecorder','searchActor'].sort());
 assert.equal(model.goToStep(d,'mode').traceType,'direct');assert.equal(d.session,null);
});

test('successive Coach and Conducteur functions are possible in double blind when both remain blind',()=>{
 let d=setup();d=model.updateDraft(d,{mode:'full_blind',traceType:'direct'});d=model.assignRole(d,'coach','self');assert.deepEqual(model.validateDraft(d),[]);
 d=model.updateDraft(d,{mode:'simple_blind'});assert.ok(model.validateDraft(d).some(x=>x.code==='driver_coach_conflict'));
});

test('anonymous initialization does not prevent the existing auth screen from loading',()=>{
 setup();assert.doesNotThrow(()=>model.createDraft(null,[{id:'nox',name:'Nox'}]));
});
