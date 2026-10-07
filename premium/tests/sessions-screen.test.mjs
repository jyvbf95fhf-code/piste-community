import test from 'node:test';
import assert from 'node:assert/strict';
import {SessionListScreen,SessionDetailScreen} from '../src/sessions-screen.mjs';
import {sessionDetailView,sessionReplayView,resolveConsultationRoute} from '../src/session-views.mjs';
import {SessionReplayScreen} from '../src/session-replay-screen.mjs';
import {createSessionCatalog} from '../src/session-catalog.mjs';
import {mock} from '../src/data.mjs';
import {createCoachingQa} from '../src/coaching-qa.mjs';
import {DebriefScreen} from '../src/coaching-debrief-screen.mjs';

const rows=[
 {id:'active',href:'/coaching/session',kind:'coaching',status:'En cours',modeLabel:'Normal',title:'PC-0001',dogName:'Nox',roleLabel:'Conducteur',date:'Aucune donnée disponible',distance:'Aucune donnée disponible',duration:'Aucune donnée disponible',canResume:true},
 {id:'closed',href:'/sessions/closed',kind:'coaching',status:'Archivée',modeLabel:'Double aveugle',title:'PC-0002',dogName:'Nox',roleLabel:'Conducteur',date:'Aucune donnée disponible',distance:'Aucune donnée disponible',duration:'Aucune donnée disponible'}
];

test('session list shows only the supplied status and keeps active return in Coaching',()=>{
 const html=SessionListScreen(rows,{filter:'Toutes'});
 assert.match(html,/href="\/coaching\/session"/);
 assert.match(html,/aria-pressed="true">Toutes</);
 assert.match(html,/data-session-kind="coaching"/);
 assert.doesNotMatch(html,/data-search=|data-tracer=|prep-map-canvas/);
});

test('session list shows dog filter and a real empty state',()=>{
 assert.match(SessionListScreen(rows,{dogId:'nox',dogName:'Nox'}),/Filtre chien · Nox/);
 assert.match(SessionListScreen([]),/Aucune session ne correspond/);
});

function terminalRecord(phase='DEBRIEF'){
 const qa=createCoachingQa('normal',mock.user,[{id:'nox',...mock.dog}]);
 qa.search={...qa.search,phase};
 return {session:qa.preparation.session,searchState:qa.search,preparationState:qa.preparation,tracerState:qa.tracer};
}

test('consultation routes parse encoded IDs and reject trailing segments',()=>{
 assert.deepEqual(resolveConsultationRoute('/sessions/mock%2D1/debrief'),{type:'session-debrief',id:'mock-1'});
 assert.deepEqual(resolveConsultationRoute('/sessions'),{type:'session-list'});
 assert.deepEqual(resolveConsultationRoute('/tracks/track-1'),{type:'track-detail',id:'track-1'});
 assert.equal(resolveConsultationRoute('/sessions/mock-1/unknown/extra'),null);
});

test('post-session detail reuses debrief data and is explicitly read-only',()=>{
 const catalog=createSessionCatalog(),record=terminalRecord('ARCHIVED');
 record.session={...record.session,title:'Forêt du matin'};catalog.capture(record);
 const view=sessionDetailView(catalog.get(record.session.id));
 const html=SessionDetailScreen(view);
 assert.equal(view.status,'Archivée');
 assert.equal(view.readOnly,true);
 assert.equal(view.dog.name,'Nox');
 assert.ok(view.participants.length>0);
 assert.match(html,/Forêt du matin/);
 assert.match(html,/Lecture seule/);
 assert.match(html,/href="\/community\/new\?sourceType=session&amp;sourceId=/);
 assert.match(html,/Aucune donnée disponible|Recherche/);
 assert.doesNotMatch(html,/Modifier|Supprimer|data-search=|data-tracer=/);
});

test('session detail presents the creator role with its French product label',()=>{
 const record=terminalRecord('ARCHIVED');
 assert.equal(sessionDetailView(record).creatorRole,'Conducteur');
});

test('active session detail exposes only a return to current Coaching, never spatial layers',()=>{
 const catalog=createSessionCatalog(),record=terminalRecord('SEARCH_RUNNING');
 catalog.capture(record);
 const view=sessionDetailView(catalog.get(record.session.id),{currentSessionId:record.session.id});
 const html=SessionDetailScreen(view);
 assert.equal(view.canResume,true);
 assert.match(html,/href="\/coaching\/session"/);
 assert.doesNotMatch(html,/Partager dans la Communauté/);
 assert.doesNotMatch(html,/prep-map-canvas|data-map-path|data-search=|data-tracer=/);
});

test('historical debrief uses the existing report but suppresses current-session archive controls',()=>{
 const record=terminalRecord('DEBRIEF');
 const html=DebriefScreen(record.searchState,record.preparationState,record.tracerState,{tab:'summary'},{readOnly:true});
 assert.match(html,/Synthèse de session/);
 assert.match(html,/data-debrief-tab="map"/);
 assert.doesNotMatch(html,/data-debrief="archive"/);
});

test('static replay uses available pose and search paths from debriefView only',()=>{
 const record=terminalRecord('DEBRIEF');
 record.tracerState={...record.tracerState,segments:[[{x:65,y:240},{x:95,y:210}]]};
 record.searchState={...record.searchState,layingSegments:record.tracerState.segments,actorId:'self',segments:[[{x:70,y:242},{x:100,y:220}]]};
 const view=sessionReplayView(record);
 const html=SessionReplayScreen(view);
 assert.deepEqual(view.map.paths.map(path=>path.kind).filter(kind=>['pose','search'].includes(kind)),['pose','search']);
 assert.match(html,/data-map-path="pose"/);
 assert.match(html,/data-map-path="search"/);
 assert.match(html,/Lecture seule/);
});

test('replay unavailable labels do not create fake paths and active sessions cannot replay',()=>{
 const record=terminalRecord('DEBRIEF');
 const view=sessionReplayView(record),html=SessionReplayScreen(view);
 assert.equal(view.map.poseUnavailable,true);
 assert.equal(view.map.paths.some(path=>path.kind==='pose'),false);
 assert.equal(view.map.paths.some(path=>path.kind==='search'),false);
 assert.match(html,/Tracé de pose indisponible/);
 assert.match(html,/Tracé de relève indisponible/);
 assert.equal(sessionReplayView(terminalRecord('SEARCH_RUNNING')),null);
});
