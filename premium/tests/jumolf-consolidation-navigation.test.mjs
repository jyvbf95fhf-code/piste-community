import test from 'node:test';
import assert from 'node:assert/strict';
import {JumolfV3Home,JumolfV3Prepare,JumolfV3Train,jumolfV3Link} from '../src/jumolf-v3-screen.mjs';
import {JumolfShell} from '../src/jumolf-shell.mjs';
import {resolveJumolfRoute} from '../src/jumolf-routes.mjs';
const dog={id:'dog-a',name:'Nox'},state={consents:{dog_history:true}},context={dogs:[dog],dog,state};

test('five navigation rubrics retain canine context without presentation journeys',()=>{
 const html=JumolfShell('/jumolf/prepare','content',{dogId:dog.id,journey:'expert'});
 const nav=html.match(/<nav class="jumolf-subnav[\s\S]+?<\/nav>/)[0];
 assert.equal((nav.match(/<a /g)||[]).length,5);
 for(const label of ['Accueil','Préparer','S’entraîner','Analyser','Progresser'])assert.ok(nav.includes(label));
 assert.match(nav,/href="\/jumolf\/prepare\?dog=dog-a" aria-current="page"/);
 assert.doesNotMatch(nav,/learn|journey|Académie|Apprendre/);
 assert.equal(jumolfV3Link('/jumolf/team?member=handler&journey=expert',{dogId:'dog-a'}),'/jumolf/team?member=handler&dog=dog-a');
 assert.match(JumolfShell('/jumolf','content'),/href="\/jumolf\/dashboard\?view=advanced"/);
});

test('legacy Academy deep links resolve into preparation while malformed routes remain invalid',()=>{
 for(const path of ['/jumolf/prepare','/jumolf/learn','/jumolf/learn/geometrie?journey=expert','/jumolf/learn/lecture?topic=human']){
  assert.deepEqual(resolveJumolfRoute(path),{type:'prepare'});
  assert.match(JumolfShell(path,'content'),/href="\/jumolf\/prepare" aria-current="page"/);
 }
 for(const path of ['/jumolf/learn/a/b','/jumolf/learn/%E0%A4%A'])assert.equal(resolveJumolfRoute(path),null);
});

test('home stays centered on the dog and binome with preparation and all profiles available',()=>{
 for(const journey of ['discovery','coaching','expert']){
  const html=JumolfV3Home({...context,sources:{dogs:[dog],sessions:[]},viewer:{name:'Camille'},journey});
  assert.match(html,/Nox/);assert.match(html,/Camille/);assert.match(html,/\/jumolf\/team\?dog=dog-a/);assert.match(html,/\/jumolf\/prepare\?dog=dog-a/);
  assert.doesNotMatch(html,/v3-journeys|Votre parcours|journey=|\/jumolf\/learn|Académie|Explorer le parcours découverte/);
 }
});

test('preparation retains four levels, recommendations, profiles and Mission Control; training keeps field tools',()=>{
 const prepare=JumolfV3Prepare(context),train=JumolfV3Train(context);
 for(const label of ['Initiation','Consolidation','Diversification','Complexité opérationnelle','Mission Control'])assert.ok(prepare.includes(label));
 for(const path of ['/jumolf/exercises?dog=dog-a','/jumolf/team?dog=dog-a','/track-builder?tool=smart&amp;canine=1&amp;dog=dog-a'])assert.ok(prepare.includes(path));
 for(const path of ['/coaching/session','/tracks','/operational'])assert.ok(train.includes(path));
 assert.doesNotMatch(prepare+train,/Académie|\/jumolf\/learn|v3-journeys|journey=/);
});
