import test from 'node:test';
import assert from 'node:assert/strict';
import {forestSceneForRoute} from '../src/forest-scenes-trial.mjs';
import {AppShell} from '../src/components.mjs';
test('visual scenes are scoped to the intended modules and preserve ordinary shells',()=>{
 for(const [route,scene] of [['/dogs','dogs'],['/profile/dogs','dogs'],['/live/ops/s','live'],['/operational/mission/s','ops'],['/new-session','coaching'],['/sessions/s','coaching'],['/tracks?filter=all','tracks'],['/track-builder','tracks'],['/statistics','statistics'],['/community','community'],['/jumolf','jumolf'],['/scientific','jumolf']]){
 assert.equal(forestSceneForRoute(route),scene);assert.match(AppShell('<h1>Contenu</h1>',route,'Test','T'),new RegExp(`data-forest-scene="${scene}"`));
 }
 for(const route of ['/','/auth','/auth/login','/admin','/unknown'])assert.equal(forestSceneForRoute(route),null);
 assert.doesNotMatch(AppShell('<h1>Administration</h1>','/admin','Test','T'),/data-forest-scene/);
});
