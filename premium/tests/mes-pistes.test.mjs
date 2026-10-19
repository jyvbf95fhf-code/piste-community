import test from 'node:test';
import assert from 'node:assert/strict';
import * as tracks from '../src/tracks-screen.mjs';
const rows=[{id:'o',kind:'operational',title:'Mission Nox',status:'En cours',href:'/operational/missions/o'},{id:'c',kind:'coaching',source:'shared',title:'Coaching Nox',status:'Archivée',href:'/coaching/session?session=c'},{id:'t',kind:'training',title:'Entraînement forêt',status:'Terminée',href:'/sessions/t'}];
test('real sessions are classified by explicit kind and filtered without changing cockpit links',()=>{
 assert.equal(typeof tracks.pisteSessionRows,'function');
 assert.deepEqual(tracks.pisteSessionRows(rows).map(r=>r.id),['o','c']);
 assert.deepEqual(tracks.pisteSessionRows(rows,{category:'training'}).map(r=>r.id),['t']);
 assert.deepEqual(tracks.pisteSessionRows(rows,{status:'Archivées',query:'nox'}).map(r=>r.id),['c']);
 assert.deepEqual(tracks.pisteSessionRows(rows,{source:'operational'}).map(r=>r.href),['/operational/missions/o']);
 assert.deepEqual(tracks.pisteSessionRows(rows,{status:'Terminées'}),[]);
});
test('Mes pistes has two categories, a GET search and no creator shortcut',()=>{
 const html=tracks.TrackListScreen([],rows,{category:'training',query:'<Nox>'});
 assert.match(html,/Pistes opérationnelles/);assert.match(html,/Entraînements/);
 assert.match(html,/method="get"/);assert.match(html,/&lt;Nox&gt;/);
 assert.doesNotMatch(html,/href="\/track-builder"|MOCK EN MÉMOIRE/);
 assert.match(html,/source de séances d’entraînement/);
});
const dossier=await import('../src/session-dossier.mjs').catch(()=>({}));
const gps={provenance:'device-geolocation',distanceM:123,elapsedMs:30000,startedAt:100000,endedAt:130000,segments:[[{latitude:48,longitude:7},{latitude:48.001,longitude:7.001}]]};
const projection={id:'shared',phase:'ARCHIVED',role:'driver',mode:'full_blind',dog:'Nox',pose:gps,search:gps,searchActiveMs:20000,team:[],notes:[{text:'<note>',authorName:'Coach'}],events:[{text:'Fin de recherche',at:130000,source:'driver'}]};
test('dossier reads the server projection, leaves unknown values unavailable and exposes no mutations',()=>{
 assert.equal(typeof dossier.sharedSessionDossier,'function');
 const v=dossier.sharedSessionDossier(projection),html=dossier.SessionDossierScreen(v,{tab:'report'});
 assert.match(html,/Rapport de session/);assert.match(html,/data-dossier-print/);assert.match(html,/&lt;note&gt;/);assert.match(html,/Indisponible/);
 assert.doesNotMatch(html,/data-remote=|data-remote-form|data-gps-live|textarea|data-debrief="archive"/);
 assert.equal(v.stats.find(r=>r[0]==='Distance de recherche')[1],'0,12 km');
});
test('a live blind projection never becomes a dossier or print report',()=>{
 assert.equal(dossier.sharedSessionDossier({...projection,phase:'SEARCH_RUNNING'}),null);
 assert.doesNotMatch(dossier.SessionDossierScreen(null),/data-gps-pose|data-dossier-print/);
});
test('missing GPS never becomes zero or fabricated replay, and projection is not mutated',()=>{
 const p={...projection,pose:null,search:null,searchActiveMs:null},before=structuredClone(p);
 const v=dossier.sharedSessionDossier(p);assert.equal(v.replayAvailable,false);
 assert.match(dossier.SessionDossierScreen(v,{tab:'replay'}),/Relecture indisponible/);
 assert.deepEqual(p,before);assert.equal(v.stats.find(r=>r[0]==='Distance de recherche')[1],'Indisponible');
});
