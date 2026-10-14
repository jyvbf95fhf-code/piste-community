import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './coaching-exit-fixtures.mjs';
import {createTracerGpsController} from '../src/coaching-gps-controller.mjs';
import {createDriverGpsController} from '../src/coaching-driver-gps-controller.mjs';
import {advanceTracer} from '../src/coaching-tracer.mjs';
import {advanceSessionSearch,syncSession,markExternalTraceurInPlace} from '../src/coaching-session-flow.mjs';
import {TracerScreen} from '../src/coaching-tracer-screen.mjs';
import {SearchScreen} from '../src/coaching-search-screen.mjs';
const at=Date.parse('2026-10-14T12:00:00Z');
for(const kind of ['pose','search'])test(`${kind}: one click waits for a valid fix, retries denial, starts once and seeds real GPS`,()=>{
 const r=fixture({role:'driver',scenario:kind==='pose'?'external_driver_recorded':'external_traceur'});
 let c={draft:r.draft,preparation:r.preparationState,tracer:r.tracerState,search:r.searchState,user:{user_id:'owner'},qa:false};
 if(kind==='search'){c.preparation=markExternalTraceurInPlace(c.preparation);c.search=syncSession(c.search,c.preparation,c.tracer);}
 let fix,error,starts=0,watches=0;
 const ctrl=(kind==='pose'?createTracerGpsController:createDriverGpsController)({getContext:()=>c,setTracer:t=>c.tracer=t,setSearch:s=>c.search=s,clock:()=>at,navigator:{geolocation:{watchPosition(fn,err){fix=fn;error=err;return ++watches;},clearWatch(){}}},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}}});
 const start=()=>{starts++;if(kind==='pose')c.tracer=advanceTracer(c.tracer,c.preparation,'start',{now:()=>at});else c.search=advanceSessionSearch(c.search,c.preparation,'start',{now:()=>at});};
 try{
 const html=kind==='pose'?TracerScreen(c.tracer,c.preparation,{allowGps:true}):SearchScreen(c.search,c.preparation,{allowGps:true});assert.doesNotMatch(html,/Utiliser le GPS de cet iPhone/);
 ctrl.start(start);ctrl.start(start);assert.equal(watches,1);assert.equal(starts,0);
 error({code:1});assert.equal(starts,0);assert.equal(ctrl.view().status,'denied');ctrl.start(start);assert.equal(watches,2);
 fix({timestamp:at,coords:{latitude:48,longitude:7,accuracy:9999}});assert.equal(starts,0);
 fix({timestamp:at,coords:{latitude:48,longitude:7,accuracy:5}});assert.equal(starts,1);
 const gps=kind==='pose'?c.tracer.gpsPose:c.search.gpsSearch;assert.equal(gps.segments.flat().length,1);
 fix({timestamp:at+1,coords:{latitude:48,longitude:7,accuracy:5}});assert.equal(starts,1);
 }finally{ctrl.destroy();}
});
for(const kind of ['pose','search'])test(`${kind}: unsupported GPS never starts recording`,()=>{
 const r=fixture({role:'driver',scenario:kind==='pose'?'external_driver_recorded':'external_traceur'}),c={draft:r.draft,preparation:r.preparationState,tracer:r.tracerState,search:r.searchState,user:{user_id:'owner'},qa:false};
 if(kind==='search'){c.preparation=markExternalTraceurInPlace(c.preparation);c.search=syncSession(c.search,c.preparation,c.tracer);}
 let starts=0;const ctrl=(kind==='pose'?createTracerGpsController:createDriverGpsController)({getContext:()=>c,setTracer:t=>c.tracer=t,setSearch:s=>c.search=s,navigator:{},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}}});
 try{ctrl.start(()=>starts++);assert.equal(ctrl.view().status,'unsupported');assert.equal(ctrl.view().startPending,false);assert.equal(starts,0);assert.equal(c.search.phase,kind==='pose'?'PREPARATION':'SEARCH_READY');}finally{ctrl.destroy();}
});
