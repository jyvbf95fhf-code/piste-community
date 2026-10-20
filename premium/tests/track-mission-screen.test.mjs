import test from 'node:test';import assert from 'node:assert/strict';
const api=await import('../src/track-mission-screen.mjs').catch(()=>({}));
test('mission control keeps unknown weather, planned times and olfactory limitations visible',()=>{
 assert.equal(typeof api.MissionControlPanel,'function');const h=api.MissionControlPanel({active:true,route:{valid:true,distanceM:100,stations:[],unchanged:false},timeline:{valid:false},environment:{weather:null,basis:'unavailable',changes:[]},sample:{distanceM:0},weatherAllowed:false},{dog:{name:'<Chien>'},viewer:{name:'<Conducteur>'},options:{level:'initiation'}});
 for(const text of ['MISSION CONTROL','Couloir olfactif','hypothétique','Fin de pose prévue','Départ du chien prévu','aucune mesure','Coaching','&lt;Chien&gt;','&lt;Conducteur&gt;'])assert.ok(h.includes(text),text);assert.doesNotMatch(h,/confiance élevée|concentration|certifié/);assert.match(h,/data-mission-progress/);assert.match(h,/data-mission-times/);
});
