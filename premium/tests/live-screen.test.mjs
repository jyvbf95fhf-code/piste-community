import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveScreen,LiveDetailScreen} from '../src/live-screen.mjs';

test('Live groups own, authorized contact sessions, and invitations with fixed roles',()=>{
 const html=LiveScreen({ownSessions:[{sessionId:'mine',sessionType:'coaching',title:'Nox'}],contactSessions:[{sessionId:'ops-1',sessionType:'ops',title:'Trace terrain'}],invitations:[{sessionId:'invite',sessionType:'coaching'}]});
 assert.match(html,/Mes sessions en cours/);assert.match(html,/Sessions de mes contacts autorisées/);assert.match(html,/Invitations Live/);
 assert.match(html,/Observateur de trace/);assert.match(html,/Voir le Live/);
});

test('Coaching and OPS detail render read-only projections without mutation controls',()=>{
 const coaching=LiveDetailScreen({sessionType:'coaching',role:'observer',roleLabel:'Observateur',readOnly:true,modeLabel:'Double aveugle',phase:'SEARCH_RUNNING',map:{paths:[]}});
 assert.match(coaching,/data-live-role="observer"/);assert.match(coaching,/Double aveugle/);assert.doesNotMatch(coaching,/data-coaching=|data-operational-action/);
 const ops=LiveDetailScreen({sessionType:'ops',role:'ops_trace_observer',roleLabel:'Observateur de trace OPS',readOnly:true,state:'En cours',trace:[{x:10,y:20},{x:30,y:40}],distance:23,trackingSeconds:12,trackAge:'Non renseigné',corridor:{label:'Couloir estimé'},events:[]});
 assert.match(ops,/Couloir estimé/);assert.match(ops,/Trace mock/);assert.doesNotMatch(ops,/data-coaching=|data-operational-action|Fiche mission/);
 assert.match(LiveDetailScreen({sessionType:'ops',roleLabel:'Observateur de trace OPS',trace:[],trackAge:'Non renseigné'}),/Aucune trace de progression disponible/);
});

test('denied or revoked Live route displays an unavailable state',()=>{
 const html=LiveDetailScreen(null);assert.match(html,/Live indisponible/);assert.match(html,/accès a été révoqué/);assert.doesNotMatch(html,/Voir le Live/);
});
