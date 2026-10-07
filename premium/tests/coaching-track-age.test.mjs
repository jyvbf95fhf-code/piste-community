import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mock} from '../src/data.mjs';
import {createCoachingQa} from '../src/coaching-qa.mjs';
import {simulate} from '../src/coaching-preparation.mjs';
import {createTracer,advanceTracer} from '../src/coaching-tracer.mjs';
import {createSearch,searchView} from '../src/coaching-search.mjs';
import {syncSession,advanceSessionSearch,debriefView,trackAgeSeconds,formatTrackAge} from '../src/coaching-session-flow.mjs';
import {createSessionCatalog} from '../src/session-catalog.mjs';
import {sessionDetailView,sessionListView,sessionReplayView} from '../src/session-views.mjs';
import {SearchScreen} from '../src/coaching-search-screen.mjs';
import {DebriefScreen} from '../src/coaching-debrief-screen.mjs';
import {SessionReplayScreen} from '../src/session-replay-screen.mjs';

const stamp=value=>Date.parse(`2026-10-06T${value.length===5?`${value}:00`:value}Z`);
function setup({external=false}={}){
 const qa=createCoachingQa('normal',mock.user,[{id:'nox',...mock.dog}],external?'external_traceur':'connected_traceur');
 const p=simulate(qa.preparation,{gps:'fresh',viewerRole:external?'driver':'traceur',...(external?{}:{phase:'ready'})});
 return {p,t:qa.tracer,s:qa.search};
}
function finishLaying({p,t,s},finishedAt){
 for(const action of ['start','finish','in-place']){t=advanceTracer(t,p,action);s=syncSession(s,p,t,{now:()=>finishedAt});}
 return {p,t,s};
}

test('record track_finished_at at the actual recorded laying completion only',()=>{
 const flow=finishLaying(setup(),stamp('10:00'));
 assert.equal(flow.s.phase,'SEARCH_READY');
 assert.equal(flow.s.track_finished_at,new Date(stamp('10:00')).toISOString());
 assert.equal(flow.s.events.find(event=>event.type==='LAYING_FINISHED').phase,'TRACK_FINISHED');
 const external=setup({external:true});
 external.p={...external.p,phase:'external_ready'};
 external.s=syncSession(external.s,external.p,external.t,{now:()=>stamp('10:00')});
 assert.equal(external.s.track_finished_at,undefined);
});

test('current track age advances during a 10 minute or one hour wait and is independent of search time',()=>{
 const flow=finishLaying(setup(),stamp('10:00'));
 assert.equal(trackAgeSeconds(flow.s,stamp('10:00:00')),0);
 assert.equal(trackAgeSeconds(flow.s,stamp('10:10:00')),600);
 assert.equal(trackAgeSeconds(flow.s,stamp('11:00:00')),3600);
 assert.equal(formatTrackAge(600),'00:10:00');
 assert.equal(formatTrackAge(3600),'01:00:00');
 const waiting=SearchScreen(flow.s,simulate(flow.p,{viewerRole:'driver'}),{now:stamp('10:10:00')});
 assert.match(waiting,/Âge de la piste/);
 assert.match(waiting,/00:10:00/);
 const catalog=createSessionCatalog(),snapshot={session:flow.p.session,searchState:flow.s,preparationState:flow.p,tracerState:flow.t};
 catalog.capture(snapshot);
 const returned=catalog.get(flow.p.session.id);
 assert.equal(returned.searchState.track_finished_at,flow.s.track_finished_at);
 assert.equal(trackAgeSeconds(returned.searchState,stamp('11:00:00')),3600);
});

test('immediate search still freezes the small age elapsed since pose completion',()=>{
 const flow=finishLaying(setup(),stamp('10:00'));
 const driver=simulate(flow.p,{viewerRole:'driver'});
 flow.s=advanceSessionSearch(flow.s,driver,'start',{now:()=>stamp('10:00:03')});
 assert.equal(flow.s.trackAgeAtSearchStart,3);
 assert.equal(flow.s.search_started_at,new Date(stamp('10:00:03')).toISOString());
});

test('search start freezes age from pose completion and search finish records elapsed references',()=>{
 const flow=finishLaying(setup(),stamp('10:00'));
 const driver=simulate(flow.p,{viewerRole:'driver'});
 flow.s=advanceSessionSearch(flow.s,driver,'start',{now:()=>stamp('11:15')});
 assert.equal(flow.s.search_started_at,new Date(stamp('11:15')).toISOString());
 assert.equal(flow.s.trackAgeAtSearchStart,4500);
 assert.equal(searchView(flow.s,driver,{now:stamp('12:00')}).trackAgeAtSearchStart,4500);
 assert.equal(searchView(flow.s,simulate(driver,{viewerRole:'coach'}),{now:stamp('12:00')}).trackAgeAtSearchStart,null);
 const cockpit=SearchScreen(flow.s,driver);
 assert.match(cockpit,/Âge au départ/);
 assert.match(cockpit,/01:15:00/);
 flow.s=advanceSessionSearch(flow.s,driver,'finish',{now:()=>stamp('11:45')});
 assert.equal(flow.s.search_finished_at,new Date(stamp('11:45')).toISOString());
 assert.equal(flow.s.searchDuration,1800);
 assert.equal(flow.s.trackAgeAtSearchEnd,6300);
});

test('debrief, replay, detail and history expose available age without inventing absent references',()=>{
 const flow=finishLaying(setup(),stamp('10:00'));
 const driver=simulate(flow.p,{viewerRole:'driver'});
 flow.s=advanceSessionSearch(flow.s,driver,'start',{now:()=>stamp('11:15')});
 flow.s=advanceSessionSearch(flow.s,driver,'finish',{now:()=>stamp('11:45')});
 const report=debriefView(flow.s,driver,flow.t);
 assert.equal(report.summary.trackAgeAtSearchStart,4500);
 assert.equal(report.summary.trackAgeAtSearchEnd,6300);
 assert.equal(report.science.trackAge.status,'calculé');
 const html=DebriefScreen(flow.s,driver,flow.t);
 assert.match(html,/Âge de piste au départ/);
 assert.match(html,/01:15:00/);
 assert.match(html,/Fin de pose/);
 const record={session:{...flow.p.session,id:'age-session'},searchState:flow.s,preparationState:driver,tracerState:flow.t};
 const replay=sessionReplayView(record);
 assert.equal(replay.temporal.trackAgeAtSearchStart,4500);
 assert.match(SessionReplayScreen(replay),/Âge de piste au départ/);
 const catalog=createSessionCatalog();catalog.capture(record);
 const [row]=sessionListView(catalog,{demoRows:false});
 assert.equal(row.trackAgeAtSearchStart,4500);
 assert.equal(sessionDetailView(catalog.get('age-session')).trackAgeAtSearchStart,4500);
 const missing=setup({external:true});
 const missingDriver=simulate(missing.p,{viewerRole:'driver'});
 missing.s={...missing.s,phase:'DEBRIEF',search_started_at:new Date(stamp('11:15')).toISOString(),search_finished_at:new Date(stamp('11:45')).toISOString()};
 const noPoseReport=debriefView(missing.s,missingDriver,missing.t);
 assert.equal(noPoseReport.summary.trackAgeAtSearchStart,null);
 assert.equal(noPoseReport.science.trackAge.status,'indisponible');
 assert.match(DebriefScreen(missing.s,missingDriver,missing.t),/Indisponible/);
});
