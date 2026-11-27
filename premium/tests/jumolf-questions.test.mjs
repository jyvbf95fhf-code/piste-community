import test from 'node:test';
import assert from 'node:assert/strict';
import {createJumolfController} from '../src/jumolf-controller.mjs';
import {createJumolfStore} from '../src/jumolf-store.mjs';
import {buildRealJumolfLearning} from '../src/jumolf-real-learning.mjs';
import {jumolfQuestionAnswers,jumolfQuestionIntent,jumolfQuestionSessions} from '../src/jumolf-questions.mjs';

const consents={gps:true,weather:true,dog_history:true,ai_analysis:true,session_comparison:true};
const dog={id:'bobby',name:'Bobby'};
const session=(i,patch={})=>({
 id:'coaching:'+i,dogId:dog.id,dog,dataOrigin:'account',kind:'coaching',status:'ARCHIVED',mode:'normal',
 startedAt:`2026-11-${String(i).padStart(2,'0')}T10:00:00Z`,title:'Piste '+i,
 events:[{type:'Rupture',timestamp:'2026-11-01T10:01:00Z'}],...patch
});
const sessions=Array.from({length:6},(_,i)=>session(i+1));

test('only completed real Coaching sessions for the exact dog count, once per id',()=>{
 const rows=[...sessions,session(6),session(7,{dogId:'another'}),session(8,{synthetic:true}),session(9,{status:'SEARCH_RUNNING'}),session(10,{kind:'operational'}),session(11,{demo:true})];
 assert.deepEqual(jumolfQuestionSessions(rows,dog.id).map(s=>s.id),['coaching:6','coaching:5','coaching:4','coaching:3','coaching:2','coaching:1']);
});
test('free phrasing maps to supported intents and handles unknown questions honestly',()=>{
 for(const phrasing of ['Qu’est-ce que je devrais travailler avec Bobby ?', 'Tu me conseilles quoi pour sa prochaine piste ?']){
  assert.equal(jumolfQuestionIntent(phrasing).type,'recommendation');
 }
 assert.equal(jumolfQuestionIntent('Sur quelles séances te bases-tu ?').type,'evidence');
 assert.deepEqual(jumolfQuestionIntent('J’ai 20 minutes'),{type:'duration',minutes:20});
 assert.equal(jumolfQuestionIntent('Quel temps fera-t-il demain ?').type,'unknown');
});
test('answers use local Coaching evidence and adapt a 20-minute exercise with explicit timings',()=>{
 const selected=jumolfQuestionSessions(sessions,dog.id).slice(0,5);
 const report=buildRealJumolfLearning(dog.id,selected,{consents});
 const [rec,why,adapt,unknown]=jumolfQuestionAnswers(['Un exercice ?', 'Pourquoi ?', 'Adapte à 20 minutes', 'Quel temps demain ?'],report,dog.name);
 assert.equal(rec.recommendation.key,'interruptions');
 assert.equal(why.evidence.length,5);
 assert.ok(why.evidence.every(row=>row.sessionId!=='coaching:1'));
 assert.match(adapt.text,/3 min .*13 min .*4 min/);
 assert.match(unknown.text,/Je peux proposer/);
});
test('the real JUMOLF route requires five approved pistes and the relevant consents',()=>{
 const store=createJumolfStore({entitlement:'premium'});
 store.activate();store.completeOnboarding();
 for(const [key,value] of Object.entries(consents))store.setConsent(key,value);
 let rows=sessions.slice(0,4);
 const controller=createJumolfController({store,demoMode:false,getRawSources:()=>({dogs:[dog],sessions:rows}),getViewer:()=>({id:'owner'})});
 assert.match(controller.screen('/jumolf?dog=bobby'),/Demander à JUMOLF/);
 assert.match(controller.screen('/jumolf?ask=1'),/4 pistes Coaching sur 5/);
 assert.doesNotMatch(controller.screen('/jumolf?ask=1'),/name="question"/);
 rows=sessions.slice(0,5);
 assert.match(controller.screen('/jumolf?ask=1'),/name="question"/);
 store.setConsent('ai_analysis',false);
 assert.match(controller.screen('/jumolf?ask=1'),/Gérer mes consentements/);
 assert.doesNotMatch(controller.screen('/jumolf?ask=1'),/name="question"/);
});
