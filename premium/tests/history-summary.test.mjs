import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeHistory} from '../src/jumolf-history-summary.mjs';
const row=(id,kind='coaching',ruptures=1)=>({id,kind,metrics:{ruptures:{value:ruptures}}});
test('recurrences use whole history, deduplicate sessions and separate OPS from Coaching',()=>{
 const s=summarizeHistory({history:[row('a'),row('b'),row('b'),row('c','operational'),row('d','coaching',null)]});
 assert.equal(s.rows.length,4);assert.equal(s.facts.length,1);assert.deepEqual(s.facts[0].ids,['a','b']);assert.match(s.facts[0].text,/sur 2/);
});
test('recommendations require evidence from multiple accessible sessions',()=>{
 const s=summarizeHistory({history:[row('a'),row('b')],recommendations:[{id:'bad',personalized:true,evidence:[{sessionId:'a'},{sessionId:'hidden'}]},{id:'good',personalized:true,evidence:[{sessionId:'a'},{sessionId:'b'}]}]});
 assert.deepEqual(s.recommendations.map(r=>r.id),['good']);
});
test('no history invents no pattern and missing values are not zero observations',()=>{
 assert.equal(summarizeHistory().facts.length,0);
 const s=summarizeHistory({history:[row('a','coaching',null),row('b','coaching',null)]});
 assert.equal(s.facts[0].type,'limited');assert.equal(s.gps,0);
});
