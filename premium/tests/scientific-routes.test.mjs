import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveScientificRoute} from '../src/scientific-routes.mjs';

test('scientific routes resolve collections and decoded session ids',()=>{
 assert.deepEqual(resolveScientificRoute('/scientific'),{type:'dashboard'});
 assert.deepEqual(resolveScientificRoute('/scientific/sessions'),{type:'sessions'});
 assert.deepEqual(resolveScientificRoute('/scientific/corpus'),{type:'corpus'});
 assert.deepEqual(resolveScientificRoute('/scientific/corpus/dog/DOG-115'),{type:'corpus-dog',id:'DOG-115'});
 assert.deepEqual(resolveScientificRoute('/scientific/corpus/dog/raw-key'),{type:'not-found'});
 assert.deepEqual(resolveScientificRoute('/scientific/session/synthetic-nox-042'),{type:'session',id:'synthetic-nox-042'});
 assert.deepEqual(resolveScientificRoute('/scientific/cohort/rural-45-90'),{type:'cohort',id:'rural-45-90'});
 assert.deepEqual(resolveScientificRoute('/scientific/longitudinal'),{type:'longitudinal'});
 assert.deepEqual(resolveScientificRoute('/scientific/anomalies'),{type:'anomalies'});
 assert.deepEqual(resolveScientificRoute('/scientific/unknown'),{type:'not-found'});
 assert.equal(resolveScientificRoute('/jumolf/dashboard'),null);
});
