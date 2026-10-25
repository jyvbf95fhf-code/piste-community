import {test} from 'node:test';import assert from 'node:assert/strict';
import {createGpsPose} from '../src/coaching-gps-model.mjs';
const api=await import('../src/coaching-shared-debrief.mjs').catch(()=>({}));
const gps=(actor)=>({...createGpsPose('s',actor),phase:'finished',startedAt:100000,endedAt:160000,elapsedMs:60000,distanceM:125,segments:[[{latitude:actor==='t'?48.123987:48.223987,longitude:7,accuracy:5},{latitude:actor==='t'?48.124987:48.224987,longitude:7,accuracy:5}]]});
const p={id:'s',version:4,phase:'DEBRIEF',role:'driver',mode:'normal',dog:'Nox',traceType:'direct',pose:gps('t'),search:gps('d'),searchActiveMs:45000,team:[{id:'u',name:'Sébastien',role:'driver'}],notes:[],events:[],archivePermission:{canArchive:true},ownerId:'u'};
test('shared debrief restores the four canonical Premium tabs and actual metrics',()=>{assert.equal(typeof api.SharedCoachingDebrief,'function');const html=api.SharedCoachingDebrief(p);for(const tab of ['summary','map','science','observations'])assert.match(html,new RegExp('data-shared-debrief-tab="'+tab+'"'));assert.match(html,/Synthèse de session/);assert.match(html,/0,13 km/);assert.match(html,/00:00:45/);assert.doesNotMatch(html,/mock|démonstration|Conservation locale/i);});
test('map tab contains a single read-only map and both authorized GPS tracks',()=>{const html=api.SharedCoachingDebrief(p,{tab:'map'});assert.equal((html.match(/data-gps-map /g)||[]).length,1);assert.match(html,/data-real-map-reader/);assert.match(html,/data-gps-reference=/);assert.doesNotMatch(html,/data-gps-live/);});
test('observations keep shared note revision and archive permissions; archive freezes editing',()=>{const html=api.SharedCoachingDebrief({...p,notes:[{authorParticipantId:'u',authorName:'Sébastien',text:'Bien',revision:3}]},{tab:'observations',profile:{id:'u'},drafts:{note:'Brouillon',noteRevision:2}});assert.match(html,/data-remote-form="note"/);assert.match(html,/name="expectedRevision"[^>]*value="2"/);assert.match(html,/Brouillon/);assert.match(html,/data-remote="archive"/);const closed=api.SharedCoachingDebrief({...p,phase:'ARCHIVED'},{tab:'observations'});assert.doesNotMatch(closed,/data-remote-form="note"|data-remote="archive"/);});
test('missing external pose and unknown time fields remain unavailable',()=>{const html=api.SharedCoachingDebrief({...p,pose:null,poseStatus:'unavailable'},{tab:'science'});assert.match(html,/Indisponible/);assert.doesNotMatch(html,/mock|démonstration/i);});

const mapPayload=(html,attribute)=>JSON.parse(html.match(new RegExp(attribute+'="([^"\\n]+)"'))[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
test('shared map serializes authorized device routes with provenance and keeps missing pose confidential',()=>{
 const html=api.SharedCoachingDebrief(p,{tab:'map'}),pose=mapPayload(html,'data-gps-reference'),search=mapPayload(html,'data-gps-pose');
 assert.equal(pose.provenance,'device-geolocation');assert.equal(search.provenance,'device-geolocation');
 assert.deepEqual(pose.segments,p.pose.segments);assert.deepEqual(search.segments,p.search.segments);
 assert.equal(pose.showStart,true);assert.equal(pose.showArrival,true);
 const masked=api.SharedCoachingDebrief({...p,mode:'full_blind',pose:null,poseStatus:'unavailable'},{tab:'map'});
 assert.match(masked,/48.223987/);assert.doesNotMatch(masked,/48.123987|48.124987|data-gps-reference=|data-gps-corridor-allowed="true"/);
 assert.match(masked,/Tracé de pose indisponible/);
});
test('a declared shared route without device provenance cannot be drawn as recorded geography',()=>{
 const pose={...p.pose,provenance:'mock'},search={...p.search,provenance:'mock'};
 const html=api.SharedCoachingDebrief({...p,mode:'full_blind',pose,search},{tab:'map'});
 assert.match(html,/Fond de carte de contexte uniquement/);assert.doesNotMatch(html,/48.123987|48.223987|data-gps-reference=/);
});
