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

test('OPS wall display separates a declared pause from stale GPS and shows the shared final result',()=>{
 const base={sessionType:'ops',sessionId:'ops-1',distance:125,trackingSeconds:63};
 const pause=LiveDetailScreen({...base,state:'Pause',lastPositionAt:1000},{wide:true,now:17000});
 assert.match(pause,/live-observer-wide/);
 assert.match(pause,/En pause/);
 assert.match(pause,/Position GPS non actualisée/);
 assert.match(pause,/data-gps-follow-session="ops-1"/);
 assert.match(pause,/1 min 3 s/);
 const waiting=LiveDetailScreen({...base,ended:true,missionFinished:true},{wide:true});
 assert.match(waiting,/Résultat en attente/);
 const final=LiveDetailScreen({...base,ended:true,missionFinished:true,outcome:'positive'},{wide:true});
 assert.match(final,/Personne retrouvée par le chien/);
 assert.match(final,/125 m/);
 assert.doesNotMatch(LiveDetailScreen({...base,ended:true}),/Résultat en attente/);
 assert.doesNotMatch(LiveDetailScreen({sessionType:'coaching'},{wide:true}),/live-observer-wide/);
});

test('Coaching mode badges are explicit in the Live directory and detail, with no OPS badge',()=>{
 const modes=[['normal','Normal'],['simple_blind','Simple aveugle'],['full_blind','Double aveugle']];
 const sessions=modes.map(([mode])=>({sessionId:mode,sessionType:'coaching',mode}));
 const directory=LiveScreen({contactSessions:[...sessions,{sessionId:'ops',sessionType:'ops',mode:'normal'}]});
 assert.equal((directory.match(/data-live-coaching-mode/g)||[]).length,3);
 for(const [mode,label] of modes){
  assert.match(directory,new RegExp('data-live-coaching-mode><span class="badge neutral">'+label+'</span>'));
  assert.match(LiveDetailScreen({sessionType:'coaching',mode,map:{}}),new RegExp('data-live-coaching-mode><span class="badge neutral">'+label+'</span>'));
 }
 assert.doesNotMatch(LiveDetailScreen({sessionType:'ops',mode:'normal'}),/data-live-coaching-mode/);
});
