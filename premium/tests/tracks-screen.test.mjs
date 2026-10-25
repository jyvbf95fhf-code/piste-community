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
 const draft=createTrackDraft({copySource:{...pose.copySource,name:pose.name}});
 assert.equal(draft.coordinateSpace,'mock-map');assert.equal(draft.points[2].breakBefore,true);
 assert.match(map,/sans coordonnées géographiques/);
 const payload=JSON.parse(map.match(/data-route="([^"]+)"/)[1].replaceAll('&quot;','"'));
 assert.deepEqual(payload.points,[]);assert.equal(payload.readOnly,true);
 assert.doesNotMatch(map,/data-editor-segment=|M92 214 L180 170/);
});

test('prepared geographic copy detail preserves interrupted segments in its read-only real map',()=>{
 const library=createTrackLibrary();
 const copy=library.createPrepared({name:'Copie interrompue',geometry:{points:[{space:'wgs84',x:7.01,y:48.01},{space:'wgs84',x:7.02,y:48.02},{space:'wgs84',x:7.03,y:48.03,breakBefore:true},{space:'wgs84',x:7.04,y:48.04}]}});
 const row=trackListView(library.list(),[]).find(item=>item.libraryId===copy.id);
 const html=TrackDetailScreen(row);
 assert.match(html,/data-editor-real-map/);assert.match(html,/data-readonly="true"/);
 const route=JSON.parse(html.match(/data-route="([^"]+)"/)[1].replaceAll('&quot;','"'));
 assert.equal(route.coordinateSpace,'wgs84');assert.equal(route.points.length,4);assert.equal(route.points[2].breakBefore,true);
 assert.deepEqual(route.points.map(({x,y})=>[x,y]),[[7.01,48.01],[7.02,48.02],[7.03,48.03],[7.04,48.04]]);
 assert.doesNotMatch(html,/data-map-path=|prep-map-canvas/);
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

test('Mes pistes separates operational sessions, training and prepared records in explicit categories',()=>{
 const sessions=[{id:'done-1',kind:'coaching',title:'Sous les pins',status:'Terminée',dogName:'Nox',date:'Aujourd’hui · 08:30',href:'/sessions/done-1'}];
 const library=createTrackLibrary(),rows=trackListView(library.list(),[]);
 const html=TrackListScreen(rows,sessions);
 assert.match(html,/OPS et Coaching/);assert.match(html,/href="\/sessions\/done-1">Ouvrir le dossier/);
 for(const category of ['operational','training','prepared'])assert.match(html,new RegExp(`href="/tracks\\?category=${category}&amp;`));
 assert.match(html,/data-piste-group="coaching"/);assert.doesNotMatch(html,/data-prepared-library|href="\/track-builder"/);
 const prepared=TrackListScreen(rows,sessions,{category:'prepared'});
 assert.match(prepared,/data-prepared-library/);assert.match(prepared,/Préparations et brouillons enregistrés/);assert.match(prepared,/data-track-id="/);
 assert.doesNotMatch(prepared,/data-history-session="done-1"/);
 const training=TrackListScreen(rows,sessions,{category:'training'});
 assert.match(training,/Séances d’entraînement/);assert.doesNotMatch(training,/data-history-session="done-1"|data-prepared-library/);
});

test('Mes pistes keeps summary-only history without fabricating a replay',()=>{
 const html=TrackListScreen([], [{id:'demo:recent',kind:'summary-demo',title:'Lisière',status:'Terminée',dogName:'Nox',date:'Hier',href:'/sessions/demo%3Arecent',replayHref:null}]);
 assert.match(html,/Lisière/);
 assert.doesNotMatch(html,/href="\/sessions\/demo%3Arecent\/replay"|tab=replay/);
});
