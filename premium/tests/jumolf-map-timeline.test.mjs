import test from 'node:test';
import assert from 'node:assert/strict';
import {createJumolfMapProjection} from '../src/jumolf-map.mjs';
import {jumolfTimelineAt} from '../src/jumolf-timeline.mjs';
import {createJumolfStore} from '../src/jumolf-store.mjs';

const source={id:'s-1',trace:[{sequence:1,x:5,y:10,timestamp:'2026-10-07T08:00:00Z',elapsedSeconds:0},{sequence:2,x:20,y:25,timestamp:'2026-10-07T08:05:00Z',elapsedSeconds:300}],referenceTrace:[{x:4,y:9},{x:22,y:23}],events:[{type:'Indice',timestamp:'2026-10-07T08:05:00Z'}],wind:null,weather:null,corridor:{status:'estimated',provenance:'estimated',geometry:null},provenance:{trace:'phone_gps',referenceTrace:'gpx_import'}};

test('map layers toggle independently and keep measured trace separate from estimated corridor',()=>{
 const result=createJumolfMapProjection(source,{trace:false,corridor:true,referenceTrace:true});
 assert.equal(result.layers.trace.visible,false);
 assert.equal(result.layers.corridor.visible,true);
 assert.equal(result.layers.corridor.label,'Couloir olfactif · Estimé');
 assert.equal(result.layers.corridor.geometry,null);
 assert.equal(result.layers.referenceTrace.provenance,'gpx_import');
 assert.notEqual(result.layers.trace,result.layers.corridor);
});

test('map projection never fabricates traces or weather layers',()=>{
 const result=createJumolfMapProjection({id:'summary',trace:null,referenceTrace:null,weather:null,wind:null,events:[]});
 assert.equal(result.layers.trace.geometry,null);
 assert.equal(result.layers.referenceTrace.geometry,null);
 assert.equal(result.layers.weather.available,false);
 assert.equal(result.layers.wind.available,false);
 assert.equal(result.layers.corridor.geometry,null);
});

test('timeline synchronizes available point values and labels missing layers unavailable',()=>{
 const result=jumolfTimelineAt(source,1);
 assert.equal(result.position.x,20);
 assert.equal(result.elapsedSeconds,300);
 assert.equal(result.event.type,'Indice');
 assert.equal(result.wind.status,'indisponible');
 assert.equal(result.weather.status,'indisponible');
 assert.equal(result.corridor.status,'estimé');
});

test('timeline handles empty or out-of-range positions without inventing points',()=>{
 assert.equal(jumolfTimelineAt({trace:null},0).position.status,'indisponible');
 assert.equal(jumolfTimelineAt(source,999).index,1);
});

test('layer preferences are independent state in the local JUMOLF store',()=>{
 const store=createJumolfStore();
 store.setMapLayer('trace',false);
 assert.equal(store.snapshot().map_layers.trace,false);
 assert.equal(store.snapshot().map_layers.corridor,true);
 assert.throws(()=>store.setMapLayer('mission-secrets',true),/couche/i);
});
