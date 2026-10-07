import test from 'node:test';
import assert from 'node:assert/strict';
import {trackListView,trackDetailView} from '../src/session-views.mjs';
import {TrackListScreen,TrackDetailScreen} from '../src/tracks-screen.mjs';
import {createTrackLibrary} from '../src/track-library.mjs';
import {createSessionCatalog} from '../src/session-catalog.mjs';
import {mock} from '../src/data.mjs';
import {createCoachingQa} from '../src/coaching-qa.mjs';
import {createTrackDraft} from '../src/track-editor.mjs';
import {TrackEditorMap} from '../src/track-editor-map.mjs';

function recordWithPaths(phase='DEBRIEF',includePaths=true){
 const qa=createCoachingQa('normal',mock.user,[{id:'nox',...mock.dog}]);
 qa.search={...qa.search,phase};
 if(includePaths){
  qa.tracer={...qa.tracer,segments:[[{x:70,y:242},{x:92,y:214}]]};
  qa.search={...qa.search,layingSegments:qa.tracer.segments,actorId:'self',segments:[[{x:80,y:238},{x:120,y:205}]]};
 }
 return {session:{...qa.preparation.session,title:'Bois du matin'},searchState:qa.search,preparationState:qa.preparation,tracerState:qa.tracer};
}

test('track library entries distinguish manual preparation and GPX mock metadata',()=>{
 const library=createTrackLibrary();library.importFixture('gpx-pins','GPX chargé');
 const rows=trackListView(library.list(),[]);
 assert.ok(rows.some(row=>row.provenance==='Préparé manuellement'));
 assert.ok(rows.some(row=>row.provenance==='Import GPX · démonstration'));
 assert.ok(rows.every(row=>row.geometryAvailable===false));
});

test('tracks from a session use only debrief pose and search paths with provenance',()=>{
 const record=recordWithPaths(),catalog=createSessionCatalog();catalog.capture(record);
 const rows=trackListView([],catalog.list());
 assert.deepEqual(rows.map(row=>row.kind),['pose','search']);
 assert.ok(rows.every(row=>row.sessionId===record.session.id&&row.geometryAvailable));
 assert.match(rows[0].provenance,/pose/i);
 assert.match(rows[1].provenance,/relève/i);
 assert.deepEqual(rows[0].copySource.points.map(({x,y})=>[x,y]),[[70,242],[92,214]]);
 assert.deepEqual(rows[1].copySource.points.map(({x,y})=>[x,y]),[[80,238],[120,205]]);
 assert.equal(rows[0].editable,false);
});

test('session source detail is read-only and offers a copy only when raw points exist',()=>{
 const catalog=createSessionCatalog();catalog.capture(recordWithPaths());
 const rows=trackListView([],catalog.list()),pose=rows.find(row=>row.kind==='pose');
 const html=TrackDetailScreen(pose);
 assert.match(html,/Créer une copie modifiable/);
 assert.match(html,/href="\/community\/new\?sourceType=track&amp;sourceId=/);
 assert.doesNotMatch(html,/Modifier le tracé/);
 const noGeometry=createSessionCatalog();noGeometry.capture(recordWithPaths('DEBRIEF',false));
 const unavailable=trackListView([],noGeometry.list());
 assert.equal(unavailable.length,0);
});

test('prepared and copied entries expose geometry and explicit provenance without mutating their source',()=>{
 const library=createTrackLibrary();
 const original=library.createPrepared({name:'Référence',geometry:{points:[{x:10,y:20},{x:60,y:80}]}});
 const clone=library.duplicatePrepared(original.id);
 const rows=trackListView(library.list(),[]);
 assert.equal(rows.find(row=>row.libraryId===original.id).geometryAvailable,true);
 assert.equal(rows.find(row=>row.libraryId===original.id).editable,true);
 const copied=rows.find(row=>row.libraryId===clone.id);
 assert.match(copied.provenance,/copie/i);
 assert.equal(copied.editable,true);
 assert.deepEqual(library.get(original.id).geometry,library.get(clone.id).geometry);
 clone.geometry.points[0].x=300;
 assert.equal(library.get(original.id).geometry.points[0].x,10);
});

test('copy source preserves interrupted session segments without joining their geometry',()=>{
 const record=recordWithPaths(),catalog=createSessionCatalog();
 record.tracerState.segments=[[{x:70,y:242},{x:92,y:214}],[{x:180,y:170},{x:205,y:145}]];
 catalog.capture(record);
 const pose=trackListView([],catalog.list()).find(row=>row.kind==='pose');
 assert.equal(pose.copySource.points[2].breakBefore,true);
 const map=TrackEditorMap(createTrackDraft({copySource:{...pose.copySource,name:pose.name}}));
 assert.equal((map.match(/data-editor-segment=/g)||[]).length,2);
 assert.doesNotMatch(map,/M92 214 L180 170/);
});

test('prepared copy detail renders each interrupted trace as a separate segment',()=>{
 const library=createTrackLibrary();
 const copy=library.createPrepared({name:'Copie interrompue',geometry:{points:[{x:70,y:242},{x:92,y:214},{x:180,y:170,breakBefore:true},{x:205,y:145}]}});
 const row=trackListView(library.list(),[]).find(item=>item.libraryId===copy.id);
 const html=TrackDetailScreen(row);
 assert.equal((html.match(/data-map-path="reference"/g)||[]).length,2);
 assert.doesNotMatch(html,/L 92 214 L 180 170/);
});

test('track detail keeps unavailable geometry explicit and never invents session traces',()=>{
 const library=createTrackLibrary(),catalog=createSessionCatalog();catalog.capture(recordWithPaths('DEBRIEF',false));
 const rows=trackListView(library.list(),catalog.list());
 const prepared=rows.find(row=>row.kind==='prepared');
 assert.equal(trackDetailView(rows,prepared.id).geometryAvailable,false);
 assert.equal(rows.some(row=>row.kind==='pose'||row.kind==='search'),false);
 const html=TrackDetailScreen(trackDetailView(rows,prepared.id));
 assert.match(html,/Aucune donnée géométrique disponible/);
 assert.match(html,/data-track-rename="track-clairiere"/);
 assert.match(html,/data-track-rename="track-clairiere"/);
});

test('archived session provenance is marked and detail preserves source session',()=>{
 const record=recordWithPaths('ARCHIVED'),catalog=createSessionCatalog();catalog.capture(record);
 const rows=trackListView([],catalog.list());
 assert.ok(rows.every(row=>/archivée/i.test(row.provenance)));
 const detail=trackDetailView(rows,rows[0].id);
 assert.equal(detail.sessionId,record.session.id);
 assert.match(TrackListScreen(rows),/Mes pistes/);
});

test('Mes pistes separates session history and replay from the prepared-track editor',()=>{
 const html=TrackListScreen([], [{id:'done-1',title:'Sous les pins',status:'Terminée',dogName:'Nox',date:'Aujourd’hui · 08:30',href:'/sessions/done-1',replayHref:'/sessions/done-1/replay'}]);
 assert.match(html,/Historique terrain/);
 assert.match(html,/SESSIONS TERMINÉES · LECTURE SEULE/);
 assert.match(html,/href="\/sessions\/done-1">Détail/);
 assert.match(html,/href="\/sessions\/done-1\/replay">Replay/);
 assert.match(html,/Tracés consultables/);
 assert.match(html,/href="\/track-builder">Ouvrir le créateur de tracé/);
 assert.doesNotMatch(html,/href="\/track-builder"[^>]*>.*Historique/);
});

test('Mes pistes labels replay unavailable for summary-only history instead of linking to a missing replay',()=>{
 const html=TrackListScreen([], [{id:'demo:recent',title:'Lisière',status:'Terminée',dogName:'Nox',date:'Hier',href:'/sessions/demo%3Arecent',replayHref:null}]);
 assert.match(html,/Lisière/);
 assert.match(html,/Replay indisponible/);
 assert.doesNotMatch(html,/href="\/sessions\/demo%3Arecent\/replay"/);
});
