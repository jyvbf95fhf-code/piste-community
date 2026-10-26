import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrackLibrary} from '../src/track-library.mjs';
import {createJumolfController} from '../src/jumolf-controller.mjs';
import {createJumolfStore} from '../src/jumolf-store.mjs';
import {JumolfShell} from '../src/jumolf-shell.mjs';
test('real prepared library starts empty without demonstration seed',()=>{assert.deepEqual(createTrackLibrary({ownerId:'owner',includeDemo:false}).list(),[]);assert.ok(createTrackLibrary().list().length>0);});
test('connected JUMOLF does not offer or render fictional histories',()=>{const store=createJumolfStore({entitlement:'premium'});store.activate();store.completeOnboarding();const c=createJumolfController({store,demoMode:false});for(const path of ['/jumolf','/jumolf/analyze'])assert.doesNotMatch(JumolfShell(path,c.screen(path),{realMode:true}),/href="[^\"]*(?:demo|rex)|data-demo-history-chart/);for(const path of ['/jumolf/rex','/jumolf/demo-history','/jumolf/compare/demo','/jumolf/dataset?demo=1']){assert.match(c.screen(path),/Aucune donnée fictive/);assert.doesNotMatch(c.screen(path),/data-demo-history-chart|data-rex-demo/);}});
