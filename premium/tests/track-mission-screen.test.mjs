import test from 'node:test';import assert from 'node:assert/strict';
const api=await import('../src/track-mission-screen.mjs').catch(()=>({}));
test('mission control keeps unknown weather, planned times and olfactory limitations visible',()=>{
 assert.equal(typeof api.MissionControlPanel,'function');const h=api.MissionControlPanel({active:true,route:{valid:true,distanceM:100,stations:[],unchanged:false},timeline:{valid:false},environment:{weather:null,basis:'unavailable',changes:[]},sample:{distanceM:0},weatherAllowed:false},{dog:{name:'<Chien>'},viewer:{name:'<Conducteur>'},options:{level:'initiation'}});
 for(const text of ['MISSION CONTROL','Couloir olfactif','hypothétique','Fin de pose prévue','Départ du chien prévu','aucune mesure','Coaching','&lt;Chien&gt;','&lt;Conducteur&gt;'])assert.ok(h.includes(text),text);assert.doesNotMatch(h,/confiance élevée|concentration|certifié/);assert.match(h,/data-mission-progress/);assert.match(h,/data-mission-times/);
});
test('collapsed Mission Control keeps the three principal actions reachable and secondary science grouped',()=>{
 const h=api.MissionControlPanel({active:true,route:{valid:true,distanceM:100,stations:[],unchanged:false},timeline:{valid:false},environment:{weather:null,basis:'unavailable',changes:[]},sample:{distanceM:0},weatherAllowed:true},{canPrepare:true});
 const panel=h.indexOf('<details class="mission-panel"');
 for(const action of ['adjust','save','prepare'])assert.ok(h.indexOf(`data-mission-action="${action}"`)>=0&&h.indexOf(`data-mission-action="${action}"`)<panel,action);
 for(const section of ['science','simulation','timeline','environment','brief'])assert.match(h,new RegExp(`<details[^>]*data-mission-section="${section}"`));
 assert.doesNotMatch(h,/règles du Lot 3/i);
});
