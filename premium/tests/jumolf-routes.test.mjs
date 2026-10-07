import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveJumolfRoute} from '../src/jumolf-routes.mjs';

test('JUMOLF routes decode IDs and handle each supported destination',()=>{
 assert.deepEqual(resolveJumolfRoute('/jumolf'),{type:'entry'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/dashboard'),{type:'dashboard'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/dataset'),{type:'dataset'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/discoveries'),{type:'discoveries'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/discovery/age%3A1'),{type:'discovery',id:'age:1'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/targeted/age-1'),{type:'targeted',id:'age-1'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/verification/age-1'),{type:'verification',id:'age-1'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/progress'),{type:'progress'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/journal'),{type:'journal'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/activate'),{type:'activate'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/premium'),{type:'premium'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/access-code'),{type:'access-code'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/onboarding'),{type:'onboarding'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/session/session%3A1'),{type:'session',id:'session:1'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/compare'),{type:'compare'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/compare/demo'),{type:'compare',demo:true});
 assert.deepEqual(resolveJumolfRoute('/jumolf/dog/nox'),{type:'dog',id:'nox'});
 assert.deepEqual(resolveJumolfRoute('/jumolf/settings'),{type:'settings'});
});

test('malformed and unrelated routes do not resolve into JUMOLF',()=>{
 for(const route of ['/jumolf/session/a/b','/jumolf/dog/%E0%A4%A','/jumolfish','/jumolf/admin'])assert.equal(resolveJumolfRoute(route),null);
});
