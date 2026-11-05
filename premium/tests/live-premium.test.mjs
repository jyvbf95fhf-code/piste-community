import test from 'node:test';import assert from 'node:assert/strict';
import {hasLivePremium,LivePremiumGate} from '../src/live-premium.mjs';
import {OperationalScreen} from '../src/operational-screen.mjs';import {createOperationalMissionStore} from '../src/operational-missions.mjs';import {operationalMissionView} from '../src/operational-views.mjs';
test('Live requires current Premium rather than a standalone JUMOLF or unverified flag',()=>{
 assert.equal(hasLivePremium({entitlement:'premium',entitlement_valid:true}),true);
 for(const access of [null,{}, {entitlement:'premium',entitlement_valid:false},{entitlement:'access_code',entitlement_valid:true},{permissions:{premium:true}}])assert.equal(hasLivePremium(access),false);
});
test('free Live entry offers activation and no observer data or mission sharing checkbox',()=>{
 const html=LivePremiumGate();assert.match(html,/Premium actif/);assert.match(html,/partager votre piste et suivre/);assert.ok(html.includes('href="/jumolf/access-code"'));
 const store=createOperationalMissionStore(),mission=store.createDraft({dog:{id:'dog',name:'Chien'},handler:{id:'handler',name:'Conducteur'}});
 const screen=OperationalScreen({route:{type:'mission'},view:operationalMissionView(mission),livePolicy:{share_live:true,premiumRequired:true}});
 assert.match(screen,/data-live-premium-gate/);assert.doesNotMatch(screen,/data-live-policy="share_live"/);
});
