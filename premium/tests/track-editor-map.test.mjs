import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTrackDraft,addTrackPoint,setTrackMode,setTrackPointKind} from '../src/track-editor.mjs';
import {TrackEditorMap} from '../src/track-editor-map.mjs';

test('empty editor map is fictional, accessible and uses only local illustration',()=>{
 const html=TrackEditorMap(createTrackDraft());
 assert.match(html,/viewBox="0 0 360 300"/);
 assert.match(html,/CARTE DE DÉMONSTRATION/);
 assert.match(html,/data-editor-basemap="standard"/);
 assert.match(html,/Aucun fond cartographique réel/);
 assert.match(html,/track-editor-map-imagery/);
 assert.match(html,/\/src\/assets\/session-satellite-forest\.png/);
 assert.match(html,/track-editor-map-overlay/);
 assert.doesNotMatch(html,/<img|https?:\/\//i);
});

test('departure, via and arrival markers have distinct roles and accessible 44px hit areas',()=>{
 let draft=createTrackDraft();draft=addTrackPoint(draft,{x:20,y:30});draft=addTrackPoint(draft,{x:60,y:80});draft=addTrackPoint(draft,{x:140,y:180,kind:'arrival'});
 const html=TrackEditorMap(draft,{selectedPointId:draft.points[1].id});
 assert.equal((html.match(/data-editor-point-id=/g)||[]).length,3);
 for(const [kind,label] of [['start','Départ'],['via','Point intermédiaire'],['arrival','Arrivée']])assert.match(html,new RegExp(`data-point-kind="${kind}"[^>]*aria-label="${label}`));
 assert.match(html,new RegExp(`data-editor-point-id="${draft.points[1].id}"[^>]*data-selected="true"`));
 assert.equal((html.match(/class="track-editor-point-hit" r="28"/g)||[]).length,3);
 assert.match(html,/data-touch-target="44px-minimum"/);
});

test('each segment uses its saved mode and Rues-chemins is clearly only a visual simulation',()=>{
 let draft=createTrackDraft();draft=addTrackPoint(draft,{x:10,y:10});draft=setTrackMode(draft,'follow');draft=addTrackPoint(draft,{x:80,y:60});draft=setTrackMode(draft,'free');draft=addTrackPoint(draft,{x:160,y:90});draft=setTrackPointKind(draft,draft.points.at(-1).id,'arrival');
 const html=TrackEditorMap(draft);
 assert.match(html,/data-editor-segment="1" data-mode="follow"[^>]*d="M10 10 Q/);
 assert.match(html,/data-editor-segment="2" data-mode="free"[^>]*d="M80 60 L160 90"/);
 assert.ok(html.includes('Rues / chemins · simulation'));
});

test('copied interruptions remain separate polylines on the editor map',()=>{
 const draft=createTrackDraft({copySource:{name:'Trace',points:[{id:'a',x:10,y:10},{id:'b',x:30,y:30},{id:'c',x:200,y:200,breakBefore:true},{id:'d',x:220,y:220}]}});
 const html=TrackEditorMap(draft);
 assert.equal((html.match(/data-editor-segment=/g)||[]).length,2);
 assert.doesNotMatch(html,/M30 30 L200 200/);
});

test('mock basemap selection is represented by a local visual class',()=>{
 for(const basemap of ['standard','topographic','satellite']){
  const html=TrackEditorMap({...createTrackDraft(),basemap});
  assert.match(html,new RegExp(`track-editor-map--${basemap}`));
  assert.match(html,new RegExp(`data-editor-basemap="${basemap}"`));
 }
});
