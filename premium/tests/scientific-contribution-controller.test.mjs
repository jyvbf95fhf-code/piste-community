import test from 'node:test';
import assert from 'node:assert/strict';
import { createScientificConsentStore } from '../src/scientific-consent-store.mjs';
import { createScientificContributionController } from '../src/scientific-contribution-controller.mjs';

const actor={userId:'contributor-03',role:'contributor'};
const event=(action,extra={})=>({target:{closest:selector=>selector==='[data-scientific-contribution-action]'?{dataset:{scientificContributionAction:action,...extra}}:null}});
const change=(category,checked)=>({target:{matches:selector=>selector==='[data-scientific-category]',dataset:{scientificCategory:category},checked}});

test('controller keeps participation, categories and OPS choices independent and withdrawal confirmed',()=>{
 const store=createScientificConsentStore({mockUserId:actor.userId}),routes=[],renders={count:0},controller=createScientificContributionController({store,actor,navigate:path=>routes.push(path),render:()=>renders.count++,confirm:()=>false});
 controller.handleClick(event('participate'));
 assert.equal(store.snapshot().participationEnabled,true);
 assert.equal(Object.values(store.snapshot().categories).some(Boolean),false);
 assert.equal(controller.handleChange(change('weather',true)),true);
 assert.equal(store.snapshot().categories.weather,true);assert.equal(store.snapshot().categories.gps_trace,false);
 assert.equal(controller.handleChange(change('ops:track_age',true)),true);
 assert.equal(store.snapshot().opsCategories.track_age,true);
 assert.equal(controller.handleClick(event('withdraw')),true);
 assert.equal(store.snapshot().participationEnabled,true);
 controller.handleClick(event('show-data'));
 assert.deepEqual(routes,['/profile/research/data']);assert.equal(renders.count,3);
});

test('withdrawal applies after confirmation and session exclusions cannot override system exclusions',()=>{
 const store=createScientificConsentStore({mockUserId:actor.userId,initialSessionStates:{sensitive:'excluded_sensitive'}});
 store.setParticipation(actor,true);
 const controller=createScientificContributionController({store,actor,confirm:()=>true,render:()=>{}});
 controller.handleClick(event('withdraw'));
 assert.equal(store.snapshot().status,'withdrawn');
 assert.throws(()=>store.setSessionInclusion(actor,'sensitive','included'),/système/i);
});
