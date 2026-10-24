import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrackRoutingService} from '../src/track-routing-service.mjs';
import {createTrackRoutingController} from '../src/track-routing-controller.mjs';
import {normalizeTrackRoute,trackHasPendingRoutes,segmentDistance} from '../src/track-route-segments.mjs';
const a={id:'a',x:7.39,y:48.27,space:'wgs84'},b={id:'b',x:7.40,y:48.28,space:'wgs84',incomingMode:'follow'};
const coordinates=[[a.x,a.y],[7.395,48.275],[b.x,b.y]];
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('V2 authenticated route uses same-origin API and preserves real geometry',async()=>{
 let calls=0;
 const service=createTrackRoutingService({getAccessToken:async()=> 'test-token',fetch:async(url,options)=>{calls++;assert.equal(url,'/api/route');assert.equal(options.headers.Authorization,'Bearer test-token');return {ok:true,json:async()=>({provider:'geoapify',coordinates})};}});
 const route=await service.calculate(a,b);assert.equal(route.provider,'Geoapify');assert.equal(route.coordinates.length,3);assert.equal(calls,1);
});
test('V2 does not fabricate distance from pending intelligent segments',()=>{
 assert.equal(trackHasPendingRoutes([a,b]),true);assert.equal(segmentDistance(a,b),0);
 const route=normalizeTrackRoute({provider:'ORS',key:JSON.stringify([a.x,a.y,b.x,b.y]),coordinates},a,b);
 assert.equal(trackHasPendingRoutes([a,{...b,route}]),false);assert.ok(segmentDistance(a,{...b,route})>0);
});
test('V2 cache reuses route after it is removed from the draft',async()=>{
 let calls=0,context={ownerId:'owner',id:'draft',draft:{coordinateSpace:'wgs84',points:[a,b]}};
 const controller=createTrackRoutingController({service:{calculate:async()=>{calls++;return normalizeTrackRoute({provider:'Geoapify',key:JSON.stringify([a.x,a.y,b.x,b.y]),coordinates},a,b);}},getContext:()=>context,onResult:(id,route)=>{context.draft.points[1]={...b,route};}});
 controller.reconcile();await tick();assert.equal(calls,1);
 context.draft.points[1]={...b};controller.reconcile();await tick();assert.equal(calls,1);controller.dispose();
});
test('V2 rejects invalid routing geometry instead of saving a straight line',()=>{
 assert.throws(()=>normalizeTrackRoute({provider:'Geoapify',key:JSON.stringify([a.x,a.y,b.x,b.y]),coordinates:[[0,0],[1,1]]},a,b));
});
