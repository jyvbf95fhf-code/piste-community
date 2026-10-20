import test from 'node:test';
import assert from 'node:assert/strict';
import {createJumolfStore} from '../src/jumolf-store.mjs';
import {createJumolfController} from '../src/jumolf-controller.mjs';
import {JumolfShell} from '../src/jumolf-shell.mjs';
import {resolveJumolfRoute} from '../src/jumolf-routes.mjs';
const session=(id,dogId,date)=>({id,dogId,dog:{id:dogId,name:'Nox'},dataOrigin:'account',synthetic:false,title:'Séance '+id,status:'ARCHIVED',startedAt:date,mode:'normal',handlerId:'driver',terrain:'forêt',trackAge:{seconds:3600},metrics:{distanceM:120,durationSeconds:60},trace:[{space:'wgs84',x:7,y:48}],referenceTrace:[{space:'wgs84',x:7,y:48}],events:[{type:'Rupture',timestamp:date}]});
function setup(){const store=createJumolfStore({entitlement:'premium'});store.activate();store.completeOnboarding();for(const k of ['gps','dog_history','ai_analysis','session_comparison'])store.setConsent(k,true);let raw={dogs:[{id:'a',name:'Nox',breed:'Malinois'},{id:'b',name:'Nox',breed:'Berger allemand'}],sessions:[session('old','a','2026-10-18T10:00:00Z'),session('new','a','2026-10-19T10:00:00Z'),session('undated','a',null),session('other','b','2026-10-20T10:00:00Z')]};const controller=createJumolfController({store,demoMode:false,getRawSources:()=>raw,getViewer:()=>({name:'Camille'}),prepareRealTraining:()=>{}});return {store,controller,replace:r=>raw=r};}
test('V3 routes lead to the five real sections and retain advanced routes',()=>{for(const [p,type] of [['/jumolf/learn','learn'],['/jumolf/train','train'],['/jumolf/analyze','analyze'],['/jumolf/progress','progress'],['/jumolf','entry']])assert.equal(resolveJumolfRoute(p)?.type,type);assert.equal(resolveJumolfRoute('/jumolf/session/id')?.type,'session');});
test('home uses explicit canine identity, latest dated authorized session, and no automatic analysis write',()=>{const {controller,store}=setup();const h=controller.screen('/jumolf?dog=a');assert.match(h,/data-jumolf-v3-home/);assert.match(h,/Camille/);assert.match(h,/Séance new/);assert.doesNotMatch(h,/Séance other|Séance undated/);assert.match(h,/data-jumolf-session="new"/);assert.match(h,/Aucune analyse lancée/);assert.equal(store.snapshot().analysis_runs.length,0);controller.analyze('new');assert.match(controller.screen('/jumolf?dog=a'),/Analyse disponible/);});
test('context persists across navigation but clears a dog whose access or consent disappears',()=>{const {controller,store,replace}=setup();controller.screen('/jumolf?dog=a&journey=expert');assert.deepEqual(controller.navigationContext(),{dogId:'a',journey:'expert'});controller.screen('/jumolf/train');assert.deepEqual(controller.navigationContext(),{dogId:'a',journey:'expert'});store.setConsent('dog_history',false);assert.equal(controller.navigationContext().dogId,'');assert.doesNotMatch(controller.screen('/jumolf'),/data-jumolf-dog|Camille.*Nox/);store.setConsent('dog_history',true);replace({dogs:[],sessions:[]});assert.equal(controller.navigationContext().dogId,'');assert.doesNotMatch(controller.screen('/jumolf'),/Séance new/);});
test('learn is honest about future Academy and demo even with no entitlement',()=>{const c=createJumolfController({store:createJumolfStore(),demoMode:false});const h=c.screen('/jumolf/learn');assert.match(h,/Rex/);assert.match(h,/ficti/i);assert.match(h,/Académie/);assert.match(h,/À venir/);assert.doesNotMatch(c.screen('/jumolf/train'),/data-jumolf-v3-train/);});
test('presentation journeys never activate features, change consents or create scientific runs',()=>{const {controller,store}=setup();const before=store.snapshot();for(const mode of ['discovery','coaching','expert'])controller.screen('/jumolf?dog=a&journey='+mode);assert.deepEqual(store.snapshot(),before);assert.match(controller.screen('/jumolf/train'),/\/coaching\/session|\/new-session/);assert.match(controller.screen('/jumolf/train'),/\/track-builder\?tool=smart/);});
test('shell carries the selected dog and marks analysis, training and demo sections without losing advanced access',()=>{const h=JumolfShell('/jumolf/session/new','content',{realMode:true,dogId:'a',journey:'expert'});for(const s of ['Accueil','Apprendre','S’entraîner','Analyser','Progresser','Outils avancés'])assert.ok(h.includes(s));assert.match(h,/href="\/jumolf\/analyze\?dog=a&amp;journey=expert" aria-current="page"/);assert.match(h,/\/scientific/);assert.match(JumolfShell('/jumolf/rex','content',{realMode:true}),/DÉMONSTRATION · FICTIF/);});
test('missing dates and empty history never invent a latest session, progress or score',()=>{const {controller,replace}=setup();replace({dogs:[{id:'a',name:'<img src=x onerror=alert(1)>'}],sessions:[session('undated','a',null)]});const h=controller.screen('/jumolf?dog=a');assert.match(h,/Date.*indisponible|datée/);assert.doesNotMatch(h,/<img src=x|score de progression|Séance undated/);assert.match(h,/&lt;img/);});
test('real analysis list remains available without dog history consent and supports unlinked sessions',()=>{const {controller,store}=setup();assert.match(controller.screen('/jumolf/analyze?dog=a'),/Séance old/);assert.doesNotMatch(controller.screen('/jumolf/analyze?dog=a'),/Séance other/);store.setConsent('dog_history',false);assert.match(controller.screen('/jumolf/analyze'),/Séance other/);});
test('public learning and Rex deep links preserve the explicitly requested authorized dog',()=>{
 const {controller,store}=setup();
 for(const path of ['/jumolf/learn','/jumolf/rex']){
  controller.screen('/jumolf?dog=a');
  controller.screen(path+'?dog=b&journey=expert');
  assert.deepEqual(controller.navigationContext(),{dogId:'b',journey:'expert'});
 }
 store.setConsent('dog_history',false);
 controller.screen('/jumolf/learn?dog=a');
 assert.equal(controller.navigationContext().dogId,'');
});
test('home reuses the selected personal dog photo and hides it when dog consent is withdrawn',()=>{
 const {controller,store,replace}=setup();
 replace({dogs:[{id:'a',name:'Nox',personalPhotoDataUrl:'data:image/png;base64,YQ=='}],sessions:[]});
 assert.match(controller.screen('/jumolf?dog=a'),/src="data:image\/png;base64,YQ=="/);
 store.setConsent('dog_history',false);
 assert.doesNotMatch(controller.screen('/jumolf?dog=a'),/data:image/);
});
test('direct dog and session links carry their own authorized canine identity into navigation',()=>{
 const {controller}=setup();
 for(const path of ['/jumolf/dog/b','/jumolf/session/other']){
  controller.screen('/jumolf?dog=a');
  controller.screen(path);
  assert.equal(controller.navigationContext().dogId,'b');
 }
});
