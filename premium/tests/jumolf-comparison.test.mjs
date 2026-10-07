import test from 'node:test';
import assert from 'node:assert/strict';
import {compareJumolfSessions} from '../src/jumolf-comparison.mjs';

const session=(id,patch={})=>({id,kind:'coaching',dog:{id:'nox',name:'Nox'},terrain:'lisière',trackAge:{seconds:600},weather:{temperature:16},wind:{direction:'NO'},handlerId:'alex',input_quality:{level:'high'},metrics:{traveled_distance_m:{value:300,status:'calculé'},ruptures:{value:1,status:'calculé'}},...patch});

test('two sessions with matching dog, terrain, type, delay, weather and handler are comparable',()=>{
 const result=compareJumolfSessions([session('a'),session('b')]);
 assert.equal(result.status,'comparable');
 assert.equal(result.sessions.length,2);
 assert.equal(result.comparison.traveled_distance_m[0].value,300);
});

test('partial comparison explains missing or mismatched environmental and handler context',()=>{
 const result=compareJumolfSessions([session('a'),session('b',{terrain:'prairie',weather:null,handlerId:null})]);
 assert.equal(result.status,'partially_comparable');
 assert.ok(result.reasons.some(reason=>/terrain/i.test(reason)));
 assert.ok(result.reasons.some(reason=>/météo|weather/i.test(reason)));
});

test('different dogs or session types are poorly comparable',()=>{
 const result=compareJumolfSessions([session('a'),session('b',{dog:{id:'uma',name:'Uma'}})]);
 assert.equal(result.status,'poorly_comparable');
 assert.ok(result.reasons.some(reason=>/chien/i.test(reason)));
});

test('comparison requires two valid sessions and missing values remain unavailable',()=>{
 assert.throws(()=>compareJumolfSessions([session('a')]),/deux/i);
 const result=compareJumolfSessions([session('a',{metrics:null}),session('b',{metrics:null})]);
 assert.equal(result.comparison.traveled_distance_m[0].value,null);
});
