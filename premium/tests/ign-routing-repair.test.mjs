import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrackRoutingService} from '../src/track-routing-service.mjs';
const a={x:7.39,y:48.27},b={x:7.40,y:48.28};
const geo={type:'LineString',coordinates:[[7.39,48.27],[7.395,48.275],[7.40,48.28]]};
test('IGN pedestrian route persists real network geometry',async()=>{
 let url;
 const service=createTrackRoutingService({fetch:async input=>{url=String(input);return {ok:true,json:async()=>({geometry:geo})};}});
 const route=await service.calculate(a,b);
 assert.equal(route.provider,'IGN');assert.equal(route.coordinates.length,3);
 assert.match(url,/resource=bdtopo-osrm/);assert.match(url,/profile=pedestrian/);
});
test('IGN temporary 503 retries before returning valid road',async()=>{
 let calls=0;
 const service=createTrackRoutingService({fetch:async()=>++calls===1?{ok:false,status:503}:{ok:true,json:async()=>({geometry:geo})}});
 assert.equal((await service.calculate(a,b)).coordinates.length,3);assert.equal(calls,2);
});
test('IGN 404 explains error and does not fabricate a line',async()=>{
 const service=createTrackRoutingService({fetch:async()=>({ok:false,status:404})});
 await assert.rejects(service.calculate(a,b),/HTTP 404/);
});
test('Invalid response is rejected rather than silently using direct line',async()=>{
 const service=createTrackRoutingService({fetch:async()=>({ok:true,json:async()=>({geometry:{type:'Point',coordinates:[1,2]}})})});
 await assert.rejects(service.calculate(a,b),/sans itinéraire/);
});
