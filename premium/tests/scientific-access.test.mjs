import test from 'node:test';
import assert from 'node:assert/strict';
import {scientificAccessFor,scientificMembers} from '../src/scientific-access.mjs';

test('scientific gate authorizes only the named mock research members',()=>{
 assert.equal(scientificAccessFor({name:'Sébastien',permissions:{research:true}}).authorized,true);
 assert.equal(scientificAccessFor({id:'ethologist-demo'}).authorized,true);
 assert.equal(scientificAccessFor({name:'Camille',permissions:{research:false}}).authorized,false);
 assert.equal(scientificAccessFor(null).authorized,false);
 assert.equal(scientificMembers.length,2);
});
