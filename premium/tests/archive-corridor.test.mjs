import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sharedSessionDossier,SessionDossierScreen} from '../src/session-dossier.mjs';
import {SharedCoachingDebrief} from '../src/coaching-shared-debrief.mjs';
const at=Date.parse('2026-11-12T12:00:00Z');
const pose={sessionId:'archive-qa',provenance:'device-geolocation',phase:'finished',elapsedMs:60000,distanceM:130,segments:[[{latitude:48,longitude:7,timestamp:at-60000,accuracy:5},{latitude:48.001,longitude:7.001,timestamp:at,accuracy:5}]]};
const weather={source:'Open-Meteo',provenance:'estimated',observedAt:at,capturedAt:at,fetchedAt:at,wind_speed_kmh:9,wind_direction_deg:270};
const session={id:'archive-qa',phase:'ARCHIVED',mode:'normal',role:'traceur',dog:'QA',pose,search:{...pose,segments:pose.segments.map(s=>s.map(p=>({...p,longitude:p.longitude+.001})))},searchActiveMs:60000,weatherHistory:[{kind:'pose',weather}],team:[],notes:[],events:[]};
const render=p=>SessionDossierScreen(sharedSessionDossier(p),{tab:'map'});
test('archive map carries the historical pose corridor and same eligibility as the debrief',()=>{
 const before=structuredClone(session),html=render(session),debrief=SharedCoachingDebrief(session,{tab:'map'});
 for(const h of [html,debrief]){assert.match(h,/data-gps-corridor-review="true"/);assert.match(h,/data-gps-corridor-basis="coaching-pose"/);assert.match(h,/data-gps-corridor-history=/);assert.match(h,/data-corridor-toggle(?![^>]*disabled)/);assert.match(h,/Couloir historique estimé/);}
 assert.match(html,/data-gps-kind="search"/);assert.match(html,/data-gps-reference=/);assert.doesNotMatch(html,/data-corridor-form|data-corridor-auto/);assert.deepEqual(session,before);
});
test('missing, incomplete and stale archived wind have an explicit disabled control',()=>{
 for(const weatherHistory of [[],[{kind:'pose',weather:{...weather,wind_direction_deg:undefined}}],[{kind:'pose',weather:{...weather,observedAt:at-86400000}}]]){
  const html=render({...session,weatherHistory});assert.match(html,/data-corridor-toggle[^>]*disabled/);assert.match(html,/Météo historique indisponible/);assert.match(html,/données.*séance|vent.*pose/i);
 }
});
test('archive preserves blind restrictions and never falls back to search or prepared geometry for the corridor',()=>{
 for(const patch of [{mode:'simple_blind',role:'driver'},{mode:'simple_blind',role:'observer'},{mode:'full_blind',role:'traceur'},{pose:null},{pose:{...pose,provenance:'mock'}}])assert.doesNotMatch(render({...session,...patch}),/data-gps-corridor-allowed="true"|data-corridor-toggle/);
 for(const role of ['traceur','coach'])assert.match(render({...session,mode:'simple_blind',role}),/data-gps-corridor-review="true"/);
 const onlyPose=render({...session,search:null});assert.match(onlyPose,/data-gps-kind="pose"/);assert.match(onlyPose,/data-gps-corridor-review="true"/);
});
test('partial dossiers remain without terrain or historical corridor',()=>{
 assert.doesNotMatch(render({...session,phase:'INTERRUPTED'}),/data-gps-corridor-history|data-corridor-toggle/);
});
