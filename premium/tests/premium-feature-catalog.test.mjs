import test from 'node:test';
import assert from 'node:assert/strict';
import {PREMIUM_FEATURES,premiumFeatureBadge} from '../src/premium-feature-catalog.mjs';
import {JumolfShell} from '../src/jumolf-shell.mjs';
test('only enforced premium rights are visibly labeled as enforced',()=>{assert.match(premiumFeatureBadge('jumolf'),/Premium/);assert.equal(premiumFeatureBadge('live_ops_advanced'),'');assert.equal(premiumFeatureBadge('smart_routing'),'');});
test('JUMOLF Premium label does not alter entitlement or navigation',()=>{const html=JumolfShell('/jumolf','<p>content</p>');assert.match(html,/Premium/);assert.match(html,/content/);});
test('future team features are marked planned, not active',()=>assert.equal(PREMIUM_FEATURES.teams_advanced.status,'planned'));
