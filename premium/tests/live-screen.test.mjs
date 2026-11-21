import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveScreen,LiveDetailScreen} from '../src/live-screen.mjs';

test('Live excludes own observer links and groups authorized contacts and invitations',()=>{
 const html=LiveScreen({ownSessions:[{sessionId:'mine',sessionType:'coaching',title:'Nox'}],contactSessions:[{sessionId:'ops-1',sessionType:'ops',title:'Trace terrain'}],invitations:[{sessionId:'invite',sessionType:'coaching'}]});
 assert.doesNotMatch(html,/Mes sessions en cours|Nox|href="\/live\/coaching\/mine"/);assert.match(html,/À observer/);assert.match(html,/Invitations à rejoindre/);
 assert.match(html,/Observateur de trace/);assert.match(html,/Voir le Live/);
});

test('Coaching and OPS detail render read-only projections without mutation controls',()=>{
 const coaching=LiveDetailScreen({sessionType:'coaching',role:'observer',roleLabel:'Observateur',readOnly:true,modeLabel:'Double aveugle',phase:'SEARCH_RUNNING',map:{paths:[]}});
 assert.match(coaching,/data-live-role="observer"/);assert.match(coaching,/Double aveugle/);assert.doesNotMatch(coaching,/data-coaching=|data-operational-action/);
 const ops=LiveDetailScreen({sessionType:'ops',role:'ops_trace_observer',roleLabel:'Observateur de trace OPS',readOnly:true,state:'En cours',trace:[{x:10,y:20},{x:30,y:40}],distance:23,trackingSeconds:12,trackAge:'Non renseigné',corridor:{label:'Couloir estimé'},events:[]});
 assert.match(ops,/Couloir estimé/);assert.match(ops,/data-real-map-reader/);assert.doesNotMatch(ops,/data-map-path|Trace mock/);assert.doesNotMatch(ops,/data-coaching=|data-operational-action|Fiche mission/);
 assert.match(LiveDetailScreen({sessionType:'ops',roleLabel:'Observateur de trace OPS',trace:[],trackAge:'Non renseigné'}),/Positions et tracés géographiques indisponibles|Aucune trace de progression disponible/);
});

test('denied or revoked Live route displays an unavailable state',()=>{
 const html=LiveDetailScreen(null);assert.match(html,/Live indisponible/);assert.match(html,/accès a été révoqué/);assert.doesNotMatch(html,/Voir le Live/);
});

test('position age uses the last GPS capture and becomes stale without a new frame', async ()=>{
 const {livePositionFreshness}=await import('../src/live-activity.mjs');
 const now=100000;
 assert.equal(livePositionFreshness(null,now).state,'waiting');
 assert.equal(livePositionFreshness(now+6000,now).state,'waiting');
 assert.deepEqual(livePositionFreshness(now-8000,now),{state:'fresh',label:'Position reçue il y a 8 s'});
 assert.equal(livePositionFreshness(now-59999,now).state,'fresh');
 assert.equal(livePositionFreshness(now-60000,now).state,'stale');
});

test('fullscreen and GPS freshness appear only for readable active Live maps',()=>{
 const active=LiveDetailScreen({sessionType:'ops',sessionId:'ops-session',distance:125,trackingSeconds:63});
 assert.match(active,/data-live-map-expand/);
 assert.match(active,/data-gps-center/);
 assert.match(active,/En attente d’une position GPS/);
 assert.match(active,/125 m · 1 min 3 s/);
 for(const projection of [null,{ended:true}])assert.doesNotMatch(LiveDetailScreen(projection),/data-live-map-expand/);
});
