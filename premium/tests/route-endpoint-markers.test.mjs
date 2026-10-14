import {test} from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/route-endpoint-markers.mjs').catch(()=>({}));
test('GPS endpoints use actual first and last fixes, with arrival only after finish',()=>{
 assert.equal(typeof api.routeEndpointMarkers,'function');
 const first={latitude:48,longitude:7},last={latitude:49,longitude:8};
 for(const phase of ['before','active'])assert.deepEqual(api.routeEndpointMarkers({phase,segments:[[],[first],[last]]}),[{letter:'D',point:first}]);
 for(const phase of ['finished','stopped'])assert.deepEqual(api.routeEndpointMarkers({phase,segments:[[first],[],[last]]}),[{letter:'D',point:first},{letter:'A',point:last}]);
 assert.deepEqual(api.routeEndpointMarkers({phase:'finished',segments:[]}),[]);
});
test('Premium badges expose accessible D and A without accepting other letters',()=>{
 assert.match(api.endpointBadge('D'),/Départ/);assert.match(api.endpointBadge('A'),/Arrivée/);
 assert.match(api.endpointBadge('D'),/#e5c17c/);assert.throws(()=>api.endpointBadge('X'));
});
test('Leaflet places accessible badges at recorded endpoint coordinates',()=>{
 const drawn=[],L={divIcon:options=>options,marker:(coordinates,options)=>({addTo:layer=>drawn.push({coordinates,options,layer})})},layer={};
 api.drawRouteEndpointMarkers(L,layer,{phase:'finished',segments:[[{latitude:48,longitude:7},{latitude:48.1,longitude:7.1}]]});
 assert.deepEqual(drawn.map(x=>x.coordinates),[[48,7],[48.1,7.1]]);
 assert.deepEqual(drawn.map(x=>x.options.title),['Départ','Arrivée']);
 assert.ok(drawn.every(x=>x.layer===layer&&x.options.icon.iconSize[0]===30));
});
test('drawing test fixture retains selectable endpoint targets and Premium letters',async()=>{
 const {TrackEditorMap}=await import('./fixtures/track-editor-map.mjs');
 const html=TrackEditorMap({points:[{id:'d',kind:'start',x:30,y:40},{id:'a',kind:'arrival',x:100,y:150}]},{selectedPointId:'d'});
 assert.match(html,/data-editor-point-id="d"/);assert.match(html,/data-editor-point-id="a"/);
 assert.match(html,/>D<\/text>/);assert.match(html,/>A<\/text>/);assert.match(html,/data-selected="true"/);
 assert.match(html,/pointer-events="none"/);
});
