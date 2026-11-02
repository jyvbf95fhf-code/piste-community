import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoutingGateway} from '../src/server/routing-provider-gateway.mjs';

const a={x:7,y:48},b={x:7.001,y:48.001};
const geometry={features:[{geometry:{type:'LineString',coordinates:[[7,48],[7.001,48.001]]}}]};
const good=()=>({ok:true,json:async()=>geometry});
const quota={reserve:async()=>({allowed:true,used:1})};
const gateway=options=>createRoutingGateway({geoapifyKey:'fixture-primary',orsKey:'fixture-backup',quota,...options});

test('a primary transport failure returns backup geometry without forwarding the primary key',async()=>{
 const calls=[];const g=gateway({fetch:async(url,options)=>{calls.push({url,options});if(url.includes('geoapify'))throw new TypeError('Network failure');return good();}});
 assert.deepEqual(await g.calculate(a,b),{provider:'ors',coordinates:[[7,48],[7.001,48.001]]});
 assert.equal(calls.length,2);assert.equal(calls[1].options.headers.Authorization,'fixture-backup');assert.ok(!JSON.stringify(calls[1]).includes('fixture-primary'));
});

for(const status of [401,403,408,429,503])test(`supplier HTTP ${status} can use the independently authorized backup`,async()=>{
 const calls=[];const g=gateway({fetch:async url=>{calls.push(url);return url.includes('geoapify')?{ok:false,status}:good();}});
 assert.equal((await g.calculate(a,b)).provider,'ors');assert.equal(calls.length,2);
});

test('a stuck primary fetch is aborted and the backup is returned within a bounded time',async()=>{
 let signal;const g=gateway({providerTimeoutMs:20,fetch:async(url,options)=>{if(url.includes('geoapify')){signal=options.signal;return new Promise(()=>{});}return good();}});
 assert.equal((await g.calculate(a,b)).provider,'ors');assert.equal(signal.aborted,true);
});

test('the timeout also covers a primary response body that never finishes',async()=>{
 let signal;const g=gateway({providerTimeoutMs:20,fetch:async(url,options)=>{if(url.includes('geoapify')){signal=options.signal;return {ok:true,json:()=>new Promise(()=>{})};}return good();}});
 assert.equal((await g.calculate(a,b)).provider,'ors');assert.equal(signal.aborted,true);
});

test('both stuck providers finish with an unavailable error instead of an invented line',async()=>{
 const g=gateway({providerTimeoutMs:20,fetch:()=>new Promise(()=>{})});
 await assert.rejects(g.calculate(a,b),error=>error.code==='ROUTING_UNAVAILABLE'&&error.cause?.code==='PROVIDER_TIMEOUT');
});

test('caller cancellation aborts the in-flight supplier and never spends backup quota',async()=>{
 const controller=new AbortController(),reserved=[];let start;const started=new Promise(resolve=>start=resolve);let supplierSignal;
 const g=gateway({quota:{reserve:async({provider})=>{reserved.push(provider);return {allowed:true,used:1};}},fetch:async(url,options)=>{supplierSignal=options.signal;start();return new Promise(()=>{});}});
 const calculation=g.calculate(a,b,{signal:controller.signal});await started;controller.abort();
 await assert.rejects(calculation,{name:'AbortError'});assert.equal(supplierSignal.aborted,true);assert.deepEqual(reserved,['geoapify']);
});

test('an already cancelled request reserves no quota and contacts no supplier',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 const g=gateway({quota:{reserve:async()=>{calls++;return {allowed:true,used:1};}},fetch:async()=>{calls++;return good();}});
 await assert.rejects(g.calculate(a,b,{signal:controller.signal}),{name:'AbortError'});assert.equal(calls,0);
});

test('quota storage failure never sends a paid request or bypasses reservation',async()=>{
 let calls=0;const g=gateway({quota:{reserve:async()=>{throw Error('Compteur de quota indisponible');}},fetch:async()=>{calls++;return good();}});
 await assert.rejects(g.calculate(a,b));assert.equal(calls,0);
});

test('invalid JSON from a supplier falls back, while an invalid-coordinate HTTP 400 does not',async()=>{
 let calls=0;const g=gateway({fetch:async url=>{calls++;return url.includes('geoapify')?{ok:true,json:async()=>{throw new SyntaxError('Invalid JSON');}}:good();}});
 assert.equal((await g.calculate(a,b)).provider,'ors');assert.equal(calls,2);
 calls=0;await assert.rejects(gateway({fetch:async()=>{calls++;return {ok:false,status:400};}}).calculate(a,b));assert.equal(calls,1);
});

test('a depleted primary quota falls back only after reserving the backup quota',async()=>{
 const reserved=[],paid=[];const g=gateway({quota:{reserve:async({provider})=>{reserved.push(provider);return {allowed:provider==='ors',used:3000};}},fetch:async url=>{paid.push(url);return good();}});
 assert.equal((await g.calculate(a,b)).provider,'ors');assert.deepEqual(reserved,['geoapify','ors']);assert.equal(paid.length,1);assert.ok(paid[0].includes('heigit'));
});

test('a primary quota reservation resolving after timeout cannot start a late supplier request',async()=>{
 const calls=[];let resolvePrimary;
 const g=gateway({providerTimeoutMs:20,quota:{reserve:async({provider})=>provider==='geoapify'?new Promise(resolve=>resolvePrimary=resolve):{allowed:true,used:1}},fetch:async url=>{calls.push(url);return good();}});
 assert.equal((await g.calculate(a,b)).provider,'ors');resolvePrimary({allowed:true,used:1});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls.length,1);assert.ok(calls[0].includes('heigit'));
});
