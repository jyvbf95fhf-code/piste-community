import {test} from 'node:test';import assert from 'node:assert/strict';
import {GeographicTrackCockpit} from '../src/track-editor-cockpit.mjs';import {createTrackDraft} from '../src/track-editor.mjs';
const api=await import('../src/track-smart-screen.mjs').catch(()=>({}));
test('creator has a Premium intelligent entry without changing manual or GPX commands',()=>{const html=GeographicTrackCockpit({draft:createTrackDraft({geographic:true}),premiumAccess:{entitlement_valid:true,entitlement:'premium'}});assert.match(html,/Tracé intelligent/);assert.match(html,/PREMIUM/);assert.match(html,/data-editor-action="import-gpx"/);assert.match(html,/data-editor-action="toggle-route"/);});
test('generator requests commune distance terrain and surface transitions without a loop option',()=>{assert.equal(typeof api.SmartTrackSection,'function');const html=api.SmartTrackSection({query:'Epfig',communes:[],proposals:[],terrain:'mixed',transitions:'several',distanceKm:2},{entitlement_valid:true,entitlement:'premium'});for(const name of ['distanceKm','terrain','transitions'])assert.match(html,new RegExp(`name="${name}"`));assert.match(html,/Plusieurs/);assert.match(html,/Peu/);assert.match(html,/Urbain/);assert.match(html,/Mixte/);assert.match(html,/surface/i);assert.doesNotMatch(html,/name="loop"|Boucle|type="password"/);});
test('locked generator exposes membership link and never serializes proposals',()=>{assert.equal(typeof api.SmartTrackSection,'function');const html=api.SmartTrackSection({proposals:[{coordinates:[[7.123456,48.123456]]}]},{entitlement_valid:false,entitlement:'none'});assert.match(html,/href="\/jumolf\/premium\?from=smart-track"/);assert.doesNotMatch(html,/7.123456|data-smart-generate-form/);});
test('unknown surfaces and unmet transition criteria stay explicit on a proposal',()=>{assert.equal(typeof api.SmartTrackSection,'function');const html=api.SmartTrackSection({communes:[],proposals:[{id:'p',title:'<unsafe>',distanceM:1500,transitions:0,knownSurfaceRatio:.25,surfaceDistances:{asphalt:375},coordinates:[[7,48],[7.01,48.01]],urbanRatio:.5,natureRatio:.5,transitionsSatisfied:false}],terrain:'mixed',transitions:'several',distanceKm:1.5},{entitlement_valid:true,entitlement:'premium'});assert.match(html,/75 %/);assert.match(html,/non confirmées/i);assert.match(html,/à vérifier/i);assert.doesNotMatch(html,/<unsafe>/);assert.match(html,/data-smart-proposal="p"/);});
test('Premium offer includes JUMOLF and the intelligent generator without a second payment flow',async()=>{
 const {JumolfPremiumScreen}=await import('../src/jumolf-premium-screen.mjs');const html=JumolfPremiumScreen();
 assert.match(html,/Créateur de tracés intelligent/);assert.match(html,/JUMOLF et analyses de progression/);assert.match(html,/transitions de surface/);assert.match(html,/Aucun paiement réel/);
 assert.match(html,/href="\/jumolf\/access-code"/);assert.match(html,/href="\/track-builder\?tool=smart"/);assert.doesNotMatch(html,/<form|type="password"|data-jumolf-action="simulate-premium"/);
});

test('free and expired accounts see the existing Premium offer instead of generation fields',()=>{
 for(const access of [{entitlement_valid:false,entitlement:'none'},{entitlement_valid:false,entitlement:'premium'}]){
  const html=api.SmartTrackPanel({proposals:[{coordinates:[[7.123456,48.123456]]}]},access);
  assert.match(html,/Fonctionnalité Premium/);assert.match(html,/Le Tracé intelligent est réservé aux membres Premium\. Débloquez la génération de parcours selon vos distances, terrains et préférences\./);
  assert.match(html,/Découvrir Premium/);assert.match(html,/href="\/jumolf\/premium\?from=smart-track"/);assert.match(html,/data-editor-action="close-smart"/);
  assert.doesNotMatch(html,/data-smart-generate-form|data-smart-commune-form|7.123456/);
 }
});
test('all active global Premium origins keep the same generation form',()=>{
 for(const source of ['premium','gift','access_code','admin_grant'])assert.match(api.SmartTrackPanel({},{entitlement_valid:true,entitlement:'premium',entitlement_source:source}),/data-smart-generate-form/);
});

test('mobile essentials precede one collapsed advanced section and retain all pedagogic rules',()=>{
 const html=api.SmartTrackSection({level:'diversification',canineContext:{dogs:[{id:'dog',name:'Rex <ami>'}]}},{entitlement_valid:true,entitlement:'premium'});
 const advanced=html.indexOf('<details class="smart-advanced">'),essential=html.slice(html.indexOf('data-smart-generate-form'),advanced),rest=html.slice(advanced,html.indexOf('</details>',advanced));
 for(const field of ['dogId','level','distanceKm'])assert.match(essential,new RegExp(`name="${field}"`));
 for(const field of ['terrain','transitions','skill','maxTurns','minAngle']){assert.doesNotMatch(essential,new RegExp(`name="${field}"`));assert.match(rest,new RegExp(`name="${field}"`));}
 assert.match(rest,/Règles pédagogiques éditoriales/);assert.match(rest,/2026-10-20/);assert.match(html,/Rex &lt;ami&gt;/);assert.doesNotMatch(html,/<ami>/);
});
test('proposal criteria distinguish partial geometry from unverifiable surfaces and access',()=>{
 const rows=api.smartProposalCriteria({distanceM:1000,knownSurfaceRatio:.5,urbanRatio:.5,natureRatio:.5,transitions:0,transitionsSatisfied:false,geometry:{turns:0,satisfied:false}},{distanceKm:1,terrain:'mixed',transitions:'several',level:'consolidation'});
 assert.equal(rows.find(r=>r.label==='Distance').status,'Respecté');assert.equal(rows.find(r=>r.label==='Terrain').status,'Respecté');assert.equal(rows.find(r=>r.label==='Transitions').status,'Non vérifiable');assert.equal(rows.find(r=>r.label==='Angles').status,'Partiel');assert.equal(rows.find(r=>r.label==='Accès et conditions').status,'Non vérifiable');
});
test('geographic proposals expose preview without mutation and errors retry the appropriate existing form',()=>{
 const proposal={id:'real',title:'Parcours',distanceM:1000,coordinates:[[7,48],[7.01,48.01]],surfaceDistances:{},knownSurfaceRatio:0,urbanRatio:.5,natureRatio:.5};
 const access={entitlement_valid:true,entitlement:'premium'};
 const html=api.SmartTrackSection({proposals:[proposal],error:'Connexion impossible',retryAction:'generate'},access);
 assert.match(html,/data-smart-preview="real"/);assert.match(html,/data-smart-proposal="real"/);assert.match(html,/form="smart-generate-form"[^>]*data-smart-retry/);
 assert.match(api.SmartTrackSection({error:'Connexion impossible',retryAction:'search'},access),/form="smart-commune-form"[^>]*data-smart-retry/);
});
