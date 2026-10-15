import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRemoteSession,joinRemoteSession,reduceRemoteSession,projectRemoteSession} from '../src/server/coaching-service.mjs';
const now=Date.parse('2026-10-15T13:00:00Z'),reference={name:'Référence confidentielle',coordinates:[[7.7,48.2],[7.7123456,48.2234567],[7.8,48.3,true],[7.81,48.31]]};
const fix=t=>({timestamp:t,coords:{latitude:48.2,longitude:7.7,accuracy:5}});
const cmd=(s,userId,type,payload={},at=now)=>reduceRemoteSession(s,{userId,type,payload,now:at});
function setup(mode='normal'){const s=createRemoteSession({id:'gpx-session',owner:{id:'traceur',name:'Traceur'},role:'traceur',mode,dogName:'Nox',traceType:'gpx',now});for(const role of ['driver','coach','observer'])joinRemoteSession(s,{id:role,name:role},role);return s;}
for(const mode of ['normal','simple_blind','full_blind'])test(`shared GPX ${mode}: reference filtered, approach explicit, GPS separate, debrief released`,()=>{
 let s=setup(mode);assert.equal(s.session.traceType,'gpx');assert.equal(projectRemoteSession(s,'traceur').referenceStatus,'required');
 assert.throws(()=>cmd(s,'traceur','start-pose',{fix:fix(now)}));
 for(const role of ['driver','coach','observer'])assert.throws(()=>cmd(s,role,'set-gpx-reference',{reference}));
 s=cmd(s,'traceur','set-gpx-reference',{reference});
 assert.equal(s.tracer.gpsPose,undefined);assert.equal(s.search.phase,'PREPARATION');
 for(const role of ['traceur','driver','coach','observer']){
  const p=projectRemoteSession(s,role),visible=mode==='normal'||role==='traceur'||mode==='simple_blind'&&role!=='driver';
  assert.equal(p.reference!==null,visible);
  if(!visible){assert.doesNotMatch(JSON.stringify(p),/7\.7123456|48\.2234567|Référence confidentielle/);assert.equal(p.referenceStart!==null,role==='driver');}
 }
 assert.throws(()=>cmd(s,'traceur','start-pose',{fix:fix(now)}));assert.throws(()=>cmd(s,'traceur','arrive-start'));assert.throws(()=>cmd(s,'driver','approach-start'));
 s=cmd(s,'traceur','approach-start');s=cmd(s,'traceur','arrive-start');s=cmd(s,'traceur','ready-pose');
 assert.equal(s.tracer.gpsPose,undefined);assert.equal(projectRemoteSession(s,'traceur').approachPhase,'ready');
 s=cmd(s,'traceur','start-pose',{fix:fix(now),segmentId:'pose'});
 assert.equal(s.tracer.gpsPose.segments.flat().length,1);assert.equal(s.tracer.gpsPose.distanceM,0);
 assert.throws(()=>cmd(s,'traceur','set-gpx-reference',{reference}));
 s=cmd(s,'traceur','finish-pose',{},now+1000);s=cmd(s,'traceur','in-place',{},now+2000);
 s=cmd(s,'driver','start-search',{fix:fix(now+3000)},now+3000);s=cmd(s,'driver','finish-search',{},now+4000);
 for(const role of ['traceur','driver','coach','observer']){const p=projectRemoteSession(s,role);assert.equal(p.phase,'DEBRIEF');assert.equal(p.reference.geometry.segments.length,2);assert.ok(p.reference);assert.ok(p.pose);assert.ok(p.search);}
});
test('shared GPX rejects invalid geometry, oversized payload, unknown type and external combination',()=>{
 const s=setup();for(const coordinates of [[],[[7,48]],[[181,48],[7,48]],[[7,48],['7',48]],[[7,48],[7.1,48.1,'true']],Array(10001).fill([7,48]),[[7,48],[7.1,48.1,true]]])assert.throws(()=>cmd(s,'traceur','set-gpx-reference',{reference:{name:'bad',coordinates}}));
 assert.throws(()=>createRemoteSession({id:'s',owner:{id:'d',name:'D'},role:'driver',mode:'normal',dogName:'Nox',traceType:'gpx',scenario:'external_traceur',now}));
 assert.throws(()=>createRemoteSession({id:'s',owner:{id:'d',name:'D'},role:'driver',mode:'normal',dogName:'Nox',traceType:'unknown',now}));
 const dense=Array.from({length:7000},(_,i)=>[7.123456789012345,48.12345678901234,i>0&&i%2===0]);
 assert.throws(()=>cmd(s,'traceur','set-gpx-reference',{reference:{name:'dense',coordinates:dense}}));
});
test('real GPX importer preserves segment breaks and sends only normalized reference geometry',async()=>{
 const {createRequire}=await import('node:module'),require=createRequire(import.meta.url),sax=require('../src/vendor/sax.js');
 const {parseTrackGpx}=await import('../src/track-gpx-import.mjs');
 const {remoteGpxInput,normalizeRemoteGpx}=await import('../src/coaching-remote-reference.mjs');
 const xml='<gpx version="1.1"><trk><name>Test &amp; GPX</name><trkseg><trkpt lat="48.2" lon="7.7"><time>2000-01-01T00:00:00Z</time></trkpt><trkpt lat="48.21" lon="7.71"/></trkseg><trkseg><trkpt lat="48.3" lon="7.8"/><trkpt lat="48.31" lon="7.81"/></trkseg></trk></gpx>';
 const parsed=parseTrackGpx(xml,{parserFactory:sax.parser}),input=remoteGpxInput(parsed),r=normalizeRemoteGpx(input,'id','owner');
 assert.equal(r.name,'Test & GPX');assert.equal(r.geometry.points[2].breakBefore,true);assert.doesNotMatch(JSON.stringify(r),/2000-01|distanceM|elapsedMs/);
 assert.throws(()=>parseTrackGpx('<!DOCTYPE gpx><gpx/>',{parserFactory:sax.parser}));assert.throws(()=>parseTrackGpx('<gpx><trk></gpx>',{parserFactory:sax.parser}));
});
