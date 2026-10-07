import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeScientificValues} from '../src/scientific-statistics.mjs';

test('descriptive distribution counts missing values and computes quartiles',()=>{
 const s=summarizeScientificValues([1,2,3,4,5,null]);
 assert.deepEqual({n:s.n,missing:s.missing,min:s.min,q1:s.q1,median:s.median,q3:s.q3,max:s.max},{n:5,missing:1,min:1,q1:2,median:3,q3:4,max:5});
});
test('empty distributions remain unavailable',()=>assert.equal(summarizeScientificValues([null,undefined]).median,null));
