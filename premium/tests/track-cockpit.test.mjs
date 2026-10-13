import {test} from 'node:test';import assert from 'node:assert/strict';
import * as editor from '../src/track-editor.mjs';
import {TrackEditorScreen} from '../src/track-editor-screen.mjs';
test('back segment removes only the last segment, keeps departure and can be undone',()=>{
 assert.equal(typeof editor.removeLastTrackSegment,'function');let d=editor.createTrackDraft({geographic:true});
 for(const [x,y] of [[7,48],[7.01,48.01],[7.02,48.02]])d=editor.addTrackPoint(d,{x,y,kind:'arrival'});
 const shortened=editor.removeLastTrackSegment(d);assert.deepEqual(shortened.points,d.points.slice(0,-1));assert.deepEqual(editor.undoTrackEdit(shortened).points,d.points);
 const one=editor.removeLastTrackSegment(shortened);assert.equal(one.points.length,1);assert.deepEqual(editor.removeLastTrackSegment(one).points,one.points);
});
test('creator cockpit overlays map actions, metrics and folded metadata',()=>{
 const d=editor.createTrackDraft({geographic:true}),html=TrackEditorScreen({draft:d});
 assert.match(html,/data-track-cockpit/);assert.match(html,/data-editor-real-map/);assert.match(html,/data-editor-action="remove-last-segment"[^>]*disabled/);
 assert.match(html,/data-editor-placement="arrival"/);assert.match(html,/data-editor-action="locate"/);assert.match(html,/data-editor-action="recenter"/);assert.match(html,/data-editor-basemap-choice="satellite"/);
 assert.match(html,/data-track-editor-form/);assert.doesNotMatch(html,/<details[^>]*data-creator-panel[^>]*open/);
});
test('actual creator command routes back segment to last-point removal',async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');
 const source=await readFile(new URL('../src/app.mjs',import.meta.url),'utf8'),start=source.indexOf(" if(editorAction&&location.pathname==='/track-builder')"),end=source.indexOf(" const place=",start);
 let draft=editor.createTrackDraft({geographic:true});for(const x of [7,7.01,7.02])draft=editor.addTrackPoint(draft,{x,y:48});
 let result;const body=source.slice(start,end);runInNewContext(`(()=>{${body}})()`,{editorAction:{dataset:{editorAction:'remove-last-segment'}},location:{pathname:'/track-builder'},trackEditor:{draft},removeLastTrackSegment:editor.removeLastTrackSegment,editorChange:(next,ui)=>{result={next,ui};}});
 assert.equal(result.next.points.length,2);assert.deepEqual(result.next.points,draft.points.slice(0,-1));assert.equal(result.ui.selectedPointId,null);
});
