import test from 'node:test';
import assert from 'node:assert/strict';
import {JumolfScreen,ScientificLegend} from '../src/jumolf-screen.mjs';
import {JumolfShell} from '../src/jumolf-shell.mjs';

test('shell scopes JUMOLF identity and navigation inside the module only',()=>{
 const html=JumolfShell('/jumolf','<p>local screen</p>');
 assert.match(html,/class="jumolf-shell"/);
 assert.match(html,/MOTEUR D’ANALYSE/);
 assert.match(html,/href="\/jumolf\/compare"/);
 assert.match(html,/local screen/);
});

test('scientific legend names measured, calculated, estimated, AI and confirmed',()=>{
 const html=ScientificLegend();
 for(const label of ['Mesuré','Calculé','Estimé','IA','Confirmé'])assert.ok(html.includes(label));
});

test('locked premium view explains entitlement without creating a payment',()=>{
 const html=JumolfScreen({route:{type:'entry'},state:{jumolf_entitlement:'none',jumolf_enabled:false}});
 assert.match(html,/JUMOLF est une fonctionnalité Premium/);
 assert.match(html,/Découvrir Premium/);
 assert.match(html,/J’ai un code d’accès/);
 assert.doesNotMatch(html,/payer|paiement|checkout/i);
});

test('missing entitlement state is denied by default',()=>{
 assert.match(JumolfScreen({route:{type:'dashboard'},state:{}}),/JUMOLF est une fonctionnalité Premium/);
});

test('Premium discovery and code entry are dedicated screens with clear mock feedback',()=>{
 const premium=JumolfScreen({route:{type:'premium'},state:{jumolf_entitlement:'none'}});
 assert.match(premium,/Simulation Premium — aucun paiement réel/);
 assert.match(premium,/Simuler un accès Premium/);
 assert.doesNotMatch(premium,/€|checkout|Stripe/i);
 const code=JumolfScreen({route:{type:'access-code'},state:{jumolf_entitlement:'none'},codeFeedback:'Ce code a atteint son nombre maximal d’utilisations.'});
 assert.match(code,/Utiliser un code JUMOLF/);
 assert.match(code,/Ce code a atteint son nombre maximal d’utilisations/);
});

test('expired or revoked entitlement hides the full JUMOLF payload and preserves access origin',()=>{
 for(const lockedReason of ['expired','revoked']){
  const html=JumolfScreen({route:{type:'session',id:'secret-session'},state:{jumolf_entitlement:'access_code',jumolf_enabled:true,entitlement_record:{entitlement:'access_code',source:'access_code',expires_at:lockedReason==='expired'?'2026-10-01T00:00:00.000Z':null,revoked_at:lockedReason==='revoked'?'2026-10-02T00:00:00.000Z':null}},access:{entitlement_valid:false,entitlement_source:'access_code',origin_label:'Accès via code',expires_at:null,locked_reason:lockedReason},source:{id:'secret-session',dog:{name:'Chien secret'}}});
  assert.match(html,lockedReason==='expired'?/Accès JUMOLF expiré/ : /Accès JUMOLF révoqué/);
  assert.match(html,/Accès via code/);
  assert.doesNotMatch(html,/Chien secret|secret-session/);
 }
});

test('activation remains explicit and presents the uncertainty notice and independent consents',()=>{
 const html=JumolfScreen({route:{type:'activate'},state:{jumolf_entitlement:'premium',jumolf_enabled:false,consents:{gps:false,weather:false,dog_history:false,ai_analysis:false,session_comparison:false}}});
 assert.match(html,/Activer JUMOLF/);
 assert.match(html,/ne constituent pas une mesure certaine/);
 for(const key of ['gps','weather','dog_history','ai_analysis','session_comparison'])assert.ok(html.includes(`data-jumolf-consent="${key}"`));
 assert.doesNotMatch(html,/data-jumolf-consent="research_contribution"/);
});

test('onboarding gives four controlled short steps and the final step explicitly activates',()=>{
 for(let step=0;step<4;step++){
  const html=JumolfScreen({route:{type:'onboarding'},state:{jumolf_entitlement:'premium',jumolf_enabled:true},onboardingStep:step});
  assert.ok(html.includes(`Étape ${step+1} sur 4`));
  assert.ok(html.split('<li').length-1<=2);
  assert.ok(html.includes(step===3?'J’ai compris — Activer JUMOLF':'Suivant'));
 }
});

test('welcome and dashboard explain JUMOLF and link analysis, comparison, dogs, research future, and replay',()=>{
 const welcome=JumolfScreen({route:{type:'entry'},state:{jumolf_entitlement:'premium',jumolf_enabled:true,jumolf_onboarding_completed:true},sources:{dogs:[{id:'nox',name:'Nox'}],sessions:[],tracks:[]}});
 assert.match(welcome,/Bienvenue dans JUMOLF/);
 for(const pillar of ['COMPRENDRE','COMPARER','APPRENDRE'])assert.ok(welcome.includes(pillar));
 assert.match(welcome,/Entrer dans JUMOLF/);
 const dashboard=JumolfScreen({route:{type:'dashboard'},state:{jumolf_entitlement:'premium',jumolf_enabled:true,jumolf_onboarding_completed:true,analysis_runs:[]},sources:{dogs:[{id:'nox',name:'Nox'}],sessions:[{id:'s-1',title:'Lisière',dog:{name:'Nox'},kind:'coaching'}],tracks:[]}});
 assert.match(dashboard,/Analyses récentes/);
 assert.match(dashboard,/Nox/);
 assert.match(dashboard,/Comprendre JUMOLF/);
});

test('session analysis renders separate trace and estimated corridor with metrics, hypotheses and feedback',()=>{
 const html=JumolfScreen({route:{type:'session',id:'s-1'},state:{jumolf_entitlement:'premium',jumolf_enabled:true,jumolf_onboarding_completed:true,analysis_runs:[]},source:{id:'s-1',title:'Lisière',dog:{name:'Nox'},trace:[{x:1,y:2},{x:2,y:3}],corridor:{status:'estimated'},weather:null},analysis:{id:'a-1',input_quality:{level:'low',missingInputs:['weather']},metrics:{traveled_distance_m:{value:null,status:'indisponible'}},hypotheses:[{id:'h1',title:'Rupture possible',relative_weight_percent:100,confidence:{label:'Confiance faible',explanation:'Poids simulé'},explanation:'Hypothèse',supporting_factors:[],limiting_factors:['Météo indisponible']}],anomaly_signals:[]}});
 assert.match(html,/Trace source/);
 assert.doesNotMatch(html,/style=/);
 assert.match(html,/Couloir olfactif · Estimé/);
 assert.match(html,/QUALITÉ DES DONNÉES/);
 assert.match(html,/Pertinent/);
 assert.match(html,/Annotation/);
 assert.match(html,/indisponible/);
});

test('dog and comparison views use unavailable labels rather than invented trends',()=>{
 const dog=JumolfScreen({route:{type:'dog',id:'nox'},state:{jumolf_entitlement:'premium',jumolf_enabled:true,jumolf_onboarding_completed:true,analysis_runs:[]},dogProfile:{dog:{id:'nox',name:'Nox'},analysisCount:0,trends:{speed_m_s:{value:null,status:'indisponible',unit:'m/s'}},recentAnalyses:[]}});
 assert.match(dog,/Profil olfactif · Nox/);
 assert.match(dog,/indisponible/);
 const compare=JumolfScreen({route:{type:'compare'},state:{jumolf_entitlement:'premium',jumolf_enabled:true,jumolf_onboarding_completed:true},sources:{sessions:[{id:'s1',title:'Lisière'},{id:'s2',title:'Crête'}]},comparison:null});
 assert.match(compare,/Sélectionner au moins deux sessions/);
 assert.match(compare,/Comparer/);
});

test('settings can disable analysis without implying source deletion',()=>{
 const html=JumolfScreen({route:{type:'settings'},state:{jumolf_entitlement:'premium',jumolf_enabled:true,jumolf_onboarding_completed:true,consents:{gps:true,weather:false,dog_history:true,ai_analysis:true,session_comparison:false}}});
 assert.match(html,/Désactiver JUMOLF/);
 assert.match(html,/ne supprime pas les données/);
});
