import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTrackDraft,addTrackPoint,setTrackMode,setTrackPointKind,trackDraftMetrics} from '../src/track-editor.mjs';
const screen=await import('../src/track-editor-screen.mjs').catch(()=>({}));
const {TrackEditorScreen}=screen;

test('creator presents mock place search and local Standard, Topographique and Satellite controls',()=>{
 const html=TrackEditorScreen({draft:createTrackDraft(),results:[{id:'pin-forest',label:'Forêt des pins · démo'}]});
 assert.match(html,/Créateur de tracé/);
 assert.match(html,/Rechercher une commune, adresse ou lieu/);
 assert.match(html,/Forêt des pins · démo/);
 assert.match(html,/Aucun géocodage réel/);
 for(const base of ['standard','topographic','satellite'])assert.match(html,new RegExp(`data-editor-basemap-choice="${base}"`));
 assert.match(html,/data-editor-action="recenter"/);
 assert.match(html,/class="back-link" href="\/"/);
 assert.match(html,/class="sessions-heading track-editor-heading"/);
 assert.match(html,/track-editor-search-icon/);
 assert.match(html,/track-editor-basemap-icon/);
 assert.match(html,/button-gold[^>]*data-editor-action="search"/);
});

test('creator adds visual-only map orientation and clear role hierarchy for editor controls',()=>{
 let draft=createTrackDraft();draft=addTrackPoint(draft,{x:20,y:20});draft=addTrackPoint(draft,{x:90,y:120});
 const html=TrackEditorScreen({draft});
 for(const marker of ['track-editor-map-tools','track-editor-compass','track-editor-zoom-mock','track-editor-point-kind','track-editor-metric-icon'])assert.ok(html.includes(marker),`${marker} is present`);
 assert.match(html,/Ajouter un point/);assert.match(html,/Placer l’arrivée/);
});

test('creator exposes active Libre and Rues-chemins modes and labels each segment estimate as mock',()=>{
 let draft=createTrackDraft();draft=addTrackPoint(draft,{x:20,y:20});draft=setTrackMode(draft,'follow');draft=addTrackPoint(draft,{x:90,y:120});draft=setTrackPointKind(draft,draft.points.at(-1).id,'arrival');
 const html=TrackEditorScreen({draft,metrics:trackDraftMetrics(draft)});
 assert.match(html,/data-editor-mode="free"/);
 assert.match(html,/data-editor-mode="follow"/);
 assert.match(html,/Libre/);assert.ok(html.includes('Rues / chemins'));
 assert.match(html,/Estimation du tracé · mock/);
 assert.match(html,/data-editor-action="undo"/);
 assert.match(html,/data-editor-action="clear"/);
 assert.match(html,/data-editor-action="remove-point"/);
});

test('metadata stage includes optional session metadata and a local dog selector',()=>{
 const html=TrackEditorScreen({draft:createTrackDraft(),dogs:[{id:'nox',name:'Nox'}]});
 for(const field of ['name','description','category','difficulty','dogId','notes'])assert.match(html,new RegExp(`name="${field}"`));
 assert.match(html,/Nox/);
 assert.match(html,/Préparé manuellement/);
 assert.match(html,/Enregistrer le tracé/);
});

test('empty route reports unavailable length and leaves the save action unavailable',()=>{
 const html=TrackEditorScreen({draft:createTrackDraft(),metrics:trackDraftMetrics(createTrackDraft())});
 assert.match(html,/Distance estimée indisponible/);
 assert.match(html,/data-editor-action="save"[^>]*disabled/);
 assert.match(html,/Ajoutez un départ puis une arrivée/);
});

test('screen communicates missing session copy geometry and does not offer real GPX upload',()=>{
 const html=TrackEditorScreen({draft:createTrackDraft({copySource:{name:'Ancienne pose',sourceId:'session:old',points:[]}}),error:'Géométrie indisponible pour cette trace.'});
 assert.match(html,/Géométrie indisponible/);
 assert.match(html,/Copie d’un tracé/);
 assert.match(html,/Aucun fichier GPX n’est lu ou analysé/);
 assert.doesNotMatch(html,/<input[^>]+type="file"|enctype=/i);
});
