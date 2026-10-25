import test from 'node:test';import assert from 'node:assert/strict';
import {pisteSessionRows,TrackListScreen} from '../src/tracks-screen.mjs';
import {createPisteSelection} from '../src/piste-bulk.mjs';
const rows=[{id:'old',kind:'coaching',status:'Interrompue',dogId:'a',dogName:'A',sortAt:10},{id:'new',kind:'operational',status:'Terminée',dogId:'b',dogName:'B',sortAt:20},{id:'unknown',kind:'coaching',status:'Terminée'}];
test('newest first, unknown last, dog/type/status and oldest order',()=>{
 assert.deepEqual(pisteSessionRows(rows).map(r=>r.id),['new','old','unknown']);
 assert.deepEqual(pisteSessionRows(rows,{dogId:'a',status:'Interrompues',source:'coaching'}).map(r=>r.id),['old']);
 assert.deepEqual(pisteSessionRows(rows,{sort:'oldest'}).map(r=>r.id),['old','new','unknown']);
});
test('selection intersects current visible results on every refresh and resets account/category',()=>{
 const s=createPisteSelection();s.reconcile('owner:operational',rows);s.selectAll();assert.equal(s.ids().length,3);
 s.reconcile('owner:operational',[rows[0]]);assert.deepEqual(s.ids(),['old']);
 s.reconcile('other:operational',rows);assert.deepEqual(s.ids(),[]);s.selectAll();s.reconcile('other:prepared',rows);assert.deepEqual(s.ids(),[]);
});
test('separate sections, exact category counts, accessible selection and dog/date filters',()=>{
 const html=TrackListScreen([],rows,{selectionMode:true,selectedIds:['old']});
 for(const text of ['data-piste-select','Tout sélectionner','Tout désélectionner','Supprimer la sélection','name="dogId"','name="sort"','data-piste-group="operational"','data-piste-group="coaching"'])assert.ok(html.includes(text),text);
 assert.match(html,/Pistes opérationnelles.*3/s);
});
import {createTrackLibrary} from '../src/track-library.mjs';
test('prepared deletion refuses stale tabs instead of overwriting newly added tracks',()=>{const saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},args={ownerId:'owner',storage};const first=createTrackLibrary(args);const one=first.createPrepared({name:'One',geometry:{points:[{x:1,y:1},{x:2,y:2}]}});const second=createTrackLibrary(args);second.createPrepared({name:'Two',geometry:{points:[{x:1,y:1},{x:2,y:2}]}});assert.throws(()=>first.remove(one.id),/autre onglet/);assert.equal(createTrackLibrary(args).list().filter(t=>t.ownerId==='self').length,2);});
test('only explicitly linked training sessions move to Entraînements',async()=>{const {classifyPisteSessions}=await import('../src/piste-bulk.mjs');const classified=classifyPisteSessions(rows,new Set(['old']));assert.equal(classified[0].kind,'training');assert.equal(classified[0].sessionType,'coaching');assert.equal(classified[1].kind,'operational');assert.equal(pisteSessionRows(classified,{category:'training'}).length,1);assert.equal(pisteSessionRows(classified).length,2);});
