import {test} from 'node:test';import assert from 'node:assert/strict';
import {createTrackRoutingService} from '../src/track-routing-service.mjs';
import {createTrackRoutingController} from '../src/track-routing-controller.mjs';
import {routeSegmentKey} from '../src/track-route-segments.mjs';
const a={x:7,y:48,space:'wgs84'},b={id:'b',x:7.01,y:48.01,space:'wgs84',incomingMode:'follow'},result={key:routeSegmentKey(a,b),provider:'IGN',coordinates:[[7,48],[7.01,48.01]]};
test('routing sends only selected coordinates with explicit pedestrian profile and no credentials',async()=>{
 let request;const service=createTrackRoutingService({fetch:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({profile:'pedestrian',geometry:{type:'LineString',coordinates:result.coordinates}})};}});
 assert.deepEqual(await service.calculate(a,b),result);const url=new URL(request.url);assert.equal(url.origin,'https://data.geopf.fr');assert.equal(url.searchParams.get('profile'),'pedestrian');assert.equal(url.searchParams.get('optimization'),'shortest');assert.equal(request.options.credentials,'omit');assert.equal(request.options.referrerPolicy,'no-referrer');
});
test('routing rejects an API failure instead of inventing a straight route',async()=>{
 await assert.rejects(createTrackRoutingService({fetch:async()=>({ok:false})}).calculate(a,b),/indisponible/);
});
test('controller ignores late results after leaving the editor and can complete a current request',async()=>{
 let context={ownerId:'u',id:'editor',draft:{coordinateSpace:'wgs84',points:[a,b]}},resolve,updates=[];
 const controller=createTrackRoutingController({getContext:()=>context,service:{calculate:()=>new Promise(r=>resolve=r)},onResult:(id,route)=>updates.push({id,route})});controller.reconcile();context=null;controller.reconcile();resolve(result);await new Promise(r=>setTimeout(r,0));assert.equal(updates.length,0);controller.dispose();
 let draft={...b};context={ownerId:'u',id:'editor',draft:{coordinateSpace:'wgs84',points:[a,draft]}};
 const success=createTrackRoutingController({getContext:()=>context,service:{calculate:async()=>result},onResult:(id,route)=>{updates.push({id,route});draft.route=route;}});success.reconcile();await new Promise(r=>setTimeout(r,0));assert.equal(updates.length,1);success.dispose();
});
test('controller rejects a result from an outdated point and suppresses repeated failures',async()=>{
 let resolve,updates=0,calls=0,status=[];const context={ownerId:'u',id:'editor',draft:{coordinateSpace:'wgs84',points:[a,{...b}]}};
 const controller=createTrackRoutingController({getContext:()=>context,service:{calculate:()=>{calls++;return new Promise(r=>resolve=r);}},onResult:()=>updates++,onStatus:x=>status.push(x)});controller.reconcile();context.draft.points[1].x=7.02;resolve(result);await new Promise(r=>setTimeout(r,0));assert.equal(updates,0);controller.dispose();
 const failure=createTrackRoutingController({getContext:()=>context,service:{calculate:async()=>{calls++;throw Error('Hors ligne');}},onResult:()=>updates++,onStatus:x=>status.push(x)});failure.reconcile();await new Promise(r=>setTimeout(r,0));const count=calls;failure.reconcile();assert.equal(calls,count);assert.match(status.at(-1),/Hors ligne/);failure.dispose();
});
