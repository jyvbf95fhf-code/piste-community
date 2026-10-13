import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const sax=createRequire(import.meta.url)('../src/vendor/sax.js');const api=await import('../src/track-gpx-import.mjs').catch(()=>({}));
const parse=xml=>api.parseTrackGpx(xml,{fileName:'parcours.gpx',parserFactory:sax.parser});
test('GPX tracks preserve exact geographic coordinates, name and segment breaks',()=>{
 assert.equal(typeof api.parseTrackGpx,'function');const p=parse('<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Forêt &amp; ville</name><trkseg><trkpt lat="48" lon="7"/><trkpt lat="48.01" lon="7.01"/></trkseg><trkseg><trkpt lat="49" lon="8"/><trkpt lat="49.01" lon="8.01"/></trkseg></trk></gpx>');
 assert.equal(p.name,'Forêt & ville');assert.equal(p.points.length,4);assert.equal(p.points[0].space,'wgs84');assert.equal(p.points[0].x,7);assert.equal(p.points[2].breakBefore,true);assert.equal(p.points[0].kind,'start');assert.equal(p.points[3].kind,'arrival');
});
test('GPX routes and prefixed namespaces are supported without using isolated waypoints',()=>{
 const p=parse('<g:gpx xmlns:g="http://www.topografix.com/GPX/1/1" version="1.1"><g:wpt lat="1" lon="2"/><g:rte><g:rtept lat="48" lon="7"/><g:rtept lat="48.01" lon="7.01"/></g:rte></g:gpx>');assert.equal(p.points.length,2);assert.equal(p.name,'parcours');
});
test('malformed XML, invalid points, isolated waypoints and DTDs are rejected',()=>{
 for(const xml of ['<gpx><trk>','<html/>','<gpx><wpt lat="48" lon="7"/></gpx>','<!DOCTYPE gpx [<!ENTITY x "foo">]><gpx/>','<gpx><rte><rtept lat="" lon="7"/><rtept lat="48" lon="7"/></rte></gpx>','<gpx><rte><rtept lat="91" lon="7"/><rtept lat="48" lon="7"/></rte></gpx>'])assert.throws(()=>parse(xml));
});
test('imported draft saves real GPX provenance and survives reload with breaks and distance',async()=>{
 const {createTrackLibrary}=await import('../src/track-library.mjs'),{trackDraftMetrics}=await import('../src/track-editor.mjs');const p=parse('<gpx><trk><trkseg><trkpt lat="48" lon="7"/><trkpt lat="48.01" lon="7.01"/></trkseg><trkseg><trkpt lat="49" lon="8"/><trkpt lat="49.01" lon="8.01"/></trkseg></trk></gpx>'),d=api.createImportedGpxDraft(p);
 assert.equal(d.source,'gpx');assert.equal(d.provenance,'gpx-import');assert.equal(d.fileName,'parcours.gpx');assert.equal(d.dirty,true);assert.ok(trackDraftMetrics(d).distanceEstimateMeters<3000);
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},l=createTrackLibrary({storage,ownerId:'u'}),t=l.createPrepared({name:d.name,source:d.source,provenance:d.provenance,fileName:d.fileName,geometry:{points:d.points}});assert.deepEqual(createTrackLibrary({storage,ownerId:'u'}).get(t.id),t);
});
test('file selection validates extension and bounded size before reading',async()=>{
 await assert.rejects(api.readTrackGpxFile({name:'x.txt',size:1,text:async()=>'<gpx/>'},{parserFactory:sax.parser}));await assert.rejects(api.readTrackGpxFile({name:'x.gpx',size:api.MAX_GPX_BYTES+1,text:async()=>''},{parserFactory:sax.parser}));
 assert.throws(()=>api.parseTrackGpx('<gpx><rte><rtept lat="48" lon="7"/><rtept lat="48.01" lon="7.01"/></rte></gpx>',{parserFactory:sax.parser,maxPoints:1}),/trop détaillé/);
});
test('actual application import loads a new draft and closes the menu',async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm'),{createTrackDraft}=await import('../src/track-editor.mjs');const source=await readFile(new URL('../src/app.mjs',import.meta.url),'utf8'),start=source.indexOf('async function importEditorGpx('),end=source.indexOf('\nfunction editorChange',start),panel={open:true};let disposeCount=0;
 const context={trackEditor:{draft:createTrackDraft({geographic:true}),routeKey:'editor'},currentUser:{user_id:'u'},location:{pathname:'/track-builder'},readTrackGpxFile:file=>api.readTrackGpxFile(file,{parserFactory:sax.parser}),createImportedGpxDraft:api.createImportedGpxDraft,trackRouting:{dispose:()=>disposeCount++},document:{querySelector:()=>panel},render:()=>{},editorChange:(draft,ui)=>{context.trackEditor={...context.trackEditor,...ui,draft};}};
 runInNewContext(`${source.slice(start,end)};this.run=importEditorGpx`,context);
 await context.run({name:'test.gpx',size:100,text:async()=>'<gpx><rte><rtept lat="48" lon="7"/><rtept lat="48.01" lon="7.01"/></rte></gpx>'});
 assert.equal(context.trackEditor.draft.source,'gpx');assert.equal(context.trackEditor.draft.points.length,2);assert.equal(panel.open,false);assert.equal(disposeCount,1);
});
test('real GPX labels identify imported files rather than demonstration entries',async()=>{
 const {createTrackLibrary}=await import('../src/track-library.mjs'),{trackListView}=await import('../src/session-views.mjs'),{TrackDetailScreen}=await import('../src/tracks-screen.mjs');const p=parse('<gpx><rte><rtept lat="48" lon="7"/><rtept lat="48.01" lon="7.01"/></rte></gpx>'),l=createTrackLibrary();const t=l.createPrepared({...p,geometry:{points:p.points}}),row=trackListView(l.list()).find(x=>x.libraryId===t.id);assert.equal(row.realGpx,true);assert.equal(row.editable,true);const h=TrackDetailScreen(row);assert.doesNotMatch(h,/GPX MOCK|aucun fichier lu/);assert.match(h,/Fichier GPX/);
});
