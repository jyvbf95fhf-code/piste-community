import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrackLibrary} from '../src/track-library.mjs';
import {trackListView} from '../src/session-views.mjs';
import {TrackListScreen,TrackDetailScreen} from '../src/tracks-screen.mjs';
const disk=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const memory={version:1,id:'plan-1',ownerId:'alice',dogId:'dog-a',createdAt:'2026-10-01T08:00:00Z',level:null,skill:null,objective:'Travailler les angles',criteria:['Rester engagé'],instructions:['Préparer le départ'],observations:['Observer le rythme'],limits:['Préparation déclarée'],parameters:{distanceM:320,turns:2},schedule:null,weather:null};
const plan={name:'Angles du bois',dogId:'dog-a',notes:'Sol humide',geometry:{points:[{x:7,y:48,space:'wgs84'},{x:7.001,y:48.001,space:'wgs84'}]},trainingMemory:memory};
test('account-backed library denies edits to foreign demonstration records',()=>{
 const l=createTrackLibrary({storage:disk(),ownerId:'alice'});
 for(const mutate of [()=>l.rename('track-clairiere','Autre'),()=>l.updatePrepared('track-clairiere',{notes:'Autre'}),()=>l.remove('track-clairiere')])assert.throws(mutate,/compte|lecture seule/);
});
test('prepared detail exposes pedagogy and explicit reuse without marking a session completed',()=>{
 const l=createTrackLibrary({storage:disk(),ownerId:'alice'}),saved=l.createPrepared(plan),rows=trackListView(l.list());
 const row=rows.find(r=>r.libraryId===saved.id),html=TrackDetailScreen(row);
 assert.equal(row.trainingMemory.objective,memory.objective);assert.equal(row.lifecycle,'prepared');
 assert.match(html,/Travailler les angles/);assert.match(html,/Rester engagé/);assert.match(html,/data-prepared-action="coaching"/);
 assert.match(html,/Préparation enregistrée/);assert.match(html,/Sauvegardes cloud/);assert.match(html,/sauvegardez le tracé et son chien/);
 assert.doesNotMatch(html,/Séance terminée/);
});
test('prepared library category lists preparations independently of completed sessions and drafts',()=>{
 const l=createTrackLibrary(),saved=l.createPrepared(plan),rows=trackListView(l.list());
 const html=TrackListScreen(rows,[{id:'done',kind:'coaching',title:'Séance terminée unique',status:'Terminée',href:'/sessions/done'}],{category:'prepared'});
 assert.match(html,/Pistes préparées/);assert.match(html,/Angles du bois/);assert.doesNotMatch(html,/Séance terminée unique/);
 assert.match(html,/Brouillons/);assert.match(html,/Séances réalisées/);
});

test('duplicating a prepared plan clones its pedagogy with a distinct identity and leaves its source intact',()=>{
 const storage=disk(),l=createTrackLibrary({storage,ownerId:'alice'}),original=l.createPrepared(plan),duplicate=l.duplicatePreparedPlan(original.id);
 assert.notEqual(duplicate.id,original.id);assert.notEqual(duplicate.trainingMemory.id,original.trainingMemory.id);
 assert.equal(duplicate.trainingMemory.objective,original.trainingMemory.objective);assert.deepEqual(l.get(original.id),original);
 duplicate.trainingMemory.criteria.push('Autre');duplicate.geometry.points[0].x=8;
 assert.deepEqual(l.get(original.id),original);assert.equal(createTrackLibrary({storage,ownerId:'alice'}).get(duplicate.id).trainingMemory.criteria.length,1);
 assert.throws(()=>createTrackLibrary({storage,ownerId:'bob'}).get(duplicate.id));
});
