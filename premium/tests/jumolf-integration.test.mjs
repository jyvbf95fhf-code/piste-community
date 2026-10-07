import test from 'node:test';
import assert from 'node:assert/strict';
import {createJumolfController} from '../src/jumolf-controller.mjs';
import {createJumolfStore} from '../src/jumolf-store.mjs';
import {buildJumolfDiscoveries} from '../src/jumolf-learning-engine.mjs';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';

const source={id:'s-1',kind:'coaching',title:'Lisière',dog:{id:'nox',name:'Nox'},terrain:'lisière',trace:[{x:2,y:3}],referenceTrace:[{x:1,y:1}],weather:{label:'16°'},wind:{direction:'NO'},events:[],metrics:{distanceM:120,durationSeconds:300}};
const setup=(overrides={})=>{const store=createJumolfStore({entitlement:'premium',clock:()=> '2026-10-07T10:00:00.000Z',...overrides});const navigations=[];let renders=0;const controller=createJumolfController({store,getRawSources:()=>({dogs:[{id:'nox',name:'Nox'}],sessions:[source],tracks:[],operational:[]}),navigate:path=>navigations.push(path),render:()=>renders++,toast:()=>{}});return {store,controller,navigations,renderCount:()=>renders};};

test('consent activation starts mandatory onboarding and final onboarding activates JUMOLF',()=>{
 const {store,controller,navigations}=setup();
 controller.activate();
 assert.equal(store.snapshot().jumolf_enabled,false);
 assert.equal(store.snapshot().jumolf_activation_pending,true);
 assert.equal(store.snapshot().jumolf_onboarding_completed,false);
 assert.equal(navigations.at(-1),'/jumolf/onboarding');
 controller.completeOnboarding();
 assert.equal(store.snapshot().jumolf_enabled,true);
 assert.equal(store.snapshot().jumolf_activation_pending,false);
 assert.equal(store.snapshot().jumolf_onboarding_completed,true);
});

test('local consent filters GPS, weather and dog-history inputs independently',()=>{
 const {store,controller}=setup();
 store.setConsent('gps',true);store.setConsent('weather',false);store.setConsent('dog_history',false);
 const rows=controller.sources();
 assert.equal(rows.dogs.length,0);
 assert.equal(rows.sessions[0].dog,null);
 assert.equal(rows.sessions[0].trace.length,1);
 assert.equal(rows.sessions[0].weather,null);
 assert.equal(rows.sessions[0].wind,null);
});

test('withheld GPS removes derived metric inputs and withheld dog history hides the profile',()=>{
 const {store,controller}=setup();store.setConsent('gps',true);store.activate();store.completeOnboarding();
 const rows=controller.sources();assert.ok(rows.sessions[0].metrics);
 store.setConsent('gps',false);store.setConsent('dog_history',false);
 const filtered=controller.sources();assert.equal(filtered.sessions[0].metrics,null);assert.equal(filtered.sessions[0].trace,null);assert.equal(filtered.sessions[0].dog,null);assert.equal(filtered.dogs.length,0);
 const html=controller.screen('/jumolf/dog/nox');assert.match(html,/Profil chien indisponible/);
});

test('analysis appends versioned output, preserves source snapshots, and respects AI consent',()=>{
 const {store,controller}=setup();
 store.activate();store.completeOnboarding();store.setConsent('gps',true);store.setConsent('ai_analysis',false);
 const original=structuredClone(source);
 const run=controller.analyze('s-1');
 assert.equal(run.source_snapshot_id,'s-1');
 assert.equal(run.hypotheses.length,0);
 assert.equal(store.snapshot().analysis_runs.length,1);
 assert.deepEqual(source,original);
 controller.recalculate('s-1');
 assert.equal(store.snapshot().analysis_runs.length,2);
});

test('revoking consent redacts old run output without modifying saved analysis history',()=>{
 const {store,controller}=setup();store.setConsent('gps',true);store.setConsent('ai_analysis',true);store.activate();store.completeOnboarding();
 const run=controller.analyze('s-1');assert.ok(run.metrics.traveled_distance_m.value);assert.ok(run.hypotheses.length);
 store.setConsent('gps',false);store.setConsent('ai_analysis',false);
 const html=controller.screen('/jumolf/session/s-1');assert.match(html,/consentement GPS désactivé/);assert.match(html,/Interprétation IA désactivée/);
 assert.ok(store.snapshot().analysis_runs[0].metrics.traveled_distance_m.value);assert.ok(store.snapshot().analysis_runs[0].hypotheses.length);
});

test('comparison needs its separate consent and preserves explicit unavailability',()=>{
 const {store,controller}=setup();
 store.activate();store.completeOnboarding();
 assert.throws(()=>controller.compare(['s-1','s-1']),/consentement/i);
 store.setConsent('session_comparison',true);
 const result=controller.compare(['s-1','s-1']);
 assert.equal(result.sessions.length,2);
});

test('deactivation retains analysis history and access-code redemption changes entitlement only',()=>{
 const {store,controller}=setup({entitlement:'none',accessCodes:[{code:'LOCAL',created_by:'admin-demo',created_at:'2026-10-01T00:00:00Z',expires_at:null,max_uses:2,uses_count:0,grant_type:'permanent',revoked_at:null,note_admin:''}]});
 assert.equal(controller.redeemCode('LOCAL').ok,true);
 controller.activate();store.completeOnboarding();store.addAnalysis({id:'a',source_snapshot_id:'s-1'});
 controller.deactivate();
 assert.equal(store.snapshot().jumolf_enabled,false);
 assert.equal(store.snapshot().analysis_runs.length,1);
 assert.equal(store.snapshot().jumolf_entitlement,'access_code');
});

test('locked routes do not render source details and controller blocks direct analysis without access',()=>{
 const {controller}=setup({entitlement:'none'});
 const html=controller.screen('/jumolf/session/s-1');
 assert.match(html,/JUMOLF est une fonctionnalité Premium/);
 assert.doesNotMatch(html,/Nox|Lisière|s-1/);
 assert.throws(()=>controller.analyze('s-1'),/accès JUMOLF valide/i);
});

test('code validation explains each rejection and a valid code only routes to voluntary activation',()=>{
 const codes=[
  {id:'valid',code:'VALID',created_by:'admin',created_at:'2026-10-01T00:00:00Z',expires_at:null,max_uses:2,uses_count:0,grant_type:'permanent'},
  {id:'expired',code:'EXPIRED',created_by:'admin',created_at:'2026-09-01T00:00:00Z',expires_at:'2026-10-01T00:00:00Z',max_uses:2,uses_count:0,grant_type:'temporary'},
  {id:'revoked',code:'REVOKED',created_by:'admin',created_at:'2026-10-01T00:00:00Z',expires_at:null,max_uses:2,uses_count:0,grant_type:'permanent',revoked_at:'2026-10-02T00:00:00Z'},
  {id:'quota',code:'QUOTA',created_by:'admin',created_at:'2026-10-01T00:00:00Z',expires_at:null,max_uses:1,uses_count:1,grant_type:'permanent'}
 ];
 const {store,controller,navigations}=setup({entitlement:'none',accessCodes:codes});
 const feedback=code=>{controller.redeemCode(code);return controller.screen('/jumolf/access-code');};
 assert.match(feedback('UNKNOWN'),/Ce code n’est pas valide/);
 assert.match(feedback('EXPIRED'),/Ce code n’est plus valide/);
 assert.match(feedback('REVOKED'),/Ce code a été révoqué/);
 assert.match(feedback('QUOTA'),/nombre maximal d’utilisations/);
 assert.equal(controller.redeemCode('VALID').ok,true);
 assert.equal(store.snapshot().jumolf_enabled,false);
 assert.equal(navigations.at(-1),'/jumolf/activate');
});

test('expired entitlement blocks analysis without deleting prior runs',()=>{
 const {store,controller}=setup({entitlement:'access_code'});store.activate();store.completeOnboarding();store.addAnalysis({id:'historic'});
 store.setEntitlementRecord({entitlement:'access_code',source:'access_code',granted_at:'2026-10-01T00:00:00Z',expires_at:'2026-10-02T00:00:00Z',revoked_at:null});
 assert.match(controller.screen('/jumolf/dashboard'),/Accès JUMOLF expiré/);
 assert.equal(store.snapshot().analysis_runs.length,1);
 assert.throws(()=>controller.analyze('s-1'),/a expiré/i);
});

test('after onboarding, later activation does not force the onboarding a second time',()=>{
 const {store,controller}=setup();controller.activate();controller.completeOnboarding();controller.deactivate();
 controller.activate();assert.equal(store.snapshot().jumolf_enabled,true);assert.equal(store.snapshot().jumolf_onboarding_completed,true);
});

test('learning dashboard links to a targeted proposal without mutating source stores',()=>{
 const {store,controller,navigations}=setup();controller.activate();controller.completeOnboarding();
 const before=store.snapshot(),discoveries=buildJumolfDiscoveries(generateJumolfSyntheticDataset().sessions),recommended=discoveries.find(item=>item.recommendation);
 const dashboard=controller.screen('/jumolf/dashboard');assert.match(dashboard,/Ce que JUMOLF a appris sur mon chien/);assert.match(dashboard,/Voir toutes les découvertes/);
 assert.match(controller.screen(`/jumolf/discovery/${recommended.id}`),/Pourquoi cela peut passer inaperçu/);
 const node={dataset:{jumolfAction:'create-targeted',jumolfId:recommended.id}};
 assert.equal(controller.handleClick({target:{closest:()=>node}}),true);
 assert.equal(navigations.at(-1),`/jumolf/targeted/${recommended.id}`);
 assert.match(controller.screen(`/jumolf/targeted/${recommended.id}`),/aucun itinéraire n’est calculé/);
 const originalFormData=globalThis.FormData;
 globalThis.FormData=class{get(name){return ({distance_km:'2.4',environment:'rural',track_age_minutes:'60',difficulty:'intermédiaire',left_turns:'3',right_turns:'3',surface_changes:'1',pollution:'faible à moyenne',area_type:'Secteur',target_area:'Nord',outcome:'concordant',note:'Observation du conducteur'})[name]??null;}};
 try{controller.handleSubmit({preventDefault(){},target:{closest:()=>({dataset:{jumolfForm:'targeted-plan',jumolfId:recommended.id}})}});}finally{globalThis.FormData=originalFormData;}
 assert.match(controller.screen(`/jumolf/targeted/${recommended.id}`),/Contraintes reçues en simulation/);
 assert.match(controller.screen(`/jumolf/targeted/${recommended.id}`),/value="2.4"/);
 const completeNode={dataset:{jumolfAction:'mark-targeted-completed',jumolfId:recommended.id}};controller.handleClick({target:{closest:()=>completeNode}});
 assert.match(controller.screen('/jumolf/progress'),/1 séance\(s\) ciblée\(s\) enregistrée\(s\)/);
 const restoreFormData=globalThis.FormData;globalThis.FormData=class{get(name){return ({outcome:'concordant',note:'Observation du conducteur'})[name]??null;}};
 try{for(let index=0;index<3;index++)controller.handleSubmit({preventDefault(){},target:{closest:()=>({dataset:{jumolfForm:'hypothesis-review',jumolfId:recommended.id}})}});}finally{globalThis.FormData=restoreFormData;}
 assert.match(controller.screen('/jumolf/progress'),/Hypothèse renforcée/);
 assert.match(controller.screen('/jumolf/progress'),/Données insuffisantes/);
 assert.deepEqual(store.snapshot(),before);
 assert.match(controller.screen('/jumolf/journal'),/recommendation created/);
});
