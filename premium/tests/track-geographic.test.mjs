import {test} from 'node:test';import assert from 'node:assert/strict';
import {createTrackDraft,addTrackPoint,moveTrackPoint,undoTrackEdit,trackDraftMetrics} from '../src/track-editor.mjs';
import {createTrackLibrary} from '../src/track-library.mjs';
test('real map draft keeps geographic coordinates and measures actual segment distance',()=>{
 let d=createTrackDraft({geographic:true});assert.equal(d.coordinateSpace,'wgs84');
 d=addTrackPoint(d,{x:7,y:48});d=addTrackPoint(d,{x:7,y:48.01,kind:'arrival'});
 assert.equal(d.points[0].space,'wgs84');assert.ok(Math.abs(trackDraftMetrics(d).distanceEstimateMeters-1112)<3);
 const moved=moveTrackPoint(d,d.points[1].id,{x:7.1,y:48.02});assert.equal(moved.points[1].x,7.1);assert.deepEqual(undoTrackEdit(moved).points,d.points);
 assert.throws(()=>addTrackPoint(d,{x:181,y:48}));assert.throws(()=>addTrackPoint(d,{x:7,y:91}));
});
test('saved geographic track preserves coordinates across editing and duplication',()=>{
 let d=createTrackDraft({geographic:true});d=addTrackPoint(d,{x:-1,y:48});d=addTrackPoint(d,{x:-1.01,y:48.01,kind:'arrival'});
 const l=createTrackLibrary(),t=l.createPrepared({name:'Parcours réel',geometry:{points:d.points}});
 assert.deepEqual(t.start,{longitude:-1,latitude:48,space:'wgs84'});
 assert.deepEqual(createTrackDraft({track:t}).points,t.geometry.points);assert.equal(createTrackDraft({track:t}).coordinateSpace,'wgs84');
 assert.deepEqual(l.duplicatePrepared(t.id).geometry.points,t.geometry.points);
 assert.throws(()=>l.createPrepared({name:'Mixte',geometry:{points:[d.points[0],{x:30,y:50}]}}));
});
test('geographic creator renders real map, direct metrics and no fictitious routing controls',async()=>{
 const {TrackEditorScreen}=await import('../src/track-editor-screen.mjs');let d=createTrackDraft({geographic:true});d=addTrackPoint(d,{x:7,y:48});d=addTrackPoint(d,{x:7.01,y:48.01,kind:'arrival'});
 const h=TrackEditorScreen({draft:d});assert.match(h,/data-editor-real-map/);assert.match(h,/data-editor-action="locate"/);assert.doesNotMatch(h,/data-editor-mode="follow"|CARTE DE DÉMONSTRATION|SUIVI MOCK|Recentrer · mock/);
 const {TrackDetailScreen}=await import('../src/tracks-screen.mjs');assert.match(TrackDetailScreen({id:'t',name:'Réel',geometryAvailable:true,points:d.points}),/data-readonly="true"/);
});
test('Coaching preparation carries real geometry and excludes hidden reference coordinates',async()=>{
 const c=await import('../src/coaching.mjs'),p=await import('../src/coaching-preparation.mjs'),{MapShell}=await import('../src/map-shell.mjs');
 let d=c.updateDraft(c.createDraft({name:'Sébastien'},[{id:'nox',name:'Nox'}]),{mode:'normal',traceType:'prepared'});
 const points=[{id:'d',x:7.34567,y:48.23456,space:'wgs84',kind:'start'},{id:'a',x:7.35567,y:48.24456,space:'wgs84',kind:'arrival'}];
 d=c.selectPreparation(d,{id:'t',name:'Parcours réel',source:'draw',ownerId:'self',start:{latitude:48.23456,longitude:7.34567,space:'wgs84'},geometry:{points}});
 const session=c.createSession(d).session;assert.deepEqual(session.preparation.geometry.points,points);
 const visible=p.preparationView(p.simulate(p.createPreparation(session),{viewerRole:'traceur'}));assert.match(MapShell(visible),/data-editor-real-map/);assert.match(MapShell(visible),/7.34567/);
 session.mode='full_blind';const hidden=p.preparationView(p.simulate(p.createPreparation(session),{viewerRole:'driver'}));assert.match(MapShell(hidden),/7.34567/);assert.doesNotMatch(MapShell(hidden),/7.35567|48.24456/);
});
