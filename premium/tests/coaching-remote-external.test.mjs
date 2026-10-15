import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRemoteSession,joinRemoteSession,reduceRemoteSession,projectRemoteSession} from '../src/server/coaching-service.mjs';
const now=Date.parse('2026-10-15T12:00:00Z');
const fix=(time=now,latitude=48)=>({timestamp:time,coords:{latitude,longitude:7,accuracy:5}});
const create=(scenario,mode='normal',role='driver')=>createRemoteSession({id:'external-session',owner:{id:'driver',name:'Conducteur'},role,mode,dogName:'Nox',scenario,now});
const command=(s,userId,type,payload={},at=now)=>reduceRemoteSession(s,{userId,type,payload,now:at});
for(const mode of ['normal','simple_blind','full_blind'])test(`external without pose: ${mode}, readiness, permissions and truthful debrief`,()=>{
 let s=create('external_traceur',mode);
 assert.equal(s.session.scenario,'external_traceur');assert.equal(s.members.length,1);
 for(const role of ['coach','observer'])joinRemoteSession(s,{id:role,name:role},role);
 assert.throws(()=>joinRemoteSession(s,{id:'fake-traceur',name:'Faux traceur'},'traceur'));
 assert.throws(()=>command(s,'driver','start-pose',{fix:fix()}));
 assert.throws(()=>command(s,'coach','external-ready'));
 assert.throws(()=>command(s,'driver','start-search',{fix:fix()}));
 s=command(s,'driver','external-ready');assert.equal(s.search.phase,'SEARCH_READY');
 assert.equal(s.search.track_finished_at,undefined);
 s=command(s,'driver','start-search',{fix:fix(now+1000),segmentId:'search'},now+1000);
 for(const role of ['driver','coach','observer']){
  const p=projectRemoteSession(s,role,now+1000);assert.equal(p.pose,null);assert.equal(p.poseStatus,'unavailable');assert.equal(p.poseRecorder,null);
  assert.equal(p.search!==null,mode!=='full_blind'||role==='driver');
 }
 assert.throws(()=>command(s,'observer','pause-search'));
 s=command(s,'coach','pause-search',{},now+2000);s=command(s,'driver','resume-search',{},now+3000);
 s=command(s,'driver','finish-search',{},now+4000);
 for(const role of ['driver','coach','observer']){const p=projectRemoteSession(s,role);assert.equal(p.phase,'DEBRIEF');assert.equal(p.poseStatus,'unavailable');assert.equal(p.pose,null);assert.ok(p.search);}
});
test('external driver-recorded pose belongs to driver and remains separate from search',()=>{
 let s=create('external_driver_recorded');
 joinRemoteSession(s,{id:'coach',name:'Coach'},'coach');
 assert.throws(()=>command(s,'coach','start-pose',{fix:fix()}));
 assert.throws(()=>command(s,'driver','external-ready'));
 s=command(s,'driver','start-pose',{fix:fix(),segmentId:'pose'});
 assert.equal(s.search.phase,'LAYING');assert.equal(s.tracer.gpsPose.actorId,'driver');
 s=command(s,'driver','gps-batch',{kind:'pose',points:[{...fix(now+1000,48.0001),capturedAt:now+1000,sequence:1,segmentId:'pose'}]},now+1000);
 assert.ok(s.tracer.gpsPose.distanceM>10);
 s=command(s,'driver','finish-pose',{},now+2000);assert.equal(s.search.phase,'TRACK_FINISHED');
 s=command(s,'driver','in-place',{},now+3000);assert.equal(s.search.phase,'SEARCH_READY');
 assert.equal(projectRemoteSession(s,'driver').poseRecorder,'driver');
 s=command(s,'driver','start-search',{fix:fix(now+4000),segmentId:'search'},now+4000);
 s=command(s,'driver','gps-batch',{kind:'search',points:[{...fix(now+5000,48.00005),capturedAt:now+5000,sequence:1,segmentId:'search'}]},now+5000);
 s=command(s,'driver','finish-search',{},now+6000);
 const p=projectRemoteSession(s,'driver');assert.equal(p.phase,'DEBRIEF');assert.equal(p.pose.segments.flat().length,2);assert.equal(p.search.segments.flat().length,2);assert.ok(p.pose.distanceM>p.search.distanceM);assert.equal(p.poseStatus,'available');
});
test('reject unknown scenarios, external Traceur app roles, and driver-recorded blind modes',()=>{
 assert.throws(()=>create('invented'));assert.throws(()=>create('external_traceur','normal','traceur'));
 for(const mode of ['simple_blind','full_blind'])assert.throws(()=>create('external_driver_recorded',mode));
});
