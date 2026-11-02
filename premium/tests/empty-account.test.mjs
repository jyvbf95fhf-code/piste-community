import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrackLibrary} from '../src/track-library.mjs';
import {createJumolfController} from '../src/jumolf-controller.mjs';
import {createJumolfStore} from '../src/jumolf-store.mjs';
import {JumolfShell} from '../src/jumolf-shell.mjs';
test('real prepared library starts empty without demonstration seed',()=>{assert.deepEqual(createTrackLibrary({ownerId:'owner',includeDemo:false}).list(),[]);assert.ok(createTrackLibrary().list().length>0);});
test('personal JUMOLF stays empty when separate read-only demonstrations are visited',()=>{
 const store=createJumolfStore({entitlement:'premium'});store.activate();store.completeOnboarding();
 const c=createJumolfController({store,demoMode:false}),before=store.snapshot(),sources=c.sources();
 for(const path of ['/jumolf','/jumolf/analyze'])assert.doesNotMatch(JumolfShell(path,c.screen(path),{realMode:true}),/data-demo-history-chart|data-rex-demo/);
 assert.match(c.screen('/jumolf/rex'),/data-rex-demo/);assert.match(c.screen('/jumolf/demo-history'),/data-demo-history-chart/);
 assert.deepEqual(store.snapshot(),before);assert.deepEqual(c.sources(),sources);assert.equal(c.sources().sessions.length,0);
 for(const path of ['/jumolf/compare/demo','/jumolf/dataset?demo=1']){assert.match(c.screen(path),/Aucune donnée fictive/);assert.doesNotMatch(c.screen(path),/data-demo-history-chart|data-rex-demo/);}
});
