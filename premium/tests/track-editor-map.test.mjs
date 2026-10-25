import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTrackDraft,addTrackPoint,setTrackMode,setTrackPointKind} from '../src/track-editor.mjs';
import {TrackEditorMap} from '../src/track-editor-map.mjs';
import {mountTrackEditorMap,disposeTrackEditorMap,switchTrackEditorBasemap} from '../src/track-editor-real-map.mjs';

const routeData=html=>JSON.parse(html.match(/data-route="([^"]+)"/)[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
function mounted(draft,{readOnly=false}={}){
 const lines=[],markers=[],tiles=[],handlers={};let bounds;
 const layer=()=>({addTo(){return this;},on(){return this;}});
 const map={setView(){return this;},fitBounds(p){bounds=p;},on(name,handler){handlers[name]=handler;},getCenter:()=>({lat:48,lng:7}),getZoom:()=>17,remove(){},removeLayer(){}};
 const element={dataset:readOnly?{readonly:'true',route:JSON.stringify(draft)}:{},closest:()=>null,parentElement:{querySelector:()=>null}};
 const L={map:()=>map,layerGroup:layer,tileLayer(url){tiles.push(url);return layer();},polyline(coordinates,options){lines.push({coordinates,options});return layer();},divIcon:options=>options,marker(coordinates,options){markers.push({coordinates,options});return layer();}};
 mountTrackEditorMap({document:{querySelector:()=>element},L,draft,ResizeObserver:null});
 return {lines,markers,tiles,handlers,get bounds(){return bounds;}};
}
const points=[{id:'d',space:'wgs84',x:7.12345,y:48.12345,kind:'start'},{id:'v',space:'wgs84',x:7.12445,y:48.12445,kind:'via'},{id:'a',space:'wgs84',x:7.12545,y:48.12545,kind:'arrival'}];

test('new geographic editor exposes a real map while legacy geometry stays unavailable and read-only',()=>{
 const fresh=TrackEditorMap(createTrackDraft({geographic:true}));
 assert.match(fresh,/data-editor-real-map/);assert.match(fresh,/aria-label="Carte réelle du parcours préparé"/);assert.doesNotMatch(fresh,/data-readonly|<svg|session-satellite-forest/);
 const legacy=TrackEditorMap(createTrackDraft({copySource:{points:[{x:7,y:48},{x:8,y:49}]}}));
 assert.match(legacy,/sans coordonnées géographiques/);assert.match(legacy,/data-readonly="true"/);
 assert.deepEqual(routeData(legacy),{coordinateSpace:'wgs84',points:[],readOnly:true});
});

test('real departure, via and arrival markers retain actual coordinates and accessible semantic roles',()=>{
 const draft=createTrackDraft({copySource:{points}}),html=TrackEditorMap({...draft,readOnly:true});
 assert.deepEqual(routeData(html).points,draft.points);
 try{const view=mounted(draft);assert.deepEqual(view.markers.map(m=>m.coordinates),points.map(p=>[p.y,p.x]));assert.deepEqual(view.markers.map(m=>m.options.title),['Départ','Étape 1','Arrivée']);assert.ok(view.markers.every(m=>m.options.keyboard&&m.options.draggable));for(const [index,label] of [[0,'Départ'],[2,'Arrivée']])assert.match(view.markers[index].options.icon.html,new RegExp(`aria-label="${label}"`));}finally{disposeTrackEditorMap();}
});

test('saved segment modes distinguish real direct geometry from a pending streets route without inventing curves',()=>{
 let draft=createTrackDraft({geographic:true});draft=addTrackPoint(draft,{x:7,y:48});draft=setTrackMode(draft,'follow');draft=addTrackPoint(draft,{x:7.001,y:48.001});draft=setTrackMode(draft,'free');draft=addTrackPoint(draft,{x:7.002,y:48.002});draft=setTrackPointKind(draft,draft.points.at(-1).id,'arrival');
 assert.deepEqual(draft.points.map(p=>p.incomingMode),[null,'follow','free']);
 try{const view=mounted(draft);assert.deepEqual(view.lines.map(l=>l.coordinates),[[[48,7],[48.001,7.001]],[[48.001,7.001],[48.002,7.002]]]);assert.equal(view.lines[0].options.className,'track-pending-route');assert.equal(view.lines[0].options.dashArray,'7 7');assert.equal(view.lines[1].options.className,'premium-neon-track');}finally{disposeTrackEditorMap();}
});

test('copied geographic interruptions remain separate real polylines and read-only markers cannot mutate',()=>{
 const draft=createTrackDraft({copySource:{points:[points[0],points[1],{...points[1],id:'gap',x:7.5,y:48.5,breakBefore:true},{...points[2],x:7.501,y:48.501}]}});
 try{const view=mounted(draft,{readOnly:true});assert.deepEqual(view.lines.map(l=>l.coordinates),[[[48.12345,7.12345],[48.12445,7.12445]],[[48.5,7.5],[48.501,7.501]]]);assert.ok(view.markers.every(m=>m.options.draggable===false));assert.equal(view.handlers.click,undefined);assert.deepEqual(view.bounds,draft.points.map(p=>[p.y,p.x]));}finally{disposeTrackEditorMap();}
});

test('real basemap switch changes tile source without changing saved geographic points',()=>{
 const draft=createTrackDraft({copySource:{points}}),before=structuredClone(draft.points);
 try{const view=mounted(draft);assert.equal(switchTrackEditorBasemap('satellite'),true);assert.equal(switchTrackEditorBasemap('standard'),true);assert.equal(switchTrackEditorBasemap('fictional'),false);assert.equal(view.tiles.length,3);assert.notEqual(view.tiles[0],view.tiles[1]);assert.equal(view.tiles[0],view.tiles[2]);assert.deepEqual(draft.points,before);}finally{disposeTrackEditorMap();}
});
