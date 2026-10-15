import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRemoteSession,joinRemoteSession,reduceRemoteSession,projectRemoteSession} from '../src/server/coaching-service.mjs';
const at=Date.parse('2026-10-15T14:00:00Z'),fix=t=>({timestamp:t,coords:{latitude:48.2,longitude:7.7,accuracy:5}});
const create=(scenario='self_trace',traceType='direct',mode='normal')=>createRemoteSession({id:'s',owner:{id:'u',name:'Utilisateur'},role:scenario==='self_trace'?'driver':'traceur',scenario,traceType,mode,dogName:'Nox',now:at});
const cmd=(s,type,payload={},userId='u',now=at)=>reduceRemoteSession(s,{userId,type,payload,now});
function finish(s){s=cmd(s,'finish-pose',{},'u',at+1000);return cmd(s,'in-place',{},'u',at+2000);}
test('solo records pose then search only after explicit return, with one real member',()=>{
 let s=create();assert.equal(s.members.length,1);assert.equal(s.session.roles.traceur,'u');assert.throws(()=>create('self_trace','direct','full_blind'));
 s=cmd(s,'start-pose',{fix:fix(at),segmentId:'pose'});s=finish(s);assert.equal(s.search.phase,'LAYING_WAIT');assert.throws(()=>cmd(s,'start-search',{fix:fix(at+3000)}));
 s=cmd(s,'return-start');assert.equal(s.search.phase,'SEARCH_READY');s=cmd(s,'start-search',{fix:fix(at+3000),segmentId:'search'},'u',at+3000);s=cmd(s,'finish-search',{},'u',at+4000);
 const p=projectRemoteSession(s,'u');assert.equal(p.phase,'DEBRIEF');assert.equal(p.pose.actorId,'u');assert.equal(p.search.actorId,'u');assert.notDeepEqual(p.pose,p.search);
});
for(const mode of ['normal','simple_blind','full_blind'])test(`created reference ${mode}: approach, lock and filtered geometry`,()=>{
 let s=create('connected_traceur','prepared',mode);joinRemoteSession(s,{id:'d',name:'D'},'driver');
 s=cmd(s,'set-prepared-reference',{reference:{name:'Créé',coordinates:[[7.7,48.2],[7.712345,48.234567],[7.72,48.25,true],[7.73,48.26]]}});
 assert.equal(s.session.preparation.source,'draw');assert.equal(projectRemoteSession(s,'u').reference.geometry.segments.length,2);
 if(mode!=='normal')assert.doesNotMatch(JSON.stringify(projectRemoteSession(s,'d')),/7\.712345|48\.234567|Créé/);
 for(const type of ['approach-start','arrive-start','ready-pose'])s=cmd(s,type);
 s=cmd(s,'start-pose',{fix:fix(at)});assert.equal(s.tracer.gpsPose.segments.flat().length,1);assert.throws(()=>cmd(s,'set-prepared-reference',{reference:{name:'X',coordinates:[[7,48],[7.1,48.1]]}}));
});
const team=()=>{const s=create('connected_traceur');for(const [id,role]of [['d','driver'],['c','coach'],['o','observer']])joinRemoteSession(s,{id,name:id},role);return s;};
const debrief=()=>{let s=team();s=cmd(s,'start-pose',{fix:fix(at)});s=finish(s);s=cmd(s,'start-search',{fix:fix(at+3000)},'d',at+3000);return cmd(s,'finish-search',{},'d',at+4000);};
test('collective cancel, interrupt and departure bind identity and preserve blind filters',()=>{
 let s=team();assert.throws(()=>cmd(s,'cancel',{},'c'));s=cmd(s,'leave',{},'o');assert.equal(projectRemoteSession(s,'o').phase,'LEFT');assert.equal(projectRemoteSession(s,'o').pose,null);assert.throws(()=>cmd(s,'send-message',{text:'x'},'o'));s=cmd(s,'cancel');assert.equal(s.search.phase,'CANCELLED');assert.throws(()=>cmd(s,'start-pose',{fix:fix(at)}));
 s=team();s=cmd(s,'start-pose',{fix:fix(at)});s=cmd(s,'interrupt');assert.equal(s.search.phase,'INTERRUPTED');assert.notEqual(s.tracer.gpsPose.phase,'active');assert.throws(()=>cmd(s,'in-place'));
});
test('post-session personal notes and explicit revocable Coach archive permission',()=>{
 let s=debrief();const terrain=JSON.stringify([s.tracer.gpsPose,s.search.gpsSearch]);assert.throws(()=>cmd(s,'save-note',{text:'x'},'o'));s=cmd(s,'save-note',{text:'Conducteur'},'d');s=cmd(s,'save-note',{text:'Coach'},'c');assert.equal(projectRemoteSession(s,'o').notes.length,2);assert.throws(()=>cmd(s,'archive',{},'c'));s=cmd(s,'grant-archive');s=cmd(s,'revoke-archive');assert.throws(()=>cmd(s,'archive',{},'c'));s=cmd(s,'grant-archive');s=cmd(s,'archive',{},'c');assert.equal(s.search.phase,'ARCHIVED');assert.throws(()=>cmd(s,'save-note',{text:'x'},'d'));assert.equal(JSON.stringify([s.tracer.gpsPose,s.search.gpsSearch]),terrain);
});
test('real shared messages bind author, mask Traceur and track each reader',()=>{
 let s=team();s.session.mode='full_blind';s=cmd(s,'send-message',{text:'Bonjour',participantId:'c'});let p=projectRemoteSession(s,'d');assert.equal(p.messages[0].sender,'Traceur — masqué');assert.equal(p.messages[0].participantId,null);assert.equal(p.unread,1);s=cmd(s,'read-messages',{},'d');assert.equal(projectRemoteSession(s,'d').unread,0);assert.equal(projectRemoteSession(s,'c').unread,1);assert.throws(()=>cmd(s,'send-message',{text:'x'},'o'));s=cmd(s,'send-message',{text:'Bien reçu'},'c');assert.equal(s.tracer.messages.at(-1).participantId,'c');assert.doesNotMatch(s.tracer.messages.at(-1).time,/mock/);
});
test('reference proposal requires explicit Coach authority and poser acceptance; blind knowledge is protected',()=>{
 let s=team();s.session.traceType='prepared';const reference={name:'Proposition',coordinates:[[7.7,48.2],[7.8,48.3]]};assert.throws(()=>cmd(s,'propose-reference',{reference},'c'));s=cmd(s,'grant-reference');s=cmd(s,'propose-reference',{reference},'c');assert.equal(projectRemoteSession(s,'d').referenceStatus,'required');assert.equal(projectRemoteSession(s,'u').referenceProposal.reference.name,'Proposition');assert.throws(()=>cmd(s,'accept-reference',{},'d'));s=cmd(s,'accept-reference');assert.equal(s.session.preparation.name,'Proposition');s.session.mode='full_blind';assert.throws(()=>cmd(s,'propose-reference',{reference},'c'));
});
test('departure permanently removes future spatial access and closed blind sessions keep pose hidden',()=>{
 let s=team();s.session.mode='full_blind';s=cmd(s,'leave',{},'o');s=cmd(s,'start-pose',{fix:fix(at)});s=cmd(s,'interrupt');assert.equal(projectRemoteSession(s,'o').pose,null);assert.equal(projectRemoteSession(s,'c').pose,null);assert.throws(()=>cmd(s,'read-messages',{},'o'));assert.throws(()=>cmd(s,'gps-batch',{kind:'pose',points:[{...fix(at+1000),sequence:1,segmentId:'x'}]}));
});
test('prepared serializer preserves routed curves, breaks and rejects pending routes',async()=>{
 const {remotePreparedInput}=await import('../src/coaching-remote-reference.mjs');const {routeSegmentKey}=await import('../src/track-route-segments.mjs');const a={x:7.7,y:48.2,space:'wgs84'},b={x:7.701,y:48.201,space:'wgs84',incomingMode:'follow'};b.route={provider:'OSM',key:routeSegmentKey(a,b),coordinates:[[7.7,48.2],[7.7008,48.2001],[7.701,48.201]]};const c={x:7.72,y:48.22,space:'wgs84',breakBefore:true};const input=remotePreparedInput({name:'Routé',geometry:{points:[a,b,c]}});assert.ok(input.coordinates.some(p=>p[0]===7.7008));assert.deepEqual(input.coordinates.at(-1),[7.72,48.22,true]);delete b.route;assert.throws(()=>remotePreparedInput({name:'Pending',geometry:{points:[a,b]}}));
});
test('stale personal note revision cannot overwrite a newer note',()=>{let s=debrief();s=cmd(s,'save-note',{text:'Première',expectedRevision:0},'d');assert.throws(()=>cmd(s,'save-note',{text:'Périmée',expectedRevision:0},'d'));assert.equal(projectRemoteSession(s,'d').notes[0].text,'Première');});
test('solo GPX uses the same explicit reference and approach rules',()=>{let s=create('self_trace','gpx');s=cmd(s,'set-gpx-reference',{reference:{name:'Solo GPX',coordinates:[[7.7,48.2],[7.71,48.21]]}});assert.equal(projectRemoteSession(s,'u').poseRecorder,'driver');assert.equal(projectRemoteSession(s,'u').referenceStatus,'available');assert.throws(()=>cmd(s,'start-pose',{fix:fix(at)}));for(const type of ['approach-start','arrive-start','ready-pose'])s=cmd(s,type);s=cmd(s,'start-pose',{fix:fix(at)});assert.equal(s.search.phase,'LAYING');});
