import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateSmartTracks,smartTrackDraft} from '../src/track-smart-engine.mjs';
import {createSmartTrackController} from '../src/track-smart-controller.mjs';
import * as coaching from '../src/coaching-shared-wizard.mjs';
import {SmartTrackSection} from '../src/track-smart-screen.mjs';
const api=await import('../src/track-canine.mjs').catch(()=>({}));
const commune={code:'67125',name:'Epfig',center:[7.4675,48.3485]};
const straight={elements:[{type:'node',id:1,lon:7.4675,lat:48.3485},{type:'node',id:2,lon:7.4775,lat:48.3485},{type:'way',id:3,nodes:[1,2],tags:{highway:'path'}}]};
test('four editorial levels expose dated criteria and adjustable validated options',()=>{
 assert.equal(typeof api.canineOptions,'function');assert.equal(api.CANINE_LEVELS.length,4);
 for(const l of api.CANINE_LEVELS){const o=api.canineOptions({level:l.id});assert.ok(o.distanceKm>0);assert.ok(l.criteria&&l.limits&&l.updatedAt);assert.ok(o.geometry.maxTurns>=0);}
 assert.throws(()=>api.canineOptions({level:'fake'}));assert.throws(()=>api.canineOptions({level:'initiation',distanceKm:-1}));assert.throws(()=>api.canineOptions({level:'initiation',maxTurns:NaN}));
});
test('short initiation follows real connected edges and preserves editable geometry',()=>{
 assert.equal(typeof api.canineOptions,'function');const o=api.canineOptions({level:'initiation',distanceKm:.1,terrain:'nature'});
 const rows=generateSmartTracks(straight,{commune,...o});assert.ok(rows.length);assert.ok(Math.abs(rows[0].distanceM-100)<1);assert.equal(rows[0].geometry.turns,0);assert.ok(rows[0].geometry.satisfied);assert.ok(smartTrackDraft(rows[0],commune).points.length>=2);
});
test('angles are calculated from geometry and unknown surfaces never become observed transitions',()=>{
 assert.equal(typeof api.trackGeometry,'function');const g=api.trackGeometry([[7,48],[7.002,48],[7.002,48.002]],{maxTurns:0,minAngle:45});assert.equal(g.turns,1);assert.equal(g.satisfied,false);
 const p=generateSmartTracks(straight,{commune,...api.canineOptions({level:'diversification',distanceKm:.2,terrain:'nature',transitions:'several'})})[0];
 const b=api.buildCanineBrief(p,api.canineOptions({level:'diversification',skill:'surfaces'}));assert.equal(b.personalized,false);assert.equal(b.evidence.length,0);assert.match(b.parameters.join(' '),/inconnues/);assert.match(b.limits.join(' '),/olfacti/);assert.equal(p.transitionsSatisfied,false);
});
test('a straight proposal cannot silently satisfy an angle training objective',()=>{
 const o=api.canineOptions({level:'consolidation',skill:'angles',distanceKm:.1});
 const p=generateSmartTracks(straight,{commune,...o})[0];assert.equal(p.geometry.satisfied,false);
 assert.throws(()=>api.canineOptions({level:'initiation',skill:'angles',maxTurns:0}));
 assert.ok(Math.abs(generateSmartTracks(straight,{commune,...api.canineOptions({level:'initiation',distanceKm:.05})})[0].distanceM-50)<1);
});
test('personalized brief only cites matching documented observations and never guesses a level',()=>{
 assert.equal(typeof api.buildCanineBrief,'function');const o=api.canineOptions({level:'consolidation',skill:'continuity'}),p=generateSmartTracks(straight,{commune,...o,terrain:'nature'})[0];
 const context={dog:{id:'d',name:'Rex réel'},recommendations:[{key:'interruptions',personalized:true,evidence:[{sessionId:'s1',title:'Séance autorisée',observations:[{label:'Ruptures',value:2}]}]}],declarations:['Objectif déclaré : continuité']};
 const b=api.buildCanineBrief(p,o,context);assert.equal(b.personalized,true);assert.equal(b.evidence[0].sessionId,'s1');assert.ok(b.declarations.length);assert.equal(api.buildCanineBrief(p,{...o,skill:'angles'},context).personalized,false);
});
test('controller uses existing 0.5 km network contract for short training targets',async()=>{
 let distance;const c=createSmartTrackController({getContext:()=>({ownerId:'u',key:'k',fingerprint:'f',access:{entitlement_valid:true,entitlement:'premium'}}),service:{searchCommunes:async()=>[commune],loadNetwork:async(_,km)=>{distance=km;return straight;}}});
 c.setOptions({level:'initiation',distanceKm:.1,terrain:'nature'});c.setQuery('Epfig');await c.search();c.chooseCommune(commune.code);await c.generate();assert.equal(c.view().error,'');assert.equal(distance,.5);assert.ok(c.view().proposals.length);assert.equal(c.proposal(c.view().proposals[0].id).options.level,'initiation');
});
test('explicit geographic preparation uses the existing wizard and keeps its blind-mode protections',()=>{
 assert.equal(typeof coaching.coachingGeneratedTrackState,'function');const track={id:'t',name:'Parcours',geometry:{points:[{x:7,y:48,space:'wgs84',kind:'start'},{x:7.01,y:48,space:'wgs84',kind:'arrival'}]}};
 const state=coaching.coachingGeneratedTrackState({ownerId:'u',dogs:[{id:'d',name:'Chien'}],dogId:'d',track});
 assert.equal(state.draft.traceType,'prepared');assert.equal(state.draft.mode,null);assert.equal(state.draft.dogId,'d');assert.equal(state.draft.session,null);
 assert.throws(()=>coaching.coachingGeneratedTrackState({ownerId:'u',dogs:[],track,currentState:state}),/brouillon/);
 const w=coaching.createSharedCoachingWizard({profile:{id:'u',name:'Conducteur'},dogs:[{id:'d',name:'Chien'}],initialState:state,getTracks:()=>[track]});
 w.dispatch({field:'mode',value:'simple_blind'});assert.throws(()=>w.dispatch({action:'create'}),/référence|fonction/);
});
test('Premium panel offers all four levels and explanatory proposal sheets',()=>{
 const o=api.canineOptions({level:'initiation',distanceKm:.1}),p=generateSmartTracks(straight,{commune,...o})[0];
 const h=SmartTrackSection({...o,proposals:[p],canineContext:{dogs:[{id:'d',name:'Nox'}]}},{entitlement:'premium',entitlement_valid:true});
 assert.match(h,/Complexité opérationnelle/);assert.match(h,/data-smart-option="dogId"/);assert.match(h,/Fiche pédagogique/);assert.match(h,/générique/);assert.match(h,/Observations à recueillir/);assert.match(h,/0\.05/);
});
