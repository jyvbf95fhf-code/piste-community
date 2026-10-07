import {test} from 'node:test';
import assert from 'node:assert/strict';
const editor=await import('../src/track-editor.mjs').catch(()=>({}));
const {
 createTrackDraft,setTrackMode,addTrackPoint,moveTrackPoint,removeTrackPoint,
 setTrackPointKind,updateTrackMetadata,undoTrackEdit,clearTrackDraft,trackDraftMetrics
}=editor;

test('new and edit drafts are detached, local mock values with no fabricated points',()=>{
 const draft=createTrackDraft();
 assert.deepEqual(draft.points,[]);
 assert.equal(draft.dirty,false);
 assert.equal(draft.activeMode,'free');
 const saved={id:'track-1',name:'Bois',source:'draw',provenance:'manual',geometry:{points:[{id:'saved-1',x:12,y:20,kind:'start',incomingMode:null}]}};
 const edit=createTrackDraft({track:saved});
 edit.points[0].x=99;
 assert.equal(saved.geometry.points[0].x,12);
 assert.equal(edit.dirty,false);
});

test('first tap creates the departure; later taps add via points and preserve each segment mode',()=>{
 let draft=createTrackDraft();
 draft=addTrackPoint(draft,{x:20,y:30});
 draft=setTrackMode(draft,'follow');
 draft=addTrackPoint(draft,{x:60,y:70});
 draft=setTrackMode(draft,'free');
 draft=addTrackPoint(draft,{x:120,y:90});
 assert.deepEqual(draft.points.map(point=>point.kind),['start','via','via']);
 assert.deepEqual(draft.points.map(point=>point.incomingMode),[null,'follow','free']);
 assert.equal(draft.activeMode,'free');
});

test('arrival is the last point and adding afterward demotes it to a via point',()=>{
 let draft=createTrackDraft();
 draft=addTrackPoint(draft,{x:10,y:10});
 draft=addTrackPoint(draft,{x:40,y:45});
 draft=setTrackPointKind(draft,draft.points.at(-1).id,'arrival');
 draft=addTrackPoint(draft,{x:80,y:85});
 assert.deepEqual(draft.points.map(point=>point.kind),['start','via','via']);
 draft=setTrackPointKind(draft,draft.points.at(-1).id,'arrival');
 assert.deepEqual(draft.points.map(point=>point.kind),['start','via','arrival']);
});

test('tap coordinates and dragged points stay inside the fictional SVG viewBox',()=>{
 let draft=addTrackPoint(createTrackDraft(),{x:-20,y:400});
 assert.deepEqual([draft.points[0].x,draft.points[0].y],[0,300]);
 draft=moveTrackPoint(draft,draft.points[0].id,{x:390,y:-8});
 assert.deepEqual([draft.points[0].x,draft.points[0].y],[360,0]);
 assert.throws(()=>moveTrackPoint(draft,'missing',{x:1,y:1}),/point/i);
});

test('removing a middle point retains the following segment mode and normalizes endpoints',()=>{
 let draft=createTrackDraft();
 draft=addTrackPoint(draft,{x:10,y:10});
 draft=addTrackPoint(draft,{x:40,y:40});
 draft=setTrackMode(draft,'follow');
 draft=addTrackPoint(draft,{x:80,y:80});
 const middle=draft.points[1].id;
 draft=removeTrackPoint(draft,middle);
 assert.equal(draft.points.length,2);
 assert.equal(draft.points[0].kind,'start');
 assert.equal(draft.points[1].kind,'via');
 assert.equal(draft.points[1].incomingMode,'follow');
 draft=setTrackPointKind(draft,draft.points[1].id,'arrival');
 draft=removeTrackPoint(draft,draft.points[0].id);
 assert.equal(draft.points[0].kind,'start');
 assert.equal(draft.points[0].incomingMode,null);
});

test('undo restores geometry and route mode, and a clean edit returns to its baseline',()=>{
 let draft=createTrackDraft();
 draft=addTrackPoint(draft,{x:15,y:20});
 assert.equal(draft.dirty,true);
 draft=undoTrackEdit(draft);
 assert.deepEqual(draft.points,[]);
 assert.equal(draft.dirty,false);
 draft=addTrackPoint(draft,{x:15,y:20});
 const savedDraft=createTrackDraft({track:{id:'saved',name:'Saved',geometry:{points:draft.points}}});
 const moved=moveTrackPoint(savedDraft,savedDraft.points[0].id,{x:30,y:40});
 assert.equal(moved.dirty,true);
 assert.equal(undoTrackEdit(moved).dirty,false);
});

test('clear removes the whole route as one undoable action',()=>{
 let draft=createTrackDraft();
 draft=addTrackPoint(draft,{x:10,y:10});
 draft=addTrackPoint(draft,{x:100,y:120});
 const cleared=clearTrackDraft(draft);
 assert.deepEqual(cleared.points,[]);
 assert.deepEqual(undoTrackEdit(cleared).points,draft.points);
 assert.throws(()=>clearTrackDraft(createTrackDraft()),/empty|tracé/i);
});

test('mock metrics derive only from drawn segments and report unavailable values for an empty draft',()=>{
 const empty=trackDraftMetrics(createTrackDraft());
 assert.equal(empty.pointCount,0);
 assert.equal(empty.distanceEstimateMeters,null);
 let draft=addTrackPoint(createTrackDraft(),{x:0,y:0});
 draft=addTrackPoint(draft,{x:3,y:4});
 draft=addTrackPoint(draft,{x:3,y:8});
 assert.deepEqual(trackDraftMetrics(draft),{
  pointCount:3,lastSegmentEstimateMeters:40,distanceEstimateMeters:90,label:'Estimation du tracé · mock'
 });
});

test('metadata edits are undoable and immutable',()=>{
 const before=createTrackDraft();
 const changed=updateTrackMetadata(before,{name:'  Sous les pins  ',description:'Terrain mock',dogId:'nox'});
 assert.equal(changed.name,'Sous les pins');
 assert.equal(changed.dirty,true);
 assert.equal(before.name,'');
 assert.equal(undoTrackEdit(changed).dirty,false);
 assert.throws(()=>updateTrackMetadata(before,{name:' '.repeat(2)}),/nom/i);
});

test('changing the active mode never rewrites stored segments; appending after arrival demotes it',()=>{
 let draft=addTrackPoint(createTrackDraft(),{x:5,y:5});
 draft=addTrackPoint(draft,{x:20,y:30});
 draft=setTrackPointKind(draft,draft.points.at(-1).id,'arrival');
 draft=setTrackMode(draft,'follow');
 assert.equal(draft.points[1].incomingMode,'free');
 draft=addTrackPoint(draft,{x:45,y:55});
 assert.equal(draft.points[1].kind,'via');
 assert.equal(draft.points[2].incomingMode,'follow');
 assert.equal(undoTrackEdit(draft).points[1].kind,'arrival');
});

test('copied interrupted tracks preserve segment breaks and mock distance never bridges a gap',()=>{
 let draft=createTrackDraft({copySource:{name:'Archive',sourceId:'session-1',points:[
  {id:'a',x:10,y:10,kind:'start'},
  {id:'b',x:20,y:20,kind:'via'},
  {id:'c',x:200,y:200,kind:'via',breakBefore:true},
  {id:'d',x:210,y:210,kind:'arrival'}
 ]}});
 assert.equal(draft.points[2].breakBefore,true);
 assert.equal(draft.points[2].incomingMode,null);
 assert.equal(trackDraftMetrics(draft).distanceEstimateMeters,283);
 draft=removeTrackPoint(draft,'c');
 assert.equal(draft.points[2].breakBefore,true);
});
