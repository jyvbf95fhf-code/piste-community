import {test} from 'node:test';import assert from 'node:assert/strict';
import * as editor from '../src/track-editor.mjs';import {createTrackLibrary} from '../src/track-library.mjs';
const routes=await import('../src/track-route-segments.mjs').catch(()=>({}));
const a={x:7,y:48,space:'wgs84'},b={x:7.01,y:48.01,space:'wgs84'};
test('route mode is a real toggle and resolved geometry drives distance and saving',()=>{
 let d=editor.createTrackDraft({geographic:true});d=editor.addTrackPoint(d,a);d=editor.setTrackMode(d,'follow');d=editor.addTrackPoint(d,{...b,kind:'arrival'});
 assert.equal(d.points[1].incomingMode,'follow');assert.throws(()=>createTrackLibrary().createPrepared({name:'Pending',geometry:{points:d.points}}));
 const coordinates=[[7,48],[7.01,48],[7.01,48.01]],route={key:routes.routeSegmentKey(a,b),provider:'IGN',coordinates};
 d=editor.applyTrackRoute(d,d.points[1].id,route);assert.ok(editor.trackDraftMetrics(d).distanceEstimateMeters>1800);
 d=editor.setTrackMode(d,'free');assert.equal(d.points[1].incomingMode,'follow');assert.equal(d.activeMode,'free');
 const saved=createTrackLibrary().createPrepared({name:'Routes',geometry:{points:d.points}});assert.deepEqual(saved.geometry.points[1].route,route);
 const moved=editor.moveTrackPoint(d,d.points[1].id,{x:7.02,y:48.01});assert.equal(routes.routeForSegment(moved.points[0],moved.points[1]),null);
});
test('route responses reject mismatched endpoints and invalid geographic geometry',()=>{
 assert.equal(typeof routes.normalizeTrackRoute,'function');
 assert.throws(()=>routes.normalizeTrackRoute({key:routes.routeSegmentKey(a,b),provider:'IGN',coordinates:[[70,40],[70.01,40.01]]},a,b));
 assert.throws(()=>routes.normalizeTrackRoute({key:'wrong',provider:'IGN',coordinates:[[7,48],[7.01,48.01]]},a,b));
});
test('routed geometry survives owner-scoped reload and new points remain free after toggle off',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 let d=editor.createTrackDraft({geographic:true});d=editor.addTrackPoint(d,a);d=editor.setTrackMode(d,'follow');d=editor.addTrackPoint(d,b);d=editor.applyTrackRoute(d,d.points[1].id,{key:routes.routeSegmentKey(a,b),provider:'IGN',coordinates:[[7,48],[7.01,48],[7.01,48.01]]});d=editor.setTrackMode(d,'free');d=editor.addTrackPoint(d,{x:7.02,y:48.02,kind:'arrival'});
 assert.equal(d.points[2].incomingMode,'free');const l=createTrackLibrary({storage,ownerId:'u'}),saved=l.createPrepared({name:'Mixte',geometry:{points:d.points}}),restored=createTrackLibrary({storage,ownerId:'u'}).get(saved.id);
 assert.deepEqual(restored.geometry,saved.geometry);assert.equal(editor.trackDraftMetrics(editor.createTrackDraft({track:restored})).distanceEstimateMeters,editor.trackDraftMetrics(d).distanceEstimateMeters);
});
test('dock contains one segment back arrow and a pressed route toggle',async()=>{
 const {TrackEditorScreen}=await import('../src/track-editor-screen.mjs');let d=editor.setTrackMode(editor.createTrackDraft({geographic:true}),'follow');const h=TrackEditorScreen({draft:d}),dock=h.match(/<nav class="creator-dock"[\s\S]*?<\/nav>/)[0];assert.match(dock,/data-editor-action="toggle-route" aria-pressed="true"/);assert.doesNotMatch(dock,/data-editor-action="undo"/);assert.match(dock,/data-editor-action="remove-last-segment"/);
});
test('actual dock command toggles routes on and off',async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');const source=await readFile(new URL('../src/app.mjs',import.meta.url),'utf8'),start=source.indexOf(" if(editorAction&&location.pathname==='/track-builder')"),end=source.indexOf(' const place=',start),body=source.slice(start,end);
 const state={draft:editor.createTrackDraft({geographic:true})},context={editorAction:{dataset:{editorAction:'toggle-route'}},location:{pathname:'/track-builder'},trackEditor:state,setTrackMode:editor.setTrackMode,editorChange:next=>state.draft=next};
 runInNewContext(`(()=>{${body}})()`,context);assert.equal(state.draft.activeMode,'follow');runInNewContext(`(()=>{${body}})()`,context);assert.equal(state.draft.activeMode,'free');
});
