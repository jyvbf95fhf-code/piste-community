import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as coaching from '../src/coaching.mjs';
import * as tracks from '../src/track-library.mjs';
const draft=()=>coaching.createDraft({name:'Sébastien'},[{id:'nox',name:'Nox'}]);
const library=()=>{assert.equal(typeof tracks.createTrackLibrary,'function','memory track library is required');return tracks.createTrackLibrary();};
test('track builder names, renames, deletes and imports only fixture metadata in memory',()=>{
 const store=library(),initial=store.list().length;
 const track=store.create('  Clairière du soir  ');assert.equal(track.name,'Clairière du soir');assert.equal(track.source,'draw');
 store.rename(track.id,'Nouveau nom');assert.equal(store.list().find(t=>t.id===track.id).name,'Nouveau nom');
 assert.throws(()=>store.create('  '),/nom/i);assert.throws(()=>store.importFixture('arbitrary.gpx'),/fichier/i);
 const gpx=store.importFixture('gpx-pins');assert.equal(gpx.fileName,'lisiere-des-pins.gpx');assert.equal(gpx.source,'gpx');assert.ok(!('coordinates' in gpx));
 store.remove(track.id);assert.equal(store.list().length,initial+1);assert.equal(tracks.createTrackLibrary().list().length,initial);
 const copy=store.list();copy[0].name='mutated';assert.notEqual(store.list()[0].name,'mutated');
});
test('prepared and GPX add a substep before dog and participants; direct and none do not',()=>{
 library();for(const [type,substep] of [['prepared','prepare'],['gpx','prepare'],['direct',null],['none',null]]){
 const d=coaching.updateDraft(draft(),{mode:'normal',traceType:type});assert.equal(coaching.steps(d).includes('prepare'),!!substep);
 if(substep)assert.ok(coaching.steps(d).indexOf('prepare')<coaching.steps(d).indexOf('roles'));
 }
});
test('a builder track is selected in coaching, survives edits, follows rename and must be replaced if deleted',()=>{
 const store=library(),track=store.create('Parcours créé');let d=coaching.updateDraft(draft(),{mode:'normal',traceType:'prepared'});
 assert.ok(coaching.validateDraft(d).some(e=>e.code==='preparation_required'));
 d=coaching.selectPreparation(d,track);assert.equal(coaching.createSession(d).session.preparation.name,'Parcours créé');
 store.rename(track.id,'Parcours renommé');d=coaching.syncPreparation(d,store.list());assert.equal(d.preparationTrack.name,'Parcours renommé');
 store.remove(track.id);d=coaching.syncPreparation(d,store.list());assert.equal(d.preparationTrack,null);assert.ok(coaching.validateDraft(d).some(e=>e.code==='preparation_required'));
});
test('multiple observers are deduplicated and read-only, with visibility per mode',()=>{
 library();let d=coaching.updateDraft(draft(),{mode:'normal',traceType:'direct'});d=coaching.setObservers(d,['lea','alex','lea']);assert.deepEqual(d.roles.observers,['lea','alex']);
 const result=coaching.createSession(d);assert.deepEqual(result.session.roles.observers,['lea','alex']);assert.equal(result.session.participants.filter(p=>p.id==='alex').length,1);
 for(const [mode,read] of [['normal',true],['simple_blind',true],['full_blind',false]])assert.deepEqual(coaching.roleCapabilities(mode,'observer'),{readReference:read,prepare:false,edit:false,manage:false,create:false});
 assert.throws(()=>coaching.setObservers(d,['unknown']),/participant/i);
 d=coaching.updateDraft(coaching.setObservers(d,['self','lea']),{mode:'simple_blind'});assert.ok(coaching.validateDraft(d).some(e=>e.code==='driver_observer_conflict'));
});
test('blind preparation delegates and never returns names to a blind creator; known tracks cannot become unknown by changing mode',()=>{
 const store=library();let d=coaching.updateDraft(draft(),{mode:'full_blind',traceType:'prepared'});assert.equal(coaching.preparation(d),'delegated');assert.deepEqual(coaching.validateDraft(d),[]);
 assert.throws(()=>coaching.selectPreparation(d,store.list()[0]),/visibilité/i);assert.equal(coaching.referenceLabel(d),'Choix réservé au Traceur');
 d=coaching.updateDraft(d,{mode:'normal'});d=coaching.selectPreparation(d,store.list()[0]);d=coaching.updateDraft(d,{mode:'full_blind'});
 assert.ok(coaching.validateDraft(d).some(e=>e.code==='driver_knows_selected_track'));assert.equal(coaching.referenceLabel(d),'Tracé réservé au Traceur');
 d=coaching.selectCreatorRole(d,'traceur');d=coaching.assignRole(d,'driver','camille');assert.deepEqual(coaching.validateDraft(d),[]);
});
test('GPX mock selection is required for an authorized creator and shown in the session snapshot',()=>{
 library();let d=coaching.updateDraft(draft(),{mode:'normal',traceType:'gpx'});assert.ok(coaching.validateDraft(d).some(e=>e.code==='preparation_required'));
 d=coaching.selectPreparation(d,tracks.gpxFixtures[0]);const s=coaching.createSession(d).session;assert.equal(s.preparation.fileName,'lisiere-des-pins.gpx');
});
test('session code and conceptual invitation are stable, unique in memory and contain no track or participant data',()=>{
 library();const ready=coaching.updateDraft(draft(),{mode:'normal',traceType:'direct'}),a=coaching.createSession(ready),b=coaching.createSession(ready);
 assert.match(a.session.code,/^PC-[A-Z0-9]{4}$/);assert.notEqual(a.session.code,b.session.code);assert.equal(coaching.createSession(a).session.code,a.session.code);
 const share=coaching.mockInvitation(a.session);assert.equal(share.path,`/new-session?mock-invite=${a.session.code}`);assert.match(share.text,/mock/i);assert.doesNotMatch(share.text,/Nox|Sébastien|camille|traceur/i);
});

test('starting from a builder track keeps the mode explicit and records the creator’s prior knowledge',()=>{
 const store=library(),track=store.create('Ma piste');const d=coaching.draftFromTrack({name:'Sébastien'},[{id:'nox',name:'Nox'}],track);
 assert.equal(d.mode,null);assert.equal(d.traceType,'prepared');assert.equal(d.preparationTrack.name,'Ma piste');assert.ok(d.knownPeople.includes('self'));
 assert.ok(coaching.validateDraft(coaching.updateDraft(d,{mode:'full_blind'})).some(e=>e.code==='driver_knows_selected_track'));
});

test('geometry-aware prepared tracks preserve the Coaching contract and clone their geometry',()=>{
 const store=library(),points=[{id:'p1',x:20,y:30,kind:'start',incomingMode:null},{id:'p2',x:90,y:100,kind:'arrival',incomingMode:'follow'}];
 const saved=store.createPrepared({name:'Crête mock',description:'Boucle',category:'Piste',difficulty:'Intermédiaire',dogId:'nox',notes:'À adapter',source:'draw',provenance:'manual',geometry:{points}});
 points[0].x=250;saved.geometry.points[1].y=220;
 const stored=store.get(saved.id);
 assert.equal(stored.name,'Crête mock');assert.equal(stored.source,'draw');assert.equal(stored.start.space,'mock-map');
 assert.equal(stored.geometry.points[0].x,20);assert.equal(stored.geometry.points[1].y,100);
 const selected=coaching.selectPreparation(coaching.updateDraft(draft(),{mode:'normal',traceType:'prepared'}),stored);
 assert.equal(coaching.createSession(selected).session.preparation.name,'Crête mock');
 const edited=store.updatePrepared(saved.id,{name:'Crête révisée',notes:'Terrain humide'});
 assert.equal(edited.name,'Crête révisée');assert.equal(store.get(saved.id).geometry.points[0].x,20);
 const duplicate=store.duplicatePrepared(saved.id,{name:'Copie de crête'});
 assert.notEqual(duplicate.id,saved.id);assert.equal(duplicate.provenance,'copy');assert.equal(duplicate.geometry.points[1].y,100);
 duplicate.geometry.points[0].x=330;assert.equal(store.get(saved.id).geometry.points[0].x,20);
});

test('copying an archived trace creates an editable copy and never changes its source points',()=>{
 const store=library(),sourcePoints=[{id:'pose-1',x:25,y:35,kind:'start',incomingMode:null},{id:'pose-2',x:130,y:150,kind:'arrival',incomingMode:'free'}];
 const copy=store.createCopy({name:'Copie · pose archivée',sourceId:'session:archive-1:pose',sourceKind:'pose',points:sourcePoints});
 copy.geometry.points[0].x=300;sourcePoints[1].y=260;
 assert.equal(copy.source,'draw');assert.equal(copy.provenance,'copy');assert.equal(copy.copiedFrom.id,'session:archive-1:pose');
 assert.equal(store.get(copy.id).geometry.points[0].x,25);assert.equal(store.get(copy.id).geometry.points[1].y,150);
 assert.throws(()=>store.createCopy({name:'Copie sans géométrie',sourceId:'session:summary',sourceKind:'pose',points:[]}),/géométrie|points/i);
 assert.throws(()=>store.updatePrepared('missing',{name:'Inconnu'}),/disponible/i);
});

test('track-builder route and Home entry preserve the grid and blind summaries hide preparation names',async()=>{
 const {HomeScreen,PlaceholderScreen,routes}=await import('../src/screens.mjs');
 const {CoachingScreen}=await import('../src/coaching-screen.mjs');
 const html=HomeScreen();assert.ok(routes['/track-builder']);assert.match(PlaceholderScreen('/track-builder'),/Mes tracés/);
 assert.equal((html.match(/class="feature-tile/g)||[]).length,4);
 assert.ok(html.indexOf('track-builder-entry')>html.indexOf('feature-grid')&&html.indexOf('track-builder-entry')<html.indexOf('active-sessions'));
 let d=coaching.updateDraft(draft(),{mode:'normal',traceType:'prepared'});d=coaching.selectPreparation(d,library().list()[0]);d=coaching.updateDraft(d,{mode:'full_blind'});d=coaching.goToStep(d,'review');
 assert.doesNotMatch(CoachingScreen(d),/La clairière/);assert.match(CoachingScreen(d),/Tracé réservé au Traceur/);
});
