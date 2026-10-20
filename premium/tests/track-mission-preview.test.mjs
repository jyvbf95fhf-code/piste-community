import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
import {mountTrackEditorMap,disposeTrackEditorMap} from '../src/track-editor-real-map.mjs';
test('preview freezes map writes including viewport callbacks before explicit application',()=>{
 const source=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8'),start=source.indexOf(' mountTrackEditorMap({draft:'),end=source.indexOf('\n const mission=',start);let mounted,changes=0;
 const draft={points:[{id:'a',x:7,y:48}],name:'Original',mapView:{center:[48,7],zoom:12}},before=JSON.stringify(draft);
 const context={trackEditor:{draft:structuredClone(draft),preview:{draft:{basemap:'satellite'}}},location:{pathname:'/track-builder'},mountTrackEditorMap:options=>mounted=options,missionContext:()=>({preview:true}),addTrackPoint:d=>({...d,name:'mutated-add',points:[{id:'new'}]}),moveTrackPoint:d=>({...d,name:'mutated-move'}),editorChange:()=>changes++,render:()=>changes++,Toast:()=>{}};
 runInNewContext(source.slice(start,end),context);mounted.onAdd({x:8,y:49});mounted.onMove('a',{x:8,y:49});mounted.onSelect('a');mounted.onView({center:[49,8],zoom:16});
 assert.equal(changes,0);assert.equal(JSON.stringify(context.trackEditor.draft),before);assert.equal(mounted.previewReadOnly,true);
});
test('preview map markers are not draggable and map clicks cannot add draft points',()=>{
 let drag=true,viewWrites=0;const handlers={},map={setView(){return this;},on(k,v){handlers[k]=v;},remove(){},fitBounds(){}};
 const chain=()=>({addTo(){return this;},on(){return this;}}),element={dataset:{},parentElement:{querySelector:()=>null}};
 const L={map:()=>map,layerGroup:chain,tileLayer:chain,divIcon:x=>x,marker:(_,options)=>{drag=options.draggable;return chain();}};
 mountTrackEditorMap({document:{querySelector:()=>element},L,previewReadOnly:true,draft:{points:[{id:'a',x:7,y:48,kind:'start'}]},onView:()=>viewWrites++,ResizeObserver:null});
 assert.equal(drag,false);assert.equal(handlers.click,undefined);handlers.moveend?.();assert.equal(viewWrites,0);disposeTrackEditorMap();
});
