import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountGpsMaps,destroyGpsMaps,centerGpsMap} from '../src/coaching-gps-screen.mjs';
function fixture(kind='pose'){
 const views=[],root={dataset:{gpsKind:kind},querySelector:()=>null,querySelectorAll:()=>[]};
 const element={dataset:{gpsContext:'true',gpsPose:JSON.stringify({phase:'before',segments:[]})},closest:()=>root};
 const map={setView(point,zoom){views.push({point,zoom});return this;},remove(){},removeLayer(){},getZoom:()=>17};
 const layer=()=>({addTo(){return this;},on(){return this;},clearLayers(){}});
 const L={map:()=>map,tileLayer:layer,layerGroup:layer,circle:layer,circleMarker:layer};
 return {views,element,map,document:{querySelectorAll:()=>[element]},L};
}
const point={latitude:48.3,longitude:7.4,accuracy:5};
test('no map exists before a real fix; the first recorded pose centers locally only once',()=>{
 const f=fixture();try{
  mountGpsMaps(f);assert.equal(f.views.length,0);assert.match(f.element.textContent,/première position GPS/);
  f.element.dataset.gpsPose=JSON.stringify({phase:'active',segments:[]});mountGpsMaps(f);assert.equal(f.views.length,0);
  f.element.dataset.gpsPose=JSON.stringify({phase:'active',segments:[[point]]});mountGpsMaps(f);
  assert.deepEqual(f.views.at(-1),{point:[48.3,7.4],zoom:17});
  f.map.setView([48.31,7.42],15);const count=f.views.length;
  f.element.dataset.gpsPose=JSON.stringify({phase:'active',segments:[[{...point,latitude:48.301}]]});mountGpsMaps(f);assert.equal(f.views.length,count);
 }finally{destroyGpsMaps();}
});
test('approach location alone never claims recording or consumes the startup zoom',()=>{
 const f=fixture();try{mountGpsMaps({...f,lastFix:point});assert.equal(f.views.length,1);mountGpsMaps({...f,livePose:{phase:'active',segments:[[point]]},lastFix:point});assert.equal(f.views.length,2);assert.equal(f.views.at(-1).zoom,17);}finally{destroyGpsMaps();}
});
for(const kind of ['search','ops'])test(`${kind} camera behavior is unchanged`,()=>{const f=fixture(kind);try{mountGpsMaps(f);f.element.dataset.gpsPose=JSON.stringify({phase:'active',segments:[[point]]});mountGpsMaps(f);assert.equal(f.views.length,1);}finally{destroyGpsMaps();}});

test('explicit live recenter returns to terrain zoom after a wide overview',()=>{const f=fixture('ops');f.map.getZoom=()=>6;try{mountGpsMaps({...f,livePose:{phase:'active',segments:[[point]]},lastFix:point});centerGpsMap();assert.deepEqual(f.views.at(-1),{point:[48.3,7.4],zoom:17});}finally{destroyGpsMaps();}});
