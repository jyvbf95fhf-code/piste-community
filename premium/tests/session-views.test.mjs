import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionCatalog} from '../src/session-catalog.mjs';
import {sessionListView,homeActiveSessionView,completedSessionHistoryView} from '../src/session-views.mjs';
import {mock} from '../src/data.mjs';
import {createCoachingQa} from '../src/coaching-qa.mjs';

function sample(phase='PREPARATION'){
 const qa=createCoachingQa('normal',mock.user,[{id:'nox',...mock.dog}]);
 return {session:qa.preparation.session,searchState:{...qa.search,phase},preparationState:qa.preparation,tracerState:qa.tracer};
}

test('session list derives active, completed and archived statuses from Coaching phases',()=>{
 const catalog=createSessionCatalog();
 for(const [id,phase] of [['active','SEARCH_RUNNING'],['done','DEBRIEF'],['closed','ARCHIVED']]){
  const record=sample(phase);record.session={...record.session,id,code:id};catalog.capture(record);
 }
 const rows=sessionListView(catalog,{demoRows:false});
 assert.deepEqual(rows.map(row=>[row.id,row.status]),[
  ['active','En cours'],['done','Terminée'],['closed','Archivée']
 ]);
});

test('session list filters by status, text and dog ID without exposing live geometry',()=>{
 const catalog=createSessionCatalog();
 const record=sample('SEARCH_RUNNING');
 record.session={...record.session,id:'active-nox',code:'PC-0001',dog:{...record.session.dog,id:'nox'}};
 catalog.capture(record);
 const rows=sessionListView(catalog,{demoRows:false,currentSessionId:'active-nox',dogId:'nox',query:'PC-0001'});
 assert.equal(rows.length,1);
 assert.equal(rows[0].status,'En cours');
 assert.equal(rows[0].canResume,true);
 assert.equal(rows[0].href,'/coaching/session');
 assert.equal('paths' in rows[0],false);
 assert.equal('markers' in rows[0],false);
 assert.equal(sessionListView(catalog,{demoRows:false,filter:'Archivées'}).length,0);
 assert.equal(sessionListView(catalog,{demoRows:false,dogId:'uma'}).length,0);
});

test('a completed current session is read-only history, not a live Coaching resume link',()=>{
 const catalog=createSessionCatalog(),record=sample('DEBRIEF');
 record.session={...record.session,id:'current-finished',code:'PC-0012'};catalog.capture(record);
 const [row]=sessionListView(catalog,{demoRows:false,currentSessionId:'current-finished'});
 assert.equal(row.canResume,false);
 assert.equal(row.href,'/sessions/current-finished');
});

test('legacy session fixtures remain summary-only and preserve unavailable fields',()=>{
 const rows=sessionListView(createSessionCatalog(),{});
 const active=rows.find(row=>row.id==='demo:active');
 const paused=rows.find(row=>row.id==='demo:paused');
 const recent=rows.find(row=>row.id==='demo:recent');
 assert.equal(active.status,'En cours');
 assert.equal(active.modeLabel,'Aucune donnée disponible');
 assert.equal(active.href,'/sessions/demo%3Aactive');
 assert.equal(paused.status,'En pause');
 assert.equal(recent.status,'Terminée');
 assert.equal(recent.dogId,'nox');
});

test('paused Home demo session is also available in the Sessions active filter',()=>{
 const rows=sessionListView(createSessionCatalog(),{filter:'En cours'});
 assert.deepEqual(rows.map(row=>[row.id,row.status]),[['demo:active','En cours'],['demo:paused','En pause']]);
});

test('Home includes only non-terminal Coaching snapshots and replaces static samples once a session exists',()=>{
 const catalog=createSessionCatalog();
 const fallback=[{title:'Exemple visuel',status:'EN COURS'}];
 assert.deepEqual(homeActiveSessionView(catalog,fallback),fallback);
 const record=sample('SEARCH_RUNNING');record.session={...record.session,id:'home-session',title:'Session terrain'};catalog.capture(record);
 assert.deepEqual(homeActiveSessionView(catalog,fallback).map(row=>row.title),['Session terrain']);
 record.searchState={...record.searchState,phase:'DEBRIEF'};catalog.capture(record);
 assert.deepEqual(homeActiveSessionView(catalog,fallback),[]);
 record.searchState={...record.searchState,phase:'ARCHIVED'};catalog.capture(record);
 assert.deepEqual(homeActiveSessionView(catalog,fallback),[]);
});

test('Mes pistes history contains completed and archived sessions with detail and replay links only',()=>{
 const catalog=createSessionCatalog();
 for(const [id,phase] of [['active-history','SEARCH_RUNNING'],['finished-history','DEBRIEF'],['archived-history','ARCHIVED']]){
  const record=sample(phase);record.session={...record.session,id,title:id};catalog.capture(record);
 }
 const history=completedSessionHistoryView(catalog,{includeDemoRows:false});
 assert.deepEqual(history.map(row=>row.id),['finished-history','archived-history']);
 assert.equal(history[0].href,'/sessions/finished-history');
 assert.equal(history[0].replayHref,'/sessions/finished-history/replay');
 assert.equal(history[1].status,'Archivée');
});

test('summary-only completed demo remains in Mes pistes without inventing a replay',()=>{
 const history=completedSessionHistoryView(createSessionCatalog());
 const recent=history.find(row=>row.id==='demo:recent');
 assert.ok(recent);
 assert.equal(recent.status,'Terminée');
 assert.equal(recent.replayHref,null);
});
